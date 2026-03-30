"""
VAIDA Brief API — /brief/* endpoints.
Doctor pre-brief generation in PDF, FHIR R4, and JSON formats.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Patient, IntakeSession, TriageResult, ImageAnalysis, DoctorBrief
from app.schemas.brief import BriefResponse
from app.dependencies import get_current_user, require_role
from app.ai.brief_gen import generate_brief_json, generate_fhir_json, generate_pdf_content

router = APIRouter(prefix="/brief", tags=["Doctor Pre-Brief"])


@router.get("/queue")
def get_doctor_queue(
    current_user: Patient = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Return all pending consultations for the authenticated doctor."""
    from app.models.db_models import IntakeSession, TriageResult as TR
    briefs = (
        db.query(DoctorBrief)
        .filter(
            DoctorBrief.doctor_id == current_user.id,
            DoctorBrief.consult_status == "pending",
        )
        .order_by(DoctorBrief.created_at.desc())
        .limit(50)
        .all()
    )
    results = []
    for b in briefs:
        triage = db.query(TR).filter(TR.session_id == b.session_id).first()
        session = db.query(IntakeSession).filter(IntakeSession.id == b.session_id).first()
        results.append({
            "id": b.id,
            "session_id": b.session_id,
            "consult_status": b.consult_status,
            "urgency": triage.urgency if triage else None,
            "confidence": triage.confidence_score if triage else None,
            "chief_complaint": (session.symptoms_json or {}).get("chief_complaint", "—") if session else "—",
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })
    return results


@router.get("/{session_id}", response_model=BriefResponse)
def get_brief(
    session_id: str,
    format: str = Query(default="json", regex="^(pdf|fhir|json)$"),
    current_user: Patient = Depends(require_role("doctor", "asha")),
    db: Session = Depends(get_db),
):
    """
    Generate a doctor pre-brief for a session.
    Supports: pdf, fhir (HL7 FHIR R4), json formats.
    Only doctors and ASHA workers can access briefs.
    """
    # ── Get session ──
    session = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Get triage result ──
    triage = db.query(TriageResult).filter(TriageResult.session_id == session_id).first()
    if not triage:
        raise HTTPException(status_code=404, detail="Triage result not found for this session")

    # ── GREEN cases don't get briefs ──
    if triage.urgency == "GREEN":
        raise HTTPException(
            status_code=400,
            detail="GREEN urgency cases do not generate doctor briefs — self-care instructions were provided to patient",
        )

    # ── Get optional image analysis ──
    image = db.query(ImageAnalysis).filter(ImageAnalysis.session_id == session_id).first()
    image_data = None
    if image:
        image_data = {
            "image_type": image.image_type,
            "findings": image.findings,
            "diagnosis_category": image.diagnosis_category,
            "urgency_indicator": image.urgency_indicator,
            "specialist_type": image.specialist_type,
        }

    # ── Build session data dict ──
    session_data = {
        "id": session.id,
        "patient_id": session.patient_id,
        "body_location": session.body_location,
        "symptoms_json": session.symptoms_json,
        "duration_hours": session.duration_hours,
        "severity_score": session.severity_score,
        "lang_detected": session.lang_detected,
        "source": session.source,
    }

    triage_data = {
        "urgency": triage.urgency,
        "confidence_score": triage.confidence_score,
        "differential_json": triage.differential_json,
        "rule_override": triage.rule_override,
        "model_version": triage.model_version,
    }

    # ── Generate brief based on format ──
    brief_json_data = generate_brief_json(session_data, triage_data, image_data)
    fhir_data = None
    pdf_url = None

    if format == "fhir":
        fhir_data = generate_fhir_json(session_data, triage_data)
    elif format == "pdf":
        pdf_url = f"/brief/{session_id}/download"

    # ── Persist brief ──
    brief = db.query(DoctorBrief).filter(DoctorBrief.session_id == session_id).first()
    if not brief:
        brief = DoctorBrief(
            session_id=session_id,
            doctor_id=current_user.id,
            fhir_json=fhir_data,
            ai_hypothesis=brief_json_data.get("differential_diagnosis"),
        )
        db.add(brief)
        db.commit()
        db.refresh(brief)

    return BriefResponse(
        brief_id=brief.id,
        session_id=session_id,
        format=format,
        brief_pdf_url=pdf_url,
        fhir_json=fhir_data,
        brief_json=brief_json_data if format == "json" else None,
        ai_hypothesis={"differential": brief_json_data.get("differential_diagnosis", [])},
    )


@router.get("/{session_id}/download")
def download_brief_pdf(
    session_id: str,
    current_user: Patient = Depends(require_role("doctor", "asha")),
    db: Session = Depends(get_db),
):
    """Download the brief as a PDF file."""
    session = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    triage = db.query(TriageResult).filter(TriageResult.session_id == session_id).first()
    if not triage:
        raise HTTPException(status_code=404, detail="Triage not found")

    session_data = {
        "id": session.id,
        "patient_id": session.patient_id,
        "body_location": session.body_location,
        "symptoms_json": session.symptoms_json,
        "duration_hours": session.duration_hours,
        "severity_score": session.severity_score,
        "lang_detected": session.lang_detected,
        "source": session.source,
    }
    triage_data = {
        "urgency": triage.urgency,
        "confidence_score": triage.confidence_score,
        "differential_json": triage.differential_json,
        "rule_override": triage.rule_override,
        "model_version": triage.model_version,
    }

    brief_json = generate_brief_json(session_data, triage_data)
    pdf_bytes = generate_pdf_content(brief_json)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=vaida_brief_{session_id[:8]}.pdf"},
    )
