"""
VAIDA Auth Service — JWT token management, password hashing, OTP verification.
"""
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
    Encrypt patient name for storage.
    In production: use AES-256 with ENCRYPTION_KEY.
    For hackathon: simple reversible encoding.
    """
    # Production: use cryptography.fernet or AES-256-GCM
    # Hackathon shortcut: base64 encode (NOT secure, placeholder only)
    import base64
    return base64.b64encode(name.encode()).decode()


def decrypt_name(encrypted: str) -> str:
    """Decrypt patient name."""
    import base64
    return base64.b64decode(encrypted.encode()).decode()


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


def verify_otp(phone: str, otp: str) -> bool:
    """
    Verify OTP for phone login.
    In production: verify against Twilio/MSG91 OTP service.
    In dev mode: accept bypass code.
    """
    if settings.OTP_BYPASS and otp == settings.OTP_BYPASS_CODE:
        return True
    # Production: call SMS provider API to verify
    return False
