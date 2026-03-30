"""
VAIDA Configuration — loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import secrets
import logging

logger = logging.getLogger(__name__)

_DEV_JWT_SECRET = "dev-secret-change-in-production"
_DEV_ENCRYPTION_KEY = "dev-key-32-bytes-long-change!!!"


class Settings(BaseSettings):
    """Application settings loaded from .env or environment."""

    # ── General ──
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./vaida.db"

    # ── Auth ──
    JWT_SECRET: str = _DEV_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    JWT_REFRESH_EXPIRY_HOURS: int = 168  # 7 days
    # OTP bypass is ONLY allowed in development; never set True in production
    OTP_BYPASS: bool = True
    OTP_BYPASS_CODE: str = "123456"
    # OTP TTL in seconds
    OTP_TTL_SECONDS: int = 300

    # ── OpenAI ──
    OPENAI_API_KEY: str = ""

    # ── Blockchain ──
    BLOCKCHAIN_ENABLED: bool = True

    # ── Encryption ──
    ENCRYPTION_KEY: str = _DEV_ENCRYPTION_KEY

    # ── External Services ──
    GOOGLE_TTS_KEY: str = ""
    SMS_PROVIDER_KEY: str = ""
    SMS_PROVIDER: str = "twilio"       # "twilio" | "msg91"
    SMS_FROM_NUMBER: str = ""          # Twilio sender number
    JITSI_DOMAIN: str = "meet.jit.si"

    # ── CORS (production only) ──
    # Comma-separated list of allowed frontend origins, e.g. "https://vaida.app,https://www.vaida.app"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── Uploads ──
    UPLOADS_DIR: str = "./uploads"

    # ── MLOps ──
    MLFLOW_TRACKING_URI: str = ""

    # ── Monitoring ──
    SENTRY_DSN: str = ""
    EPI_ALERT_THRESHOLD: int = 15

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def validate_production_secrets(self) -> None:
        """Raise if insecure defaults are used in production."""
        if self.ENVIRONMENT == "production":
            if self.JWT_SECRET == _DEV_JWT_SECRET:
                raise ValueError("JWT_SECRET must be set to a secure random value in production")
            if self.ENCRYPTION_KEY == _DEV_ENCRYPTION_KEY:
                raise ValueError("ENCRYPTION_KEY must be set to a secure random value in production")
            if self.OTP_BYPASS:
                raise ValueError("OTP_BYPASS must be False in production")
            if len(self.JWT_SECRET) < 32:
                raise ValueError("JWT_SECRET must be at least 32 characters")


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    s = Settings()
    if s.ENVIRONMENT == "production":
        s.validate_production_secrets()
    elif s.JWT_SECRET == _DEV_JWT_SECRET:
        logger.warning(
            "Using default dev JWT_SECRET. Set JWT_SECRET in .env for any shared/staging environment."
        )
    return s
