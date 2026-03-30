"""
VAIDA Auth API — /auth/* endpoints.
Registration, login (OTP), token refresh, consent recording.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Patient
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    RefreshRequest, RefreshResponse,
    ConsentRequest, ConsentResponse,
)
from app.services.auth_service import (
    hash_password, hash_phone, encrypt_name,
    create_access_token, create_refresh_token,
    decode_token, verify_otp,
)
from app.blockchain.ledger import get_ledger
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new patient, ASHA worker, or doctor."""
    # ── Consent is mandatory ──
    if not req.consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent is required for registration (DPDPA 2023)",
        )

    # ── Check duplicate phone ──
    phone_h = hash_phone(req.phone)
    existing = db.query(Patient).filter(Patient.phone_hash == phone_h).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    # ── Validate role ──
    if req.role not in ("patient", "asha", "doctor"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be: patient, asha, or doctor",
        )

    # ── Create user ──
    user = Patient(
        phone_hash=phone_h,
        name_encrypted=encrypt_name(req.name),
        lang_preference=req.lang,
        role=req.role,
        district=req.district,
        password_hash=hash_password(req.password),
    )

    # ── Record consent on blockchain ──
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

    return RegisterResponse(
        user_id=user.id,
        token=token,
        message=f"Registration successful. Consent recorded: {consent_tx[:20]}...",
    )


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Phone + OTP login."""
    phone_h = hash_phone(req.phone)
    user = db.query(Patient).filter(Patient.phone_hash == phone_h).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # ── Verify OTP ──
    if not verify_otp(req.phone, req.otp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )

    access = create_access_token(user.id, user.role)
    refresh = create_refresh_token(user.id, user.role)

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


@router.post("/demo-seed")
def seed_demo_users(db: Session = Depends(get_db)):
    """
    Idempotently create the three demo accounts (patient / asha / doctor).
    Call this once on first run — safe to call multiple times.
    """
    DEMO_USERS = [
        {"name": "Priya Sharma",   "phone": "9000000001", "role": "patient", "lang": "en", "district": "Jaipur"},
        {"name": "Sunita Devi",    "phone": "9000000002", "role": "asha",    "lang": "hi", "district": "Jaipur Rural"},
        {"name": "Dr. Arjun Mehta","phone": "9000000003", "role": "doctor",  "lang": "en", "district": "Jaipur"},
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
