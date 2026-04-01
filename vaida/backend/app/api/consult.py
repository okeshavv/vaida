"""
VAIDA Consult API — /consult/* endpoints.
Jitsi teleconsultation room management and outcome recording.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Patient, DoctorBrief
from app.schemas.consult import (
    ConsultInitRequest, ConsultInitResponse,
    ConsultCompleteRequest, ConsultCompleteResponse,
)
from app.dependencies import get_current_user, require_role
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/consult", tags=["Teleconsultation"])


@router.post("/initiate", response_model=ConsultInitResponse, status_code=201)
def initiate_consult(
    req: ConsultInitRequest,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Jitsi room and associate it with the session's brief."""
    # ── Get or create brief ──
    brief = db.query(DoctorBrief).filter(
        DoctorBrief.session_id == req.session_id
    ).first()

    if not brief:
        brief = DoctorBrief(
            session_id=req.session_id,
            doctor_id=req.doctor_id,
            consult_status="pending",
        )
        db.add(brief)

    # ── Generate Jitsi room ──
    room_id = f"vaida-{uuid.uuid4().hex[:12]}"
    jitsi_url = f"https://{settings.JITSI_DOMAIN}/{room_id}"

    brief.jitsi_room_id = room_id
    brief.doctor_id = req.doctor_id
    brief.consult_status = "active"
    db.commit()
    db.refresh(brief)

    return ConsultInitResponse(
        consult_id=brief.id,
        jitsi_room_url=jitsi_url,
        brief_link=f"/brief/{req.session_id}?format=json",
    )


@router.put("/{consult_id}/complete", response_model=ConsultCompleteResponse)
def complete_consult(
    consult_id: str,
    req: ConsultCompleteRequest,
    current_user: Patient = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Mark consultation complete and store the clinical outcome."""
    brief = db.query(DoctorBrief).filter(DoctorBrief.id == consult_id).first()
    if not brief:
        raise HTTPException(status_code=404, detail="Consultation not found")

    if brief.consult_status == "done":
        raise HTTPException(status_code=400, detail="Consultation already completed")

    brief.consult_status = "done"
    brief.consult_outcome_json = {
        "diagnosis": req.diagnosis,
        "prescription": req.prescription,
        "follow_up": req.follow_up,
        "completed_by": current_user.id,
    }
    db.commit()

    return ConsultCompleteResponse(
        record_id=brief.id,
        status="done",
        message="Consultation completed and outcome recorded",
    )
