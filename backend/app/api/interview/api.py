"""
Interview bot API.

Exposes two endpoints:
  * /interview/start   - begins a fresh interview when no history exists
  * /interview/respond - continues the interview with the user's answer
"""

import os
from datetime import datetime
from typing import List, Optional

import firebase_admin
from fastapi import APIRouter, HTTPException
from firebase_admin import credentials, firestore as fb_firestore
from google.cloud import firestore
from pydantic import BaseModel

from app.api.interview.bot_response import parse_bot_response
from app.api.interview.prompt import (
    build_followup_prompt,
    build_initial_prompt,
    build_swot_prompt,
    history_to_text,
    parse_swot_response,
)
from app.utils.gemini_wrapper import get_gemini_response
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/interview", tags=["interview"])


class InterviewInitRequest(BaseModel):
    user_id: str


class InterviewAnswerRequest(BaseModel):
    user_id: str
    user_response: str


class InterviewResponse(BaseModel):
    user_id: str
    status: str
    queue_number: int
    bot_response: str
    next_question: str
    time_remaining: int


def get_firestore_client() -> fb_firestore.Client:
    """Initialize Firestore client (reuse same credentials as other modules)."""
    cred_path = os.getenv("FIRESTORE_APPLICATION_CREDENTIALS") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        raise HTTPException(status_code=500, detail="Firestore credentials are not configured")

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    return fb_firestore.client()


def compute_time_remaining(session_doc: fb_firestore.DocumentSnapshot) -> int:
    """Return positive remaining seconds for an in_session document."""
    expiry = session_doc.get("expiry_time")
    if not expiry:
        return 0
    if hasattr(expiry, "tzinfo") and expiry.tzinfo:
        expiry = expiry.replace(tzinfo=None)
    delta = expiry - datetime.utcnow()
    return max(int(delta.total_seconds()), 0)


def compute_queue_position(db: fb_firestore.Client, user_id: str) -> int:
    """Return 1-based position of user in the queue."""
    queue_docs = list(db.collection("queue").order_by("created_at").stream())
    for idx, doc in enumerate(queue_docs, start=1):
        if doc.get("user_id") == user_id or doc.id == user_id:
            return idx
    return 0


def ensure_swot_analysis(db: fb_firestore.Client, user_id: str, resume_text: str, history: List[dict]) -> None:
    """Create SWOT once and store it in the users document."""
    user_ref = db.collection("users").document(user_id)
    snapshot = user_ref.get()
    if snapshot.exists and snapshot.to_dict().get("swot_analysis"):
        return

    history_block = history_to_text(history)
    swot_prompt = build_swot_prompt(resume_text, history_block)
    swot_text = get_gemini_response(swot_prompt)
    swot_payload = parse_swot_response(swot_text)
    user_ref.set({"swot_analysis": swot_payload}, merge=True)


def finalize_session(db: fb_firestore.Client, user_id: str, user_doc: dict) -> InterviewResponse:
    """End the interview politely, compute SWOT, and mark session as over."""
    session_ref = db.collection("in_session").document(user_id)
    session_ref.delete()
    history = user_doc.get("interview_history", []) or []
    ensure_swot_analysis(db, user_id, user_doc.get("resume_text", ""), history)
    db.collection("users").document(user_id).set(
        {
            "status": "session_over",
            "session_status": "session_over",
            "time_remaining": 0,
        },
        merge=True,
    )
    final_text = (
        "Thank you for your time. The interview session has concluded, "
        "and we wish you the very best in your journey. "
        "Status: session over."
    )
    return InterviewResponse(
        user_id=user_id,
        status="session_over",
        queue_number=0,
        bot_response=final_text,
        next_question="",
        time_remaining=0,
    )


