"""
Helpers to parse Gemini responses for the interview flow.
"""

from typing import Tuple


def parse_bot_response(raw: str) -> Tuple[str, str]:
    """
    Parse the Gemini output into bot response and the next question.

    Expected format:
    BOT_RESPONSE: ...
    NEXT_QUESTION: ...
    """
    bot_response = raw.strip()
    next_question = ""

    marker_bot = "BOT_RESPONSE:"
    marker_next = "NEXT_QUESTION:"

    if marker_bot in raw:
        _, remainder = raw.split(marker_bot, 1)
        if marker_next in remainder:
            response_part, question_part = remainder.split(marker_next, 1)
            bot_response = response_part.strip()
            next_question = question_part.strip()
        else:
            bot_response = remainder.strip()
    elif marker_next in raw:
        parts = raw.split(marker_next, 1)
        bot_response = parts[0].strip()
        next_question = parts[1].strip()
    else:
        # best effort split by newline
        lines = raw.strip().splitlines()
        if len(lines) >= 2:
            bot_response = lines[0]
            next_question = " ".join(lines[1:]).strip()

    return bot_response, next_question
