"""
VAIDA Database Models — SQLAlchemy ORM mapped to the wireframe schema.
All 7 tables from the VAIDA Backend Wireframe specification.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, SmallInteger, Float,
    Boolean, DateTime, JSON, ForeignKey,
)
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ══════════════════════════════════════════════════════════════
# 1. patients
# ══════════════════════════════════════════════════════════════
class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    phone_hash = Column(String(64), unique=True, nullable=False, index=True)
    name_encrypted = Column(Text, nullable=False)
    lang_preference = Column(String(10), nullable=False, default="en")
    role = Column(String(20), nullable=False, default="patient")  # patient | asha | doctor
    district = Column(String(100), index=True)
    consent_tx_hash = Column(String(66))
    password_hash = Column(String(128), nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    last_active = Column(DateTime, default=utcnow, onupdate=utcnow)


# ══════════════════════════════════════════════════════════════
# 2. intake_sessions
# ══════════════════════════════════════════════════════════════
class IntakeSession(Base):
    __tablename__ = "intake_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    voice_transcript = Column(Text)
    body_location = Column(String(100))
    symptoms_json = Column(JSON, nullable=False)
    duration_hours = Column(Integer)
    severity_score = Column(SmallInteger)  # 1-10
    lang_detected = Column(String(10))
    source = Column(String(10), default="mixed")  # voice | icon | mixed
    offline_queued = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)


# ══════════════════════════════════════════════════════════════
# 3. triage_results
# ══════════════════════════════════════════════════════════════
class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("intake_sessions.id"), nullable=False)
    urgency = Column(String(10), nullable=False)  # GREEN | AMBER | RED
    confidence_score = Column(Float)
    differential_json = Column(JSON)
    rule_override = Column(Boolean, default=False)
    model_version = Column(String(20), index=True, default="triage-v1.0.0")
    doctor_feedback = Column(JSON)
    audit_tx_hash = Column(String(66))
    created_at = Column(DateTime, nullable=False, default=utcnow)


# ══════════════════════════════════════════════════════════════
# 4. image_analyses
# ══════════════════════════════════════════════════════════════
class ImageAnalysis(Base):
    __tablename__ = "image_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("intake_sessions.id"), nullable=False)
    image_type = Column(String(20))  # wound | rash | eye | skin
    image_url_encrypted = Column(Text)
    findings = Column(Text)
    diagnosis_category = Column(String(50))  # inflammatory | infectious | traumatic | other
    urgency_indicator = Column(String(10))  # low | medium | high
    specialist_type = Column(String(80))
    created_at = Column(DateTime, nullable=False, default=utcnow)


# ══════════════════════════════════════════════════════════════
# 5. doctor_briefs
# ══════════════════════════════════════════════════════════════
class DoctorBrief(Base):
    __tablename__ = "doctor_briefs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("intake_sessions.id"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("patients.id"))
    pdf_url = Column(Text)
    fhir_json = Column(JSON)
    ai_hypothesis = Column(JSON)
    jitsi_room_id = Column(String(100))
    consult_status = Column(String(20), default="pending")  # pending | active | done
    consult_outcome_json = Column(JSON)
    created_at = Column(DateTime, nullable=False, default=utcnow)


# ══════════════════════════════════════════════════════════════
# 6. epi_events (aggregated, anonymised)
# ══════════════════════════════════════════════════════════════
class EpiEvent(Base):
    __tablename__ = "epi_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    district = Column(String(100), index=True, nullable=False)
    symptom_cluster = Column(JSON)  # list of symptom strings
    patient_count = Column(Integer, default=1)
    window_start = Column(DateTime, index=True)
    window_end = Column(DateTime)
    alert_triggered = Column(Boolean, default=False)
    alert_tx_hash = Column(String(66))
    zkp_proof_hash = Column(Text)


# ══════════════════════════════════════════════════════════════
# 7. offline_sync_queue
# ══════════════════════════════════════════════════════════════
class OfflineSyncQueue(Base):
    __tablename__ = "offline_sync_queue"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    endpoint = Column(String(100), nullable=False)
    payload_json = Column(JSON, nullable=False)
    status = Column(String(20), default="queued", index=True)  # queued | syncing | synced | failed
    retry_count = Column(SmallInteger, default=0)
    created_offline_at = Column(DateTime)
    synced_at = Column(DateTime)
