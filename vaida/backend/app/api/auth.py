"""
VAIDA Auth API — /auth/* endpoints.
Registration, login (OTP), token refresh, consent recording, account deletion.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import Patient, IntakeSession
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    RefreshRequest, RefreshResponse,
    ConsentRequest, ConsentResponse,
)
from app.services.auth_service import (
    hash_password, hash_phone, encrypt_name,
    create_access_token, create_refresh_token,
    decode_token, verify_otp, generate_otp,
)
from app.services.sms_service import send_otp as sms_send_otp
from app.blockchain.ledger import get_ledger
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=RegisterResponse, status_code=201)
@limiter.limit("10/minute")
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new patient, ASHA worker, or doctor."""
    if not req.consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent is required for registration (DPDPA 2023)",
        )

    phone_h = hash_phone(req.phone)
    existing = db.query(Patient).filter(Patient.phone_hash == phone_h).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    if req.role not in ("patient", "asha", "doctor"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be: patient, asha, or doctor",
        )

    user = Patient(
        phone_hash=phone_h,
        name_encrypted=encrypt_name(req.name),
        lang_preference=req.lang,
        role=req.role,
        district=req.district,
        password_hash=hash_password(req.password),
    )

    ledger = get_ledger()
    consent_tx = ledger.add_consent_record(
        patient_hash=phone_h,
        consent_type="data_storage+ai_triage",
        lang=req.lang,
    )
    user.consent_tx_hash = consent_tx

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role)
    logger.info("New user registered: role=%s district=%s", user.role, user.district)

    return RegisterResponse(
        user_id=user.id,
        token=token,
        message=f"Registration successful. Consent recorded: {consent_tx[:20]}...",
    )


@router.post("/send-otp", status_code=200)
@limiter.limit("5/minute")
def send_otp_endpoint(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    """
    Generate and send an OTP to the given phone number.
    Must be called before /login.
    In dev mode (OTP_BYPASS=True) this is a no-op — use bypass code directly.
    """
    from app.config import get_settings
    settings = get_settings()

    phone_h = hash_phone(req.phone)
    user = db.query(Patient).filter(Patient.phone_hash == phone_h).first()
    if not user:
        # Don't reveal whether the phone is registered (prevents enumeration)
        return {"message": "If this number is registered, an OTP has been sent."}

    if not settings.OTP_BYPASS:
        otp_code = generate_otp(req.phone)
        result = sms_send_otp(req.phone, otp_code, lang=user.lang_preference or "en")
        if result.get("status") == "error":
            logger.error("Failed to send OTP to %s: %s", req.phone[:4] + "***", result.get("detail"))
            raise HTTPException(status_code=503, detail="Failed to send OTP. Please try again.")
        logger.info("OTP sent to %s", req.phone[:4] + "***")

    return {"message": "If this number is registered, an OTP has been sent."}


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    """Phone + OTP login."""
    phone_h = hash_phone(req.phone)
    user = db.query(Patient).filter(Patient.phone_hash == phone_h).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not verify_otp(req.phone, req.otp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    access = create_access_token(user.id, user.role)
    refresh = create_refresh_token(user.id, user.role)
    logger.info("User logged in: role=%s", user.role)

    return LoginResponse(
        access_token=access,
        refresh_token=refresh,
        role=user.role,
        user_id=user.id,
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh_token(req: RefreshRequest):
    """Refresh an expired access token."""
    payload = decode_token(req.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    new_access = create_access_token(payload["sub"], payload["role"])
    return RefreshResponse(access_token=new_access)


@router.post("/consent", response_model=ConsentResponse)
def record_consent(
    req: ConsentRequest,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record additional consent on the blockchain."""
    ledger = get_ledger()
    tx_hash = ledger.add_consent_record(
        patient_hash=current_user.phone_hash,
        consent_type=req.consent_type,
        lang=req.lang,
    )

    current_user.consent_tx_hash = tx_hash
    db.commit()

    return ConsentResponse(
        consent_tx_hash=tx_hash,
        message="Consent recorded on-chain successfully",
    )


@router.delete("/me", status_code=200)
def delete_account(
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Right-to-deletion (DPDPA 2023 §13).
    Anonymises all PII — phone hash and encrypted name are overwritten.
    Intake sessions are soft-deleted (symptoms_json cleared).
    Consent revocation is anchored on the blockchain.
    """
    import hashlib, time, secrets as _sec

    # ── Record revocation on blockchain before wiping ──
    ledger = get_ledger()
    ledger.add_consent_revocation(
        patient_hash=current_user.phone_hash,
        reason="user_requested_deletion",
    )

    # ── Anonymise sessions (clear symptom data, keep audit skeleton) ──
    db.query(IntakeSession).filter(
        IntakeSession.patient_id == current_user.id
    ).update({
        "symptoms_json": {},
        "body_location": None,
    })

    # ── Overwrite PII with irreversible random values ──
    current_user.phone_hash = "deleted_" + _sec.token_hex(16)
    current_user.name_encrypted = "DELETED"
    current_user.district = None

    db.commit()
    logger.info("Account deleted for user_id=%s (DPDPA §13)", current_user.id)

    return {"message": "Account and personal data deleted successfully (DPDPA 2023 §13)"}


@router.post("/demo-seed")
def seed_demo_users(db: Session = Depends(get_db)):
    """
    Idempotently create the three demo accounts (patient / asha / doctor).
    Call this once on first run — safe to call multiple times.
    """
    DEMO_USERS = [
        {"name": "Priya Sharma",    "phone": "9000000001", "role": "patient", "lang": "en", "district": "Jaipur"},
        {"name": "Sunita Devi",     "phone": "9000000002", "role": "asha",    "lang": "hi", "district": "Jaipur Rural"},
        {"name": "Dr. Arjun Mehta", "phone": "9000000003", "role": "doctor",  "lang": "en", "district": "Jaipur"},
    ]
    created, skipped = [], []
    for u in DEMO_USERS:
        phone_h = hash_phone(u["phone"])
        if db.query(Patient).filter(Patient.phone_hash == phone_h).first():
            skipped.append(u["role"])
            continue
        patient = Patient(
            phone_hash=phone_h,
            name_encrypted=encrypt_name(u["name"]),
            lang_preference=u["lang"],
            role=u["role"],
            district=u["district"],
            password_hash=hash_password("123456"),
        )
        ledger = get_ledger()
        patient.consent_tx_hash = ledger.add_consent_record(
            patient_hash=phone_h, consent_type="data_storage+ai_triage", lang=u["lang"],
        )
        db.add(patient)
        db.commit()
        created.append(u["role"])
    return {
        "created": created,
        "skipped": skipped,
        "demo_credentials": [
            {"role": "patient", "phone": "9000000001", "otp": "123456", "name": "Priya Sharma"},
            {"role": "asha",    "phone": "9000000002", "otp": "123456", "name": "Sunita Devi"},
            {"role": "doctor",  "phone": "9000000003", "otp": "123456", "name": "Dr. Arjun Mehta"},
        ],
    }
