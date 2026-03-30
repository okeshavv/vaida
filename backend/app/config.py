"""
VAIDA Configuration — loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from .env or environment."""

    # ── General ──
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./vaida.db"

    # ── Auth ──
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    JWT_REFRESH_EXPIRY_HOURS: int = 168  # 7 days
    OTP_BYPASS: bool = True
    OTP_BYPASS_CODE: str = "123456"

    # ── OpenAI ──
    OPENAI_API_KEY: str = ""

    # ── Blockchain ──
    BLOCKCHAIN_ENABLED: bool = True

    # ── Encryption ──
    ENCRYPTION_KEY: str = "dev-key-32-bytes-long-change!!!"

    # ── External Services ──
    GOOGLE_TTS_KEY: str = ""
    SMS_PROVIDER_KEY: str = ""
    JITSI_DOMAIN: str = "meet.jit.si"

    # ── MLOps ──
    MLFLOW_TRACKING_URI: str = ""

    # ── Monitoring ──
    SENTRY_DSN: str = ""
    EPI_ALERT_THRESHOLD: int = 15

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
