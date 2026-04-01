"""Triage request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List


class TriageRequest(BaseModel):
    session_id: str
    structured_symptoms: Optional[dict] = None


class DifferentialItem(BaseModel):
    condition: str
    probability: float
    reasoning: str


class TriageResponse(BaseModel):
    triage_id: str
    session_id: str
    urgency: str  # GREEN | AMBER | RED
    confidence: float
    differential: List[DifferentialItem]
    rule_override: bool
    model_version: str
    audit_tx_hash: Optional[str] = None


class TriageResultResponse(BaseModel):
    urgency: str
    guidance_text: str
    guidance_audio_url: Optional[str] = None
    lang: str


class TriageFeedbackRequest(BaseModel):
    session_id: str
    doctor_urgency: str = Field(..., pattern=r"^(GREEN|AMBER|RED)$")
    notes: str = ""


class TriageFeedbackResponse(BaseModel):
    feedback_id: str
    message: str
