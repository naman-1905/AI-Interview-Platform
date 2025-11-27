# AI Interview Platform Backend Architecture

This document explains the backend architecture and operational flow for the AI Interview Platform. The backend primarily serves two responsibilities:

1. Provide Docker-based services for the interview API, credential handling, and Cloud Run deployment.
2. Run the interview queue/session lifecycle and orchestrate the Gemini-powered conversational bot.

---

## Key Components

1. **FastAPI Application** (`backend/app/main.py`)
   * Registers routers for health checks (`/health`), user onboarding (`/users`), status polling (`/status`), SWOT retrieval (`/swot`), and the interview bot (`/interview`).
   * Starts a background task that cleans up expired `in_session` documents every minute.
   * Logs are routed via `app/utils/logger.py`, which centralizes the formatter.

2. **User Handling Stack**
   * `backend/app/api/user_details/user_api.py` handles profile creation, queue/session placement, and a Cloud Tasks join flow (`/users/join`).
   * Users are stored in Firestore, and their status is tracked across `users`, `in_session`, and `queue` collections.
   * Resume uploads are parsed for text (PDF/DOCX) and saved into Firestore (`backend/app/api/user_details/resume.py`).
   * Queue cleanup promotes the oldest queued candidate once a slot frees up and ensures each expired session has a SWOT summary stored before the document is deleted.

3. **Interview Bot Stack**
   * `/interview/start` and `/interview/respond` routes orchestrate the conversation, build prompts via `backend/app/api/interview/prompt.py`, dispatch Gemini invocations via `backend/app/utils/gemini_wrapper.py`, and persist history + next questions.
   * Responses include remaining session time and queue positioning if the user is still waiting.
   * A `finalize_session` helper ends the interview politely, triggers SWOT generation via the prompt utilities, and stores that structured data on the user record.
   * The `bot_response.parse_bot_response` helper normalizes the Gemini reply into `BOT_RESPONSE` and `NEXT_QUESTION` segments.

4. **SWOT Retrieval**
   * `backend/app/api/swot_details/swot_api.py` exposes `/swot/{user_id}` for retrieving structured SWOT data once it has been generated.
   * If no SWOT exists, the handler returns a 404 so callers can retry later.

---

## Queue & Session Lifecycle

1. **Cloud Tasks Enqueue** (`backend/app/utils/task_queue.py`)
   * New users are created via `/users`, enqueued with Cloud Tasks (`interview-queue`), and Cloud Run hits `/users/join` to run the transactional placement logic.
   * The queue is limited to 3 concurrent `in_session` users; any overflow is stored in `queue` ordered by creation time.
   * Each queued user sees their position via `/status/{user_id}` and the interview routes before they enter `in_session`.

2. **Atomic Session Placement**
   * `_join_transaction` ensures counting and placement happen inside a Firestore transaction, so no two users can grab the same slot.
   * `_exit_and_promote` removes sessions and promotes the next queued candidate within the same transaction (or via the cleanup task when necessary).

3. **Auto-Expiry + SWOT**
   * The cleanup loop runs every minute, finding expired `in_session` records, ensuring SWOT data exists for those users (via Gemini prompts), deleting the session doc, and promoting the next queued candidate.
   * Users leaving gracefully (via `/users/{user_id}/exit`) also trigger the combined deletion/promotion logic.

4. **Status Polling**
   * `/status/{user_id}` examines `in_session`, `queue`, and `users` documents to inform the frontend of the current status and queue position (if any).

---

## Deployment & Credentials

* The Dockerfile (`backend/Dockerfile`) copies application code and credentials (`creds.json`) into the image; `.env.sh` defines the runtime variables (GCP keys, Cloud Tasks config, bucket names).
* Jenkins pipelines copy these secrets into the workspace, normalize line endings, and build/push the image to Google Artifact Registry (`asia-south2-docker.pkg.dev/.../aibackend:latest`).

## Next Steps

1. Enable Firestore TTL on `in_session.expiry_time` to ensure abandoned documents eventually disappear.
2. Configure Cloud Tasks (`TASKS_QUEUE`, `TASKS_PROJECT`, `TASKS_LOCATION`, `TASKS_JOIN_URL`) with max concurrent 3, rate 3/sec, retries, and dead letter handling.
3. Tune the Gemini prompts in `prompt.py` for any change in hiring focus (e.g., replace “Full Stack Cloud Engineer” with other specializations when needed).

