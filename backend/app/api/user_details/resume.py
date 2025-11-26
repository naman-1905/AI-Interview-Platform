"""
Resume upload helper for user details flow.

Uses the shared storage_connection utility to upload resumes to GCS.
"""

import os
import tempfile
from io import BytesIO
from typing import Optional, Dict, Tuple

from fastapi import UploadFile
from PyPDF2 import PdfReader
from docx import Document

from app.utils.storage_connection import upload_resume
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _extract_from_pdf(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))
    text = []
    for page in reader.pages:
        try:
            text.append(page.extract_text() or "")
        except Exception as exc:
            logger.warning(f"Failed to extract text from a PDF page: {exc}")
    return "\n".join(filter(None, text))


def _extract_from_docx(content: bytes) -> str:
    doc = Document(BytesIO(content))
    return "\n".join([p.text for p in doc.paragraphs if p.text])


def extract_resume_text(filename: str, content: bytes) -> str:
    """
    Extract textual content from common resume formats (pdf, docx, txt).
    Falls back to best-effort utf-8 decode.
    """
    MAX_LEN = 10000  # avoid oversized payloads in Firestore
    name = filename or ""
    lower = name.lower()
    try:
        if lower.endswith(".pdf"):
            text = _extract_from_pdf(content)
        if lower.endswith(".docx"):
            text = _extract_from_docx(content)
        # txt or other: try decode
        text = content.decode("utf-8", errors="ignore")
    except Exception as exc:
        logger.warning(f"Failed to extract resume text for {filename}: {exc}")
        return ""

    return text[:MAX_LEN]


async def upload_resume_to_gcs(upload: Optional[UploadFile]) -> Optional[Dict[str, str]]:
    """
    Upload the provided resume file to GCS and return upload metadata + extracted text.

    Returns dict: file_name, gcs_path, bucket, resume_text
    """
    if upload is None:
        logger.info("No resume file supplied; skipping upload.")
        return None

    content = await upload.read()
    extracted_text = extract_resume_text(upload.filename or "", content)

    # Preserve extension if present so downstream consumers see expected formats.
    _, ext = os.path.splitext(upload.filename or "")
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        logger.info("Uploading resume to GCS...")
        info = upload_resume(tmp_path)
        info["resume_text"] = extracted_text
        logger.info(f"Resume uploaded to {info.get('gcs_path')} in bucket {info.get('bucket')}")
        return info
    finally:
        try:
            os.remove(tmp_path)
        except FileNotFoundError:
            pass
