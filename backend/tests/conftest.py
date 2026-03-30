"""
VAIDA Test Configuration — Shared fixtures for all test modules.
Sets up an in-memory SQLite database and authenticated test clients.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── Override settings BEFORE importing app ──
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret-key-for-testing-only"
os.environ["ENVIRONMENT"] = "testing"
os.environ["OTP_BYPASS"] = "true"
os.environ["OTP_BYPASS_CODE"] = "123456"
os.environ["BLOCKCHAIN_ENABLED"] = "true"

from app.database import Base, get_db
from app.main import app
from app.blockchain.ledger import reset_ledger


# ── In-memory test database ──
TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ═══════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════

@pytest.fixture(autouse=True)
def setup_db():
    """Create fresh tables for every test, tear down after."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    reset_ledger()
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture
def client():
    """Unauthenticated test client."""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Direct DB session for test data setup."""
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def registered_patient(client):
    """Register a patient and return (user_data, token)."""
    resp = client.post("/auth/register", json={
        "name": "Test Patient",
        "phone": "9876543210",
        "password": "secure123",
        "role": "patient",
        "lang": "en",
        "consent": True,
        "district": "Jaipur",
    })
    assert resp.status_code == 201
    data = resp.json()
    return data, data["token"]


@pytest.fixture
def patient_headers(registered_patient):
    """Auth headers for a patient."""
    _, token = registered_patient
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def registered_doctor(client):
    """Register a doctor and return (user_data, token)."""
    resp = client.post("/auth/register", json={
        "name": "Dr. Sharma",
        "phone": "9876543211",
        "password": "doctor123",
        "role": "doctor",
        "lang": "en",
        "consent": True,
        "district": "Jaipur",
    })
    assert resp.status_code == 201
    data = resp.json()
    return data, data["token"]


@pytest.fixture
def doctor_headers(registered_doctor):
    """Auth headers for a doctor."""
    _, token = registered_doctor
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def registered_asha(client):
    """Register an ASHA worker and return (user_data, token)."""
    resp = client.post("/auth/register", json={
        "name": "ASHA Devi",
        "phone": "9876543212",
        "password": "asha1234",
        "role": "asha",
        "lang": "hi",
        "consent": True,
        "district": "Jaipur",
    })
    assert resp.status_code == 201
    data = resp.json()
    return data, data["token"]


@pytest.fixture
def asha_headers(registered_asha):
    """Auth headers for an ASHA worker."""
    _, token = registered_asha
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def intake_session(client, patient_headers, registered_patient):
    """Create a patient intake session. Returns session_id."""
    patient_data, _ = registered_patient
    resp = client.post("/intake", json={
        "patient_id": patient_data["user_id"],
        "symptoms": ["headache", "fever", "fatigue"],
        "body_location": "head",
        "duration": 48,
        "severity": 6,
        "lang": "en",
        "source": "mixed",
    }, headers=patient_headers)
    assert resp.status_code == 201
    return resp.json()["session_id"]


@pytest.fixture
def triage_result(client, patient_headers, intake_session):
    """Run triage on an intake session. Returns triage response."""
    resp = client.post("/triage", json={
        "session_id": intake_session,
    }, headers=patient_headers)
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def red_intake_session(client, patient_headers, registered_patient):
    """Create an intake session with RED flag symptoms."""
    patient_data, _ = registered_patient
    resp = client.post("/intake", json={
        "patient_id": patient_data["user_id"],
        "voice_transcript": "I have severe chest pain and I am sweating a lot",
        "symptoms": ["chest pain", "sweating", "shortness of breath"],
        "body_location": "chest",
        "duration": 1,
        "severity": 9,
        "lang": "en",
        "source": "voice",
    }, headers=patient_headers)
    assert resp.status_code == 201
    return resp.json()["session_id"]
