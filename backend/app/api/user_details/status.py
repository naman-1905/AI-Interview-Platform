"""
Status API for polling user queue state.
"""

import os

import firebase_admin
from fastapi import APIRouter, HTTPException
from firebase_admin import credentials, firestore as fb_firestore
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/status", tags=["status"])


class StatusResponse(BaseModel):
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


@router.get("/{user_id}", response_model=StatusResponse)
async def get_status(user_id: str):
    """Fetch status and queue number for a user by ID."""
    logger.info(f"Status requested for user_id={user_id}")
    db = get_firestore_client()

    # Check in_session first, then queue, then user
    data = None
    in_session_doc = db.collection("in_session").document(user_id).get()
    if in_session_doc.exists:
        data = in_session_doc.to_dict() or {}
    else:
        queue_doc = db.collection("queue").document(user_id).get()
        if queue_doc.exists:
            data = queue_doc.to_dict() or {}

    if data is None:
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        data = user_doc.to_dict() or {}

    status = data.get("status")
    if status is None:
        raise HTTPException(status_code=500, detail="Status information incomplete")

    # Derive queue number dynamically (1-based) using created_at ordering
    queue_number = 0
    if status == "pending":
        queue_docs = list(db.collection("queue").order_by("created_at").stream())
        for idx, doc in enumerate(queue_docs, start=1):
            if doc.get("user_id") == user_id or doc.id == user_id:
                queue_number = idx
                break

    return StatusResponse(user_id=user_id, status=status, queue_number=int(queue_number))
