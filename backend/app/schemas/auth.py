"""Auth request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern=r"^(patient|asha|doctor)$")
    lang: str = Field(default="en", max_length=10)
    consent: bool = Field(...)
    district: Optional[str] = None


class RegisterResponse(BaseModel):
    user_id: str
    token: str
    message: str


class LoginRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    otp: str = Field(..., min_length=4, max_length=8)


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ConsentRequest(BaseModel):
    patient_id: str
    consent_type: str = Field(default="data_storage+ai_triage")
    lang: str = Field(default="en")


class ConsentResponse(BaseModel):
    consent_tx_hash: str
    message: str
