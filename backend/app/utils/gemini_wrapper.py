import os
from typing import Optional

import google.generativeai as genai


def get_gemini_response(prompt: str, model_name: str = "models/gemini-flash-latest") -> str:
    """
    Generate a response from the Gemini model for the given prompt.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    chat = model.start_chat()
    response = chat.send_message(prompt)
    return response.text or ""
