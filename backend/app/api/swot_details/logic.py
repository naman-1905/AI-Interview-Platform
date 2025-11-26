"""
Utility helpers for working with SWOT analysis data.
"""

from typing import Dict, Optional


def build_swot_payload(user_id: str, swot_data: Optional[Dict]) -> Dict:
    """
    Prepare the structured response for a SWOT lookup.
    """
    return {
        "user_id": user_id,
        "swot_analysis": swot_data or {},
        "found": bool(swot_data),
    }
