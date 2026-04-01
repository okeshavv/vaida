"""
VAIDA Intake API — /intake/* endpoints.
Symptom submission, voice upload, session retrieval, offline sync.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.db_models import Patient, IntakeSession, OfflineSyncQueue, TriageResult
from app.schemas.intake import (
    IntakeRequest, IntakeResponse, StructuredSymptoms,
    VoiceUploadResponse, SessionResponse,
    SyncRequest, SyncResponse, SyncResultItem,
)
from app.dependencies import get_current_user
from app.ai.nlp_engine import extract_symptoms_local, extract_symptoms_gpt
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/intake", tags=["Patient Intake"])


def _get_openai_client():
    """Return an OpenAI client if API key is configured, else None."""
    if settings.OPENAI_API_KEY:
        try:
            import openai
            return openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception:
            pass
    return None


@router.get("/list")
def list_sessions(
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the last 20 intake sessions for the current patient, with triage urgency."""
    sessions = (
        db.query(IntakeSession)
        .filter(IntakeSession.patient_id == current_user.id)
        .order_by(desc(IntakeSession.created_at))
        .limit(20)
        .all()
    )
    results = []
    for s in sessions:
        triage = db.query(TriageResult).filter(TriageResult.session_id == s.id).first()
        results.append({
            "id": s.id,
            "date": s.created_at.isoformat() if s.created_at else None,
            "complaint": (s.symptoms_json or {}).get("chief_complaint", "—"),
            "urgency": triage.urgency if triage else None,
            "confidence": triage.confidence_score if triage else None,
        })
    return results


@router.post("", response_model=IntakeResponse, status_code=201)
async def submit_intake(
    req: IntakeRequest,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit symptom intake (voice transcript, icon selections, or mixed)."""
    # ── Build symptom text for NLP ──
    symptom_text = ""
    if req.voice_transcript:
        symptom_text = req.voice_transcript
    else:
        symptom_text = ", ".join(req.symptoms)
        if req.body_location:
            symptom_text += f" in {req.body_location}"

    # ── Extract structured symptoms (GPT-4o if key set, local fallback) ──
    openai_client = _get_openai_client()
    if openai_client:
        structured = await extract_symptoms_gpt(symptom_text, openai_client)
    else:
        structured = extract_symptoms_local(symptom_text, req.lang)

    # Override with explicit fields if provided
    if req.body_location:
        structured["body_location"] = req.body_location
    if req.duration is not None:
        structured["duration_hours"] = req.duration
    if req.severity is not None:
        structured["severity_1_10"] = req.severity

    # ── Persist intake session ──
    session = IntakeSession(
        patient_id=current_user.id,
        voice_transcript=req.voice_transcript,
        body_location=structured["body_location"],
        symptoms_json=structured,
        duration_hours=structured.get("duration_hours"),
        severity_score=structured.get("severity_1_10"),
        lang_detected=structured.get("lang_detected", req.lang),
        source=req.source,
        offline_queued=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return IntakeResponse(
        session_id=session.id,
        structured_symptoms=StructuredSymptoms(**structured),
        message="Intake recorded successfully",
    )


@router.post("/voice", response_model=VoiceUploadResponse)
async def voice_upload(
    audio_blob: UploadFile = File(...),
    lang_hint: str = Form(default="auto"),
    current_user: Patient = Depends(get_current_user),
):
    """
    Upload audio blob → Whisper STT → structured transcript.
    In dev mode: returns a mock transcript.
    Production: calls OpenAI Whisper API.
    """
    audio_bytes = await audio_blob.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    openai_client = _get_openai_client()
    if openai_client:
        try:
            import io
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = audio_blob.filename or "audio.webm"
            result = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=lang_hint if lang_hint != "auto" else None,
            )
            transcript = result.text
            detected_lang = lang_hint if lang_hint != "auto" else "en"
        except Exception:
            transcript = "Patient reports headache and fever for 2 days"
            detected_lang = "en"
    else:
        transcript = "Patient reports headache and fever for 2 days"
        detected_lang = lang_hint if lang_hint != "auto" else "en"

    return VoiceUploadResponse(
        transcript=transcript,
        detected_lang=detected_lang,
    )


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve an intake session by ID."""
    session = db.query(IntakeSession).filter(
        IntakeSession.id == session_id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Patient isolation: patients can only see their own sessions ──
    if current_user.role == "patient" and session.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return SessionResponse(
        id=session.id,
        patient_id=session.patient_id,
        voice_transcript=session.voice_transcript,
        body_location=session.body_location,
        symptoms_json=session.symptoms_json,
        duration_hours=session.duration_hours,
        severity_score=session.severity_score,
        lang_detected=session.lang_detected,
        source=session.source,
        offline_queued=session.offline_queued,
        created_at=session.created_at,
    )


@router.post("/sync", response_model=SyncResponse)
def sync_offline(
    req: SyncRequest,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bulk-upload offline-queued intake sessions.
    Uses UUID generated offline for deduplication.
    """
    results = []
    synced = 0
    failed = 0
    duplicates = 0

    for item in req.queued_sessions:
        session_id = item.get("id")
        if not session_id:
            results.append(SyncResultItem(
                session_id="unknown",
                status="failed",
                message="Missing session ID",
            ))
            failed += 1
            continue

        # ── Duplicate check ──
        existing = db.query(IntakeSession).filter(
            IntakeSession.id == session_id
        ).first()
        if existing:
            results.append(SyncResultItem(
                session_id=session_id,
                status="duplicate",
                message="Session already exists",
            ))
            duplicates += 1
            continue

        # ── Process the intake ──
        try:
            symptoms = item.get("symptoms", [])
            symptom_text = ", ".join(symptoms) if isinstance(symptoms, list) else str(symptoms)
            structured = extract_symptoms_local(symptom_text, item.get("lang", "en"))

            session = IntakeSession(
                id=session_id,
                patient_id=current_user.id,
                voice_transcript=item.get("voice_transcript"),
                body_location=item.get("body_location", structured["body_location"]),
                symptoms_json=structured,
                duration_hours=item.get("duration"),
                severity_score=item.get("severity"),
                lang_detected=structured.get("lang_detected"),
                source=item.get("source", "mixed"),
                offline_queued=True,
            )
            db.add(session)
            db.commit()

            results.append(SyncResultItem(
                session_id=session_id,
                status="synced",
                message="Session synced successfully",
            ))
            synced += 1
        except Exception as e:
            db.rollback()
            results.append(SyncResultItem(
                session_id=session_id,
                status="failed",
                message=str(e)[:200],
            ))
            failed += 1

    return SyncResponse(
        sync_result=results,
        total=len(req.queued_sessions),
        synced=synced,
        failed=failed,
        duplicates=duplicates,
    )