def build_user_history_entry(role: str, message: str, question: Optional[str] = None) -> dict:
    """Helper to create history entries."""
    entry = {
        "role": role,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if question:
        entry["question"] = question
    return entry


@router.post("/start", response_model=InterviewResponse)
async def start_interview(request: InterviewInitRequest):
    db = get_firestore_client()
    logger.info(f"Starting interview session for user {request.user_id}")
    user_ref = db.collection("users").document(request.user_id)
    snapshot = user_ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="User not found")
    user_doc = snapshot.to_dict() or {}
    history = user_doc.get("interview_history", []) or []
    if history:
        raise HTTPException(status_code=400, detail="Interview already started; please use /interview/respond.")
    status = user_doc.get("status", "idle")
    if status == "idle":
        return InterviewResponse(
            user_id=request.user_id,
            status="idle",
            queue_number=0,
            bot_response=(
                "Your interview session has not started yet. "
                "Please wait patiently while we schedule you."
            ),
            next_question="",
            time_remaining=0,
        )
    if status == "pending":
        queue_number = compute_queue_position(db, request.user_id)
        return InterviewResponse(
            user_id=request.user_id,
            status="queue",
            queue_number=queue_number,
            bot_response=(
                "You are currently waiting in the queue. "
                f"Your position is {queue_number}. We will start once a slot becomes available."
            ),
            next_question="",
            time_remaining=0,
        )
    if status != "in_session":
        raise HTTPException(status_code=400, detail="User is not in an active in_session state.")

    session_doc = db.collection("in_session").document(request.user_id).get()
    if not session_doc.exists:
        return finalize_session(db, request.user_id, user_doc)

    time_remaining = compute_time_remaining(session_doc)
    if time_remaining <= 0:
        return finalize_session(db, request.user_id, user_doc)

    prompt_text = build_initial_prompt(user_doc.get("resume_text", ""))
    model_output = get_gemini_response(prompt_text)
    bot_response, next_question = parse_bot_response(model_output)
    history.append(
        build_user_history_entry("bot", bot_response, question=next_question)
    )
    user_ref.set(
        {
            "interview_history": history,
            "last_bot_response": bot_response,
            "next_question": next_question,
            "time_remaining": time_remaining,
        },
        merge=True,
    )

    return InterviewResponse(
        user_id=request.user_id,
        status="in_session",
        queue_number=0,
        bot_response=bot_response,
        next_question=next_question,
        time_remaining=time_remaining,
    )


@router.post("/respond", response_model=InterviewResponse)
async def respond_to_interview(request: InterviewAnswerRequest):
    db = get_firestore_client()
    logger.info(f"Continuing interview for user {request.user_id}")
    user_ref = db.collection("users").document(request.user_id)
    snapshot = user_ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="User not found")
    user_doc = snapshot.to_dict() or {}
    status = user_doc.get("status", "idle")
    if status == "idle":
        return InterviewResponse(
            user_id=request.user_id,
            status="idle",
            queue_number=0,
            bot_response="Your interview session has not started yet. Please wait while we prepare everything.",
            next_question="",
            time_remaining=0,
        )
    if status == "pending":
        queue_number = compute_queue_position(db, request.user_id)
        return InterviewResponse(
            user_id=request.user_id,
            status="queue",
            queue_number=queue_number,
            bot_response=(
                "You are still waiting in the queue. "
                f"Current position: {queue_number}. Once a slot opens we will resume."
            ),
            next_question="",
            time_remaining=0,
        )
    if status != "in_session":
        return finalize_session(db, request.user_id, user_doc)

    session_doc = db.collection("in_session").document(request.user_id).get()
    if not session_doc.exists or compute_time_remaining(session_doc) <= 0:
        return finalize_session(db, request.user_id, user_doc)

    history = user_doc.get("interview_history", []) or []
    history_text = history_to_text(history)
    prompt_text = build_followup_prompt(
        user_doc.get("resume_text", ""), history_text, request.user_response
    )
    model_output = get_gemini_response(prompt_text)
    bot_response, next_question = parse_bot_response(model_output)

    history.append(build_user_history_entry("user", request.user_response))
    history.append(build_user_history_entry("bot", bot_response, question=next_question))
    time_remaining = compute_time_remaining(session_doc)
    status = user_doc.get("status", "in_session")
    queue_number = 0
    if status == "pending":
        queue_number = compute_queue_position(db, request.user_id)

    user_ref.set(
        {
            "interview_history": history,
            "last_bot_response": bot_response,
            "next_question": next_question,
            "time_remaining": time_remaining,
        },
        merge=True,
    )

    return InterviewResponse(
        user_id=request.user_id,
        status=status,
        queue_number=queue_number,
        bot_response=bot_response,
        next_question=next_question,
        time_remaining=time_remaining,
    )
