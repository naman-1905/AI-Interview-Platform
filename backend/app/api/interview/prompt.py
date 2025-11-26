"""
Prompt builders for the interview bot.
"""

from typing import List, Dict


BASE_INSTRUCTIONS = """
You are conducting an interview for a Full Stack Cloud Engineer role.
Focus on Next.js, React, FastAPI, Flask, Django, and Google Cloud Platform.
Ask only subjective, technical questions; do not request coding or SQL solutions.
Always ground your responses in the candidate's resume and previous answers.
"""


def history_to_text(history: List[Dict]) -> str:
    """Serialize interview history into plain text for prompt context."""
    lines = []
    for entry in history:
        role = entry.get("role", "unknown").upper()
        message = entry.get("message", "").strip()
        question = entry.get("question")
        if question:
            message = f"{message}\nQuestion: {question}"
        lines.append(f"{role}: {message}")
    return "\n".join(lines)


def build_initial_prompt(resume_text: str) -> str:
    resume_section = resume_text.strip() or "No resume text provided."
    prompt = f"""{BASE_INSTRUCTIONS.strip()}

Use the resume below as your sole context and start with a subjective technical question.

Resume:
{resume_section}

Respond using this structure:
BOT_RESPONSE: <your response in a conversational tone>
NEXT_QUESTION: <the next subjective technical question>
"""
    return prompt


def build_followup_prompt(resume_text: str, history: str, user_response: str) -> str:
    resume_section = resume_text.strip() or "No resume text provided."
    prompt = f"""{BASE_INSTRUCTIONS.strip()}

Resume:
{resume_section}

Conversation so far:
{history}

Candidate response:
{user_response}

Based on the above, respond with a thoughtful analysis and follow it with the next subjective technical question.
Respond using this structure:
BOT_RESPONSE: <bot answer>
NEXT_QUESTION: <your next subjective question for the candidate>
"""
    return prompt


def build_swot_prompt(resume_text: str, history: str) -> str:
    resume_section = resume_text.strip() or "No resume text provided."
    prompt = f"""{BASE_INSTRUCTIONS.strip()}

You will now summarize the candidate using a SWOT analysis.
Keep the summary brief and technical, focusing on Full Stack Cloud Engineering experience.

Resume:
{resume_section}

Conversation history:
{history}

Respond strictly with JSON in this shape:
{{
  "strengths": [ ... ],
  "weaknesses": [ ... ],
  "opportunities": [ ... ],
  "threats": [ ... ]
}}
"""
    return prompt


def parse_swot_response(text: str) -> Dict:
    """Try to parse a JSON-looking SWOT response; fallback to raw string."""
    import json

    try:
        return json.loads(text.strip())
    except Exception:
        return {"raw": text.strip()}
