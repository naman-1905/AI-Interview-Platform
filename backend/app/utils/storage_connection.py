import os
import uuid
from google.cloud import storage


def upload_resume(file_path: str) -> dict:
    """
    Uploads file to GCS using env configuration and returns unique info.

    ENV required:
      GCS_BUCKET_NAME
      GCS_RESUME_FOLDER (optional, default="resume")
      GOOGLE_APPLICATION_CREDENTIALS (optional, if local)

    Returns:
      {
        "file_name": unique file name,
        "gcs_path": folder + filename,
        "bucket": bucket name
      }
    """

    bucket_name = os.getenv("GCS_BUCKET_NAME")
    folder = os.getenv("GCS_RESUME_FOLDER", "resume")

    if not bucket_name:
        raise ValueError("GCS_BUCKET_NAME is not set")

    ext = file_path.split(".")[-1]

    unique_name = f"{uuid.uuid4()}.{ext}"

    gcs_path = f"{folder}/{unique_name}"

    client = storage.Client()

    bucket = client.bucket(bucket_name)
    blob = bucket.blob(gcs_path)

    blob.upload_from_filename(file_path)

    return {
        "file_name": unique_name,
        "gcs_path": gcs_path,
        "bucket": bucket_name
    }
