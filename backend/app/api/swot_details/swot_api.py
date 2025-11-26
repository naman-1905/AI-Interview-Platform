from typing import Dict

import os
import firebase_admin
from fastapi import APIRouter, HTTPException
from firebase_admin import credentials, firestore as fb_firestore

from app.utils.logger import get_logger
from app.api.swot_details.logic import build_swot_payload

logger = get_logger(__name__)
router = APIRouter(prefix="/swot", tags=["swot"])


def get_firestore_client() -> fb_firestore.Client:
    """Return a Firestore client using the shared credential configuration."""
    cred_path = os.getenv("FIRESTORE_APPLICATION_CREDENTIALS") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        raise HTTPException(status_code=500, detail="Firestore credentials are not configured")

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    return fb_firestore.client()


@router.get("/{user_id}", response_model=Dict)
async def get_swot(user_id: str):
    """
    Retrieve SWOT analysis stored on the user document.
    """
    db = get_firestore_client()
    doc_ref = db.collection("users").document(user_id)
    snapshot = doc_ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="User not found")

    swot_data = snapshot.to_dict().get("swot_analysis")
    if not swot_data:
        raise HTTPException(status_code=404, detail="SWOT analysis not yet generated")

    logger.info(f"Returning SWOT for user {user_id}")
    return build_swot_payload(user_id, swot_data)
