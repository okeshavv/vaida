"""
VAIDA Vision API — /image/* endpoints.
GPT-4o Vision image analysis for wound, rash, eye, skin conditions.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Patient, IntakeSession, ImageAnalysis
from app.schemas.image import ImageAnalyseResponse, ImageDetailResponse
from app.dependencies import get_current_user
from app.ai.vision_engine import analyse_image_local, analyse_image_gpt
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/image", tags=["Image Diagnosis"])


def _get_openai_client():
    if settings.OPENAI_API_KEY:
        try:
            import openai
            return openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception:
            pass
    return None

VALID_IMAGE_TYPES = {"wound", "rash", "eye", "skin"}


@router.post("/analyse", response_model=ImageAnalyseResponse, status_code=201)
async def analyse_image_endpoint(
    session_id: str = Form(...),
    image_type: str = Form(...),
    image: UploadFile = File(...),
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyse a medical image using GPT-4o Vision.
    Returns findings, diagnosis category, urgency, and recommended specialist.
    """
    # ── Validate image type ──
    if image_type not in VALID_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image_type. Must be one of: {', '.join(VALID_IMAGE_TYPES)}",
        )

    # ── Validate session exists ──
    session = db.query(IntakeSession).filter(IntakeSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # ── Read image ──
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    # ── Analyse: GPT-4o Vision if key set, local fallback otherwise ──
    openai_client = _get_openai_client()
    if openai_client:
        result = await analyse_image_gpt(image_bytes, image_type, openai_client)
    else:
        result = analyse_image_local(image_type)

    # ── Persist ──
    analysis = ImageAnalysis(
        session_id=session_id,
        image_type=image_type,
        image_url_encrypted=f"encrypted://images/{session_id}/{image.filename}",
        findings=result["visible_findings"],
        diagnosis_category=result["diagnosis_category"],
        urgency_indicator=result["urgency_indicator"],
        specialist_type=result["recommended_specialist"],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return ImageAnalyseResponse(
        image_id=analysis.id,
        session_id=session_id,
        findings=result["visible_findings"],
        diagnosis_category=result["diagnosis_category"],
        urgency_indicator=result["urgency_indicator"],
        specialist_type=result["recommended_specialist"],
        patient_message=result["patient_message"],
    )


@router.get("/{image_id}", response_model=ImageDetailResponse)
def get_image_analysis(
    image_id: str,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve an image analysis result by ID."""
    analysis = db.query(ImageAnalysis).filter(ImageAnalysis.id == image_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Image analysis not found")

    return ImageDetailResponse(
        id=analysis.id,
        session_id=analysis.session_id,
        image_type=analysis.image_type,
        findings=analysis.findings,
        diagnosis_category=analysis.diagnosis_category,
        urgency_indicator=analysis.urgency_indicator,
        specialist_type=analysis.specialist_type,
        created_at=analysis.created_at,
    )
