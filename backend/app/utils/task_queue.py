"""
Cloud Tasks helper for enqueueing users into the interview queue.
"""

import json
import os

from google.cloud import tasks_v2
from google.cloud.tasks_v2.types import HttpMethod
from app.utils.logger import get_logger

logger = get_logger(__name__)


def enqueue_user_for_join(user_id: str) -> None:
    project = os.getenv("TASKS_PROJECT")
    location = os.getenv("TASKS_LOCATION")
    queue = os.getenv("TASKS_QUEUE", "interview-queue")
    join_url = os.getenv("TASKS_JOIN_URL")

    if not (project and location and join_url):
        logger.warning("Cloud Tasks configuration missing; skipping enqueue.")
        return

    client = tasks_v2.CloudTasksClient()
    parent = client.queue_path(project, location, queue)

    payload = json.dumps({"user_id": user_id}).encode("utf-8")

    task = {
        "http_request": {
            "http_method": HttpMethod.POST,
            "url": join_url,
            "headers": {"Content-Type": "application/json"},
            "body": payload,
        }
    }

    created = client.create_task(parent=parent, task=task)
    logger.info(f"Enqueued Cloud Task {created.name} for user {user_id}")
