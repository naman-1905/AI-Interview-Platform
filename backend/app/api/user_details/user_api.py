"""
User details API for creating users, uploading resumes to GCS,
queuing them in Firestore, and managing session lifecycle.
"""

import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional, List

import firebase_admin
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from firebase_admin import credentials, firestore as fb_firestore
from google.cloud import firestore
from pydantic import BaseModel, EmailStr

from app.api.user_details.details import build_user_document, generate_user_id
from app.api.user_details.resume import upload_resume_to_gcs
from app.utils.logger import get_logger
from app.utils.task_queue import enqueue_user_for_join

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["users"])

SESSION_LIMIT = 3
SESSION_DURATION_MINUTES = 5
CLEANUP_INTERVAL_SECONDS = 60

class UserCreateResponse(BaseModel):
    user_id: str
    status: str
    queue_number: int
    resume_path: Optional[str] = None
    message: str


class JoinRequest(BaseModel):
    user_id: str


class JoinResponse(BaseModel):
    user_id: str
    status: str
    queue_number: int


def get_firestore_client() -> fb_firestore.Client:
    """Initialize and return a Firestore client."""
    cred_path = os.getenv("FIRESTORE_APPLICATION_CREDENTIALS") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        raise HTTPException(status_code=500, detail="FIRESTORE_APPLICATION_CREDENTIALS is not set")

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    return fb_firestore.client()


def _compute_queue_position(db: fb_firestore.Client, user_id: str) -> int:
    """
    Compute queue position (1-based) based on created_at ordering.
    """
    queue_coll = db.collection("queue")
    docs: List[fb_firestore.DocumentSnapshot] = list(
        queue_coll.order_by("created_at").stream()
    )
    for idx, doc in enumerate(docs, start=1):
        if doc.get("user_id") == user_id or doc.id == user_id:
            return idx
    return 0


def promote_next_user(db: fb_firestore.Client):
    """
    Promote the oldest queued user into in_session (non-transactional).
    """
    queue_docs = list(
        db.collection("queue").order_by("created_at").limit(1).stream()
    )
    if not queue_docs:
        return

    oldest = queue_docs[0]
    queued_user_id = oldest.to_dict().get("user_id") or oldest.id
    oldest.reference.delete()

    now = datetime.utcnow()
    db.collection("in_session").document(queued_user_id).set(
        {
            "user_id": queued_user_id,
            "start_time": now,
            "expiry_time": now + timedelta(minutes=SESSION_DURATION_MINUTES),
            "status": "in_session",
            "created_at": now,
        }
    )
    db.collection("users").document(queued_user_id).set(
        {"status": "in_session", "updated_at": now}, merge=True
    )


def cleanup_expired_sessions(db: fb_firestore.Client):
    """
    Remove expired sessions and promote queued users (non-transactional).
    """
    now = datetime.utcnow()
    expired = list(
        db.collection("in_session")
        .where("expiry_time", "<", now)
        .limit(20)
        .stream()
    )
    for session in expired:
        user_id = session.to_dict().get("user_id") or session.id
        session.reference.delete()
        db.collection("users").document(user_id).set({"status": "idle"}, merge=True)
        promote_next_user(db)


@firestore.transactional
def _join_transaction(
    txn: firestore.Transaction,
    db: fb_firestore.Client,
    user_id: str,
) -> str:
    """
    Atomic join: place user in in_session if space < SESSION_LIMIT else into queue.
    Also writes/updates the user document with status.
    Returns status.
    """
    now = datetime.utcnow()

    user_ref = db.collection("users").document(user_id)
    existing_user = user_ref.get(transaction=txn)
    if not existing_user.exists:
        raise RuntimeError("User document not found")

    existing_status = existing_user.to_dict().get("status")
    if existing_status in ("in_session", "pending"):
        return existing_status

    # Count in_session inside transaction (limit to SESSION_LIMIT+1 for efficiency)
    in_session_ref = db.collection("in_session")
    in_session_docs = list(in_session_ref.limit(SESSION_LIMIT + 1).stream(transaction=txn))

    if len(in_session_docs) < SESSION_LIMIT:
        status = "in_session"
        session_ref = in_session_ref.document(user_id)
        txn.set(
            session_ref,
            {
                "user_id": user_id,
                "start_time": now,
                "expiry_time": now + timedelta(minutes=SESSION_DURATION_MINUTES),
                "status": "in_session",
                "created_at": now,
            },
            merge=True,
        )
    else:
        status = "pending"
        queue_ref = db.collection("queue").document(user_id)
        txn.set(
            queue_ref,
            {
                "user_id": user_id,
                "created_at": fb_firestore.SERVER_TIMESTAMP,
                "status": "pending",
            },
            merge=True,
        )

    txn.set(
        user_ref,
        {"status": status, "updated_at": now},
        merge=True,
    )

    return status


