"""Intake request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class IntakeRequest(BaseModel):
    patient_id: str
    voice_transcript: Optional[str] = None
    body_location: Optional[str] = None
    symptoms: List[str] = Field(..., min_length=1)
    duration: Optional[int] = Field(None, ge=0, description="Duration in hours")
    severity: Optional[int] = Field(None, ge=1, le=10)
    lang: str = Field(default="en")
    source: str = Field(default="mixed", pattern=r"^(voice|icon|mixed)$")


class StructuredSymptoms(BaseModel):
    chief_complaint: str
    body_location: str
    symptom_character: List[str]
    duration_hours: Optional[int] = None
    severity_1_10: Optional[int] = None
    associated_symptoms: List[str] = []
    red_flag_features: dict = {}
    lang_detected: str = "en"


class IntakeResponse(BaseModel):
    session_id: str
    structured_symptoms: StructuredSymptoms
    message: str


class VoiceUploadResponse(BaseModel):
    transcript: str
    detected_lang: str


class SessionResponse(BaseModel):
    id: str
    patient_id: str
    voice_transcript: Optional[str]
    body_location: Optional[str]
    symptoms_json: dict
    duration_hours: Optional[int]
    severity_score: Optional[int]
    lang_detected: Optional[str]
    source: str
    offline_queued: bool
    created_at: datetime


class SyncRequest(BaseModel):
    queued_sessions: List[dict]


class SyncResultItem(BaseModel):
    session_id: str
    status: str  # synced | failed | duplicate
    message: str


class SyncResponse(BaseModel):
    sync_result: List[SyncResultItem]
    total: int
    synced: int
    failed: int
    duplicates: int
