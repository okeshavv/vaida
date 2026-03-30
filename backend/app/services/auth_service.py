"""
VAIDA Auth Service — JWT token management, password hashing, OTP verification.
"""
import hashlib
import logging
import random
import string
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── In-memory OTP store: phone_hash → (code, expires_at) ────────────────────
# Production: replace with Redis (SETEX) for multi-process deployments.
_otp_store: dict[str, tuple[str, float]] = {}


def _get_fernet() -> Fernet:
    """Derive a Fernet key from ENCRYPTION_KEY using SHA-256."""
    import base64
    digest = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()  # 32 bytes
    fernet_key = base64.urlsafe_b64encode(digest)
    return Fernet(fernet_key)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return pwd_context.verify(plain, hashed)


def hash_phone(phone: str) -> str:
    """
    Create a SHA-256 hash of the phone number.
    Phone numbers are NEVER stored in plain text.
    """
    return hashlib.sha256(phone.encode()).hexdigest()


def encrypt_name(name: str) -> str:
    """
    Encrypt patient name using AES-128-CBC via Fernet (symmetric encryption).
    The ENCRYPTION_KEY from settings is used as the key material.
    """
    return _get_fernet().encrypt(name.encode()).decode()


def decrypt_name(encrypted: str) -> str:
    """Decrypt patient name encrypted with Fernet."""
    try:
        return _get_fernet().decrypt(encrypted.encode()).decode()
    except (InvalidToken, Exception) as exc:
        logger.error("Failed to decrypt patient name: %s", exc)
        return "[encrypted]"


def create_access_token(user_id: str, role: str) -> str:
    """Create a JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str, role: str) -> str:
    """Create a JWT refresh token (longer-lived)."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_REFRESH_EXPIRY_HOURS)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Returns payload dict or None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None


def generate_otp(phone: str) -> str:
    """
    Generate a 6-digit OTP, store it with a TTL, and return it.
    Caller is responsible for sending it via SMS.
    """
    code = "".join(random.choices(string.digits, k=6))
    phone_h = hash_phone(phone)
    expires_at = time.monotonic() + settings.OTP_TTL_SECONDS
    _otp_store[phone_h] = (code, expires_at)
    logger.info("OTP generated for phone hash %s (TTL %ds)", phone_h[:8], settings.OTP_TTL_SECONDS)
    return code


def verify_otp(phone: str, otp: str) -> bool:
    """
    Verify OTP for phone login.
    - Dev mode (OTP_BYPASS=True): also accepts the bypass code.
    - Production: verifies against the in-memory OTP store (or SMS provider).
    """
    if settings.OTP_BYPASS and otp == settings.OTP_BYPASS_CODE:
        return True

    phone_h = hash_phone(phone)
    entry = _otp_store.get(phone_h)
    if entry is None:
        return False

    stored_code, expires_at = entry
    if time.monotonic() > expires_at:
        # Expired — clean up
        _otp_store.pop(phone_h, None)
        return False

    if stored_code != otp:
        return False

    # Single-use: remove after successful verification
    _otp_store.pop(phone_h, None)
    return True
