"""
VAIDA Vision Engine — Image analysis via GPT-4o Vision or local fallback.
"""
import json
import logging
import base64
from typing import Optional

from app.ai.prompts import VISION_PROMPT

logger = logging.getLogger(__name__)


def analyse_image_local(image_type: str) -> dict:
    """
    Local/fallback image analysis result when GPT-4o Vision is unavailable.
    Returns a safe, conservative analysis prompting doctor review.
    """
    specialist_map = {
        "wound": "General Surgeon / Emergency Medicine",
        "rash": "Dermatologist",
        "eye": "Ophthalmologist",
        "skin": "Dermatologist",
    }
    urgency_map = {
        "wound": "medium",
        "rash": "low",
        "eye": "medium",
        "skin": "low",
    }
    return {
        "visible_findings": f"Image of type '{image_type}' received. Automated analysis unavailable — forwarded to doctor for manual review.",
        "diagnosis_category": "other",
        "urgency_indicator": urgency_map.get(image_type, "medium"),
        "recommended_specialist": specialist_map.get(image_type, "General Physician"),
        "patient_message": "Image received and sent to doctor for review.",
    }


async def analyse_image_gpt(
    image_bytes: bytes,
    image_type: str,
    openai_client=None,
) -> dict:
    """
    Analyse a medical image using GPT-4o Vision API.
    Falls back to local analysis if API unavailable.
    """
    if openai_client is None:
        return analyse_image_local(image_type)

    try:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        prompt = VISION_PROMPT.replace("{image_type}", image_type)

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                    {"type": "text", "text": prompt},
                ],
            }],
            max_tokens=500,
        )
        content = response.choices[0].message.content
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        logger.warning("GPT-4o Vision returned non-JSON response for image_type=%s; using local fallback", image_type)
        return analyse_image_local(image_type)
    except Exception as exc:
        logger.error("GPT-4o Vision analysis failed for image_type=%s: %s; using local fallback", image_type, exc)
        return analyse_image_local(image_type)
