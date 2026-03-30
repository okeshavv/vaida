"""Doctor brief schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BriefResponse(BaseModel):
    brief_id: str
    session_id: str
    format: str  # pdf | fhir | json
    brief_pdf_url: Optional[str] = None
    fhir_json: Optional[dict] = None
    brief_json: Optional[dict] = None
    ai_hypothesis: Optional[dict] = None
