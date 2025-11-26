"""
User detail models and helpers for Firestore payload creation.
"""

import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


def generate_user_id() -> str:
    """Create a random user id for Firestore documents."""
    return uuid.uuid4().hex


class UserDetails(BaseModel):
    user_id: str = Field(..., description="Unique user identifier")
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    resume_path: Optional[str] = Field(None, description="GCS path of uploaded resume")
    resume_bucket: Optional[str] = None
    resume_text: Optional[str] = Field(None, description="Extracted text content of resume")


def build_user_document(data: dict) -> dict:
    """
    Build Firestore document for a user.

    Args:
        data: dict containing user_id, names, email, phone, resume metadata
    """
    return {
        "user_id": data["user_id"],
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "email": data["email"],
        "phone": data["phone"],
        "resume_path": data.get("resume_path"),
        "resume_bucket": data.get("resume_bucket"),
        "resume_text": data.get("resume_text"),
    }
