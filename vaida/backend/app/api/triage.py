"""
VAIDA Triage API — /triage/* endpoints.
AI urgency classification, patient-facing results, doctor feedback loop.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Patient, IntakeSession, TriageResult
from app.schemas.triage import (
    TriageRequest, TriageResponse, DifferentialItem,
    TriageResultResponse,
    TriageFeedbackRequest, TriageFeedbackResponse,
)
from app.dependencies import get_current_user, require_role
from app.ai.classifier import classify_urgency
from app.ai.prompts import GUIDANCE_TEMPLATES
from app.blockchain.ledger import get_ledger
import hashlib

router = APIRouter(prefix="/triage", tags=["AI Triage"])


@router.post("", response_model=TriageResponse, status_code=201)
def run_triage(
    req: TriageRequest,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Classify urgency using rule engine + ML classifier.
    Hard RED overrides bypass ML entirely.
    Confidence < 0.65 defaults to AMBER (errs safe).
    """
    # ── Get intake session ──
    session = db.query(IntakeSession).filter(
        IntakeSession.id == req.session_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Get symptoms ──
    symptoms = req.structured_symptoms or session.symptoms_json
    if not symptoms:
        raise HTTPException(status_code=400, detail="No symptoms data available")

    # ── Run classifier ──
    result = classify_urgency(symptoms)

    # ── Blockchain audit trail ──
    ledger = get_ledger()
    session_hash = hashlib.sha256(req.session_id.encode()).hexdigest()[:16]
    audit_tx = ledger.add_triage_audit(
        session_hash=f"0x{session_hash}",
        urgency=result["urgency"],
        model_version=result["model_version"],
        rule_override=result["rule_override"],
        triggered_flags=result.get("triggered_flags", []),
    )

    # ── Persist triage result ──
    triage = TriageResult(
        session_id=req.session_id,
        urgency=result["urgency"],
        confidence_score=result["confidence"],
        differential_json=result["differential"],
        rule_override=result["rule_override"],
        model_version=result["model_version"],
        audit_tx_hash=audit_tx,
    )
    db.add(triage)
    db.commit()
    db.refresh(triage)

    return TriageResponse(
        triage_id=triage.id,
        session_id=req.session_id,
        urgency=result["urgency"],
        confidence=result["confidence"],
        differential=[DifferentialItem(**d) for d in result["differential"]],
        rule_override=result["rule_override"],
        model_version=result["model_version"],
        audit_tx_hash=audit_tx,
    )


@router.get("/{session_id}/result", response_model=TriageResultResponse)
def get_triage_result(
    session_id: str,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get patient-facing triage result with guidance in their language."""
    triage = db.query(TriageResult).filter(
        TriageResult.session_id == session_id
    ).first()
    if not triage:
        raise HTTPException(status_code=404, detail="Triage result not found")

    # ── Get guidance in patient's language ──
    lang = current_user.lang_preference or "en"
    guidance_map = GUIDANCE_TEMPLATES.get(triage.urgency, GUIDANCE_TEMPLATES["AMBER"])
    guidance_text = guidance_map.get(lang, guidance_map.get("en", "Please consult a doctor."))

    return TriageResultResponse(
        urgency=triage.urgency,
        guidance_text=guidance_text,
        guidance_audio_url=None,  # Production: generate TTS audio URL
        lang=lang,
    )


@router.post("/feedback", response_model=TriageFeedbackResponse)
def submit_feedback(
    req: TriageFeedbackRequest,
    current_user: Patient = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """
    Doctor feedback loop — records actual urgency for MLOps drift detection.
    Only doctors can submit feedback.
    """
    triage = db.query(TriageResult).filter(
        TriageResult.session_id == req.session_id
    ).first()
    if not triage:
        raise HTTPException(status_code=404, detail="Triage result not found")

    triage.doctor_feedback = {
        "doctor_id": current_user.id,
        "doctor_urgency": req.doctor_urgency,
        "notes": req.notes,
        "ai_urgency": triage.urgency,
        "matched": triage.urgency == req.doctor_urgency,
    }
    db.commit()

    return TriageFeedbackResponse(
        feedback_id=triage.id,
        message=f"Feedback recorded. AI said {triage.urgency}, doctor said {req.doctor_urgency}.",
    )
