"""
VAIDA Backend — FastAPI Application Entry Point.

Endpoints:
  /auth/*    — Registration, login, consent
  /intake/*  — Symptom intake, voice upload, offline sync
  /triage/*  — AI triage classification
  /image/*   — GPT-4o Vision image analysis
  /brief/*   — Doctor pre-brief (PDF, FHIR, JSON)
  /consult/* — Jitsi teleconsultation
  /epi/*     — Epidemiological surveillance

Run: uvicorn app.main:app --reload
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.database import create_tables
from app.api import auth, intake, triage, vision, brief, consult, epi
from app.config import get_settings

_settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="VAIDA Backend API",
    description="Voice AI Diagnostic Assistant — Rural Healthcare Triage Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──
# In development: allow all origins so any localhost port works (Vite hot-reload, etc.)
# In production: restrict to explicit frontend domain(s) via ALLOWED_ORIGINS env var.
if _settings.ENVIRONMENT == "production":
    _allowed_origins = [o.strip() for o in _settings.ALLOWED_ORIGINS.split(",") if o.strip()]
else:
    _allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=_allowed_origins != ["*"],  # credentials forbidden with wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register all routers under /api/v1 ──
V1 = "/api/v1"
app.include_router(auth.router, prefix=V1)
app.include_router(intake.router, prefix=V1)
app.include_router(triage.router, prefix=V1)
app.include_router(vision.router, prefix=V1)
app.include_router(brief.router, prefix=V1)
app.include_router(consult.router, prefix=V1)
app.include_router(epi.router, prefix=V1)


@app.on_event("startup")
def on_startup():
    """Create tables and required directories on startup."""
    from pathlib import Path
    from app.config import get_settings
    create_tables()
    # Ensure uploads directory exists
    Path(get_settings().UPLOADS_DIR).mkdir(parents=True, exist_ok=True)


@app.get("/health", tags=["System"])
def health_check():
    """Health check endpoint for CI/CD smoke tests."""
    return {
        "status": "healthy",
        "service": "vaida-backend",
        "version": "1.0.0",
    }


@app.get("/", tags=["System"])
def root():
    return {
        "message": "VAIDA Backend API — Rural Healthcare Triage Platform",
        "docs": "/docs",
        "health": "/health",
    }
