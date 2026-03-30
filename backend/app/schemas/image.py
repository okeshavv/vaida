"""Image analysis request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ImageAnalyseResponse(BaseModel):
    image_id: str
    session_id: str
    findings: str
    diagnosis_category: str
    urgency_indicator: str
    specialist_type: str
    patient_message: str


class ImageDetailResponse(BaseModel):
    id: str
    session_id: str
    image_type: str
    findings: str
    diagnosis_category: str
    urgency_indicator: str
    specialist_type: str
    created_at: datetime
