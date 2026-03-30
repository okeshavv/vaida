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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_tables
from app.api import auth, intake, triage, vision, brief, consult, epi

app = FastAPI(
    title="VAIDA Backend API",
    description="Voice AI Diagnostic Assistant — Rural Healthcare Triage Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
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
    """Create tables on startup (dev/test only — production uses Alembic)."""
    create_tables()


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