@firestore.transactional
def _exit_and_promote(txn: firestore.Transaction, db: fb_firestore.Client, user_id: str) -> Optional[str]:
    """
    Remove user from in_session, promote oldest queued user if present.
    Returns promoted user_id (or None).
    """
    queue_query = db.collection("queue").order_by("created_at").limit(1)
    queue_docs = list(queue_query.stream(transaction=txn))
    if not queue_docs:
        session_ref = db.collection("in_session").document(user_id)
        txn.delete(session_ref)
        txn.set(
            db.collection("users").document(user_id), {"status": "idle"}, merge=True
        )
        return None

    oldest = queue_docs[0]
    queued_user_id = oldest.to_dict().get("user_id") or oldest.id

    session_ref = db.collection("in_session").document(user_id)
    txn.delete(session_ref)

    # Delete from queue
    txn.delete(oldest.reference)

    # Move to in_session
    now = datetime.utcnow()
    session_ref_new = db.collection("in_session").document(queued_user_id)
    txn.set(
        session_ref_new,
        {
            "user_id": queued_user_id,
            "start_time": now,
            "expiry_time": now + timedelta(minutes=SESSION_DURATION_MINUTES),
            "status": "in_session",
            "created_at": now,
        },
        merge=True,
    )

    # Update statuses
    txn.set(db.collection("users").document(user_id), {"status": "idle"}, merge=True)
    txn.set(db.collection("users").document(queued_user_id), {"status": "in_session"}, merge=True)

    return queued_user_id


async def _cleanup_expired_sessions():
    """
    Background task: remove expired sessions and promote next queued users.
    """
    db = get_firestore_client()
    while True:
        try:
            cleanup_expired_sessions(db)
        except Exception as exc:
            logger.error(f"Cleanup task error: {exc}")

        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)


_cleanup_task: Optional[asyncio.Task] = None


async def start_cleanup_task():
    """Start the background cleanup task once."""
    global _cleanup_task
    if _cleanup_task and not _cleanup_task.done():
        return
    loop = asyncio.get_running_loop()
    _cleanup_task = loop.create_task(_cleanup_expired_sessions())


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

    now = datetime.utcnow()
    try:
        user_doc = build_user_document(base_payload)
        db.collection("users").document(user_id).set(
            {**user_doc, "status": "idle", "created_at": now},
            merge=True,
        )
        enqueue_user_for_join(user_id)
        message = "User created and enqueued for join"
    except Exception as exc:
        logger.error(f"Failed to create user {user_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to persist user data") from exc

    return UserCreateResponse(
        user_id=user_id,
        status="idle",
        queue_number=0,
        resume_path=resume_path,
        message=message,
    )


@router.post("/{user_id}/exit", response_model=dict)
async def exit_session(user_id: str):
    """
    Mark user as exited from session and promote the next queued user (if any).
    """
    db = get_firestore_client()
    try:
        transaction = db.transaction()
        promoted = _exit_and_promote(transaction, db, user_id)
    except Exception as exc:
        logger.error(f"Failed to exit/promote for user {user_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to exit session") from exc

    return {"exited": user_id, "promoted": promoted}


@router.post("/join", response_model=JoinResponse)
async def join_user(payload: JoinRequest):
    """
    Cloud Tasks / API entrypoint for actually joining the queue/session.
    """
    db = get_firestore_client()
    try:
        transaction = db.transaction()
        status = _join_transaction(transaction, db, payload.user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"Failed to join user {payload.user_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to join queue/session") from exc

    queue_number = 0
    if status == "pending":
        queue_number = _compute_queue_position(db, payload.user_id)

    return JoinResponse(user_id=payload.user_id, status=status, queue_number=queue_number)
