"""
User details API for creating users, uploading resumes to GCS,
and queuing them in Firestore.
"""

import os
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
) -> Tuple[str, int]:
    """
    Determine queue status/number based on global_stats/queue document.

    Rules:
      - If session in {0,1,2} => status=ready, queue_number=0
      - If session == 3 => status=pending, queue_number=waiting + 1 (waiting defaults to 0)
    """
    global_ref = db.collection("global_stats").document("queue")
    snapshot = global_ref.get(transaction=transaction)
    data = snapshot.to_dict() or {}

    session_value = int(data.get("session", 0) or 0)
    waiting = int(data.get("waiting", 0) or 0)

    if session_value == 3:
        status = "pending"
        queue_number = waiting + 1
    else:
        status = "ready"
        queue_number = 0

    # Ensure the global_stats doc is updated/created with the latest waiting count
    update_data = {"session": session_value}
    update_data["waiting"] = queue_number if status == "pending" else max(waiting, 0)

    transaction.set(global_ref, update_data, merge=True)
    return status, queue_number


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
    def _write_user(txn: firestore.Transaction) -> Tuple[str, int]:
        status, queue_number = _queue_status_from_global_stats(db, txn)

        user_ref = db.collection("users").document(user_id)
        queue_ref = db.collection("queue").document(user_id)

        user_doc = build_user_document(base_payload, status, queue_number)
        queue_doc = {
            "user_id": user_id,
            "status": status,
            "queue_number": queue_number,
        }

        txn.set(
            user_ref,
            {**user_doc, "created_at": fb_firestore.SERVER_TIMESTAMP},
            merge=True,
        )
        txn.set(
            queue_ref,
            {**queue_doc, "created_at": fb_firestore.SERVER_TIMESTAMP},
            merge=True,
        )

        return status, queue_number

    try:
        status, queue_number = _write_user(transaction)
    except Exception as exc:
        logger.error(f"Failed to create user {user_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to persist user data") from exc

    message = "User created and ready" if status == "ready" else "User queued"
    return UserCreateResponse(
        user_id=user_id,
        status=status,
        queue_number=queue_number,
        resume_path=resume_path,
        message=message,
    )
