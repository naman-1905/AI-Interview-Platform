"""
User details API for creating users, uploading resumes to GCS,
and queuing them in Firestore.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Tuple

import firebase_admin
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from firebase_admin import credentials, firestore as fb_firestore
from google.cloud import firestore
from pydantic import BaseModel, EmailStr

from app.api.user_details.details import build_user_document, generate_user_id
from app.api.user_details.resume import upload_resume_to_gcs
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


class UserCreateResponse(BaseModel):
    user_id: str
    status: str
    queue_number: int
    resume_path: Optional[str] = None
    message: str


def get_firestore_client() -> fb_firestore.Client:
    """Initialize and return a Firestore client."""
    cred_path = os.getenv("FIRESTORE_APPLICATION_CREDENTIALS")
    if not cred_path:
        raise HTTPException(status_code=500, detail="FIRESTORE_APPLICATION_CREDENTIALS is not set")

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    return fb_firestore.client()


def _queue_status_from_global_stats(
    db: fb_firestore.Client, transaction: firestore.Transaction
) -> Tuple[str, int, str]:
    """
    Determine placement based on live counts (no global_stats dependency).

    Rules:
      - If in_session has fewer than 3 docs, place user in in_session with queue_number 0.
      - Else place user in queue with queue_number based on creation order (len(queue)+1).
    Returns: (status, queue_number, target_collection)
    """
    in_session_coll = db.collection("in_session")
    queue_coll = db.collection("queue")

    in_session_docs = list(in_session_coll.stream(transaction=transaction))
    if len(in_session_docs) < 3:
        return "in_session", 0, "in_session"

    queue_docs = list(queue_coll.order_by("created_at").stream(transaction=transaction))
    queue_number = len(queue_docs) + 1
    return "pending", queue_number, "queue"


@router.post("/", response_model=UserCreateResponse)
async def create_user(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: EmailStr = Form(...),
    phone: str = Form(...),
    resume: Optional[UploadFile] = File(None),
):
    """
    Create a user record, upload resume to GCS, and enqueue user in Firestore.
    """
    logger.info("Received user creation request")

    # Upload resume if provided
    resume_info = await upload_resume_to_gcs(resume)
    resume_path = resume_info.get("gcs_path") if resume_info else None
    resume_bucket = resume_info.get("bucket") if resume_info else None
    resume_text = resume_info.get("resume_text") if resume_info else None

    user_id = generate_user_id()
    db = get_firestore_client()

    base_payload = {
        "user_id": user_id,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "resume_path": resume_path,
        "resume_bucket": resume_bucket,
        "resume_text": resume_text,
    }

    transaction = db.transaction()

    @firestore.transactional
    def _write_user(txn: firestore.Transaction) -> Tuple[str, int, str]:
        status, queue_number, target_collection = _queue_status_from_global_stats(db, txn)

        user_ref = db.collection("users").document(user_id)
        user_doc = build_user_document(base_payload)

        txn.set(
            user_ref,
            {**user_doc, "created_at": fb_firestore.SERVER_TIMESTAMP},
            merge=True,
        )

        # Place user either in in_session or queue collection
        target_ref = db.collection(target_collection).document(user_id)
        target_payload = {
            "user_id": user_id,
            "status": status,
            "queue_number": queue_number,
            "created_at": fb_firestore.SERVER_TIMESTAMP,
        }

        if status == "in_session":
            now = datetime.utcnow()
            target_payload["start_time"] = now
            target_payload["expiry_time"] = now + timedelta(minutes=5)

        txn.set(target_ref, target_payload, merge=True)

        return status, queue_number, target_collection

    try:
        status, queue_number, target_collection = _write_user(transaction)
    except Exception as exc:
        logger.error(f"Failed to create user {user_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to persist user data") from exc

    if status == "in_session":
        message = "User added to in_session"
    else:
        message = "User queued"
    return UserCreateResponse(
        user_id=user_id,
        status=status,
        queue_number=queue_number,
        resume_path=resume_path,
        message=message,
    )
