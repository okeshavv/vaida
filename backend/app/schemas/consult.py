"""Teleconsult schemas."""
from pydantic import BaseModel, Field
from typing import Optional


class ConsultInitRequest(BaseModel):
    session_id: str
    doctor_id: str


class ConsultInitResponse(BaseModel):
    consult_id: str
    jitsi_room_url: str
    brief_link: str


class ConsultCompleteRequest(BaseModel):
    diagnosis: str
    prescription: Optional[str] = None
    follow_up: Optional[str] = None


class ConsultCompleteResponse(BaseModel):
    record_id: str
    status: str
    message: str
