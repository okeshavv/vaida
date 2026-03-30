"""
VAIDA Triage Tests — 17 test cases covering AI classification,
RED overrides, confidence gating, guidance, feedback, and blockchain audit.
"""
import pytest


class TestTriageClassification:
    """POST /triage tests."""

    @pytest.mark.triage
    def test_triage_returns_urgency(self, client, patient_headers, intake_session):
        """Triage returns a valid urgency level."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
        }, headers=patient_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["urgency"] in ("GREEN", "AMBER", "RED")
        assert 0 <= data["confidence"] <= 1
        assert data["model_version"]

    @pytest.mark.triage
    def test_triage_returns_differential(self, client, patient_headers, intake_session):
        """Triage returns differential diagnosis."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
        }, headers=patient_headers)
        data = resp.json()
        assert isinstance(data["differential"], list)
        assert len(data["differential"]) >= 1
        assert "condition" in data["differential"][0]
        assert "probability" in data["differential"][0]

    @pytest.mark.triage
    def test_triage_creates_blockchain_audit(self, client, patient_headers, intake_session):
        """Every triage decision is logged on the blockchain."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
        }, headers=patient_headers)
        data = resp.json()
        assert data["audit_tx_hash"]
        assert data["audit_tx_hash"].startswith("0x")

    @pytest.mark.triage
    def test_triage_invalid_session_fails(self, client, patient_headers):
        """Triage for non-existent session returns 404."""
        resp = client.post("/triage", json={
            "session_id": "non-existent-id",
        }, headers=patient_headers)
        assert resp.status_code == 404


class TestRedFlagOverrides:
    """RED flag hard override tests — the most safety-critical tests."""

    @pytest.mark.triage
    def test_red_override_chest_pain_sweat(self, client, patient_headers, intake_session):
        """Chest pain + sweating → always RED (bypass ML)."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "severe chest pain with sweating",
                "body_location": "chest",
                "symptom_character": ["sharp"],
                "severity_1_10": 9,
                "associated_symptoms": ["sweating", "nausea"],
                "red_flag_features": {
                    "chest_pain_sweat": True,
                    "facial_droop": False,
                    "loss_of_consciousness": False,
                    "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)
        data = resp.json()
        assert data["urgency"] == "RED"
        assert data["rule_override"] is True
        assert data["confidence"] == 1.0

    @pytest.mark.triage
    def test_red_override_facial_droop(self, client, patient_headers, intake_session):
        """Facial droop (stroke sign) → always RED."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "face drooping on one side",
                "body_location": "face",
                "symptom_character": [],
                "severity_1_10": 7,
                "associated_symptoms": ["speech difficulty"],
                "red_flag_features": {
                    "chest_pain_sweat": False,
                    "facial_droop": True,
                    "loss_of_consciousness": False,
                    "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)
        assert resp.json()["urgency"] == "RED"
        assert resp.json()["rule_override"] is True

    @pytest.mark.triage
    def test_red_override_loss_consciousness(self, client, patient_headers, intake_session):
        """Loss of consciousness → always RED."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "patient fainted",
                "body_location": "head",
                "symptom_character": [],
                "severity_1_10": 8,
                "associated_symptoms": [],
                "red_flag_features": {
                    "chest_pain_sweat": False,
                    "facial_droop": False,
                    "loss_of_consciousness": True,
                    "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)
        assert resp.json()["urgency"] == "RED"

    @pytest.mark.triage
    def test_red_override_child_breathing(self, client, patient_headers, intake_session):
        """Child breathing distress → always RED."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "infant having difficulty breathing",
                "body_location": "chest",
                "symptom_character": [],
                "severity_1_10": 9,
                "associated_symptoms": ["wheezing"],
                "red_flag_features": {
                    "chest_pain_sweat": False,
                    "facial_droop": False,
                    "loss_of_consciousness": False,
                    "child_breathing_distress": True,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)
        assert resp.json()["urgency"] == "RED"

    @pytest.mark.triage
    def test_red_override_sudden_headache(self, client, patient_headers, intake_session):
        """Sudden severe headache → always RED."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "worst headache of my life, sudden onset",
                "body_location": "head",
                "symptom_character": ["stabbing"],
                "severity_1_10": 10,
                "associated_symptoms": ["nausea"],
                "red_flag_features": {
                    "chest_pain_sweat": False,
                    "facial_droop": False,
                    "loss_of_consciousness": False,
                    "child_breathing_distress": False,
                    "sudden_severe_headache": True,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)
        assert resp.json()["urgency"] == "RED"

    @pytest.mark.triage
    def test_multiple_red_flags_still_red(self, client, patient_headers, intake_session):
        """Multiple red flags together → still RED (not ERROR or crash)."""
        resp = client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "chest pain, face drooping, unconscious",
                "body_location": "chest",
                "symptom_character": ["sharp"],
                "severity_1_10": 10,
                "associated_symptoms": [],
                "red_flag_features": {
                    "chest_pain_sweat": True,
                    "facial_droop": True,
                    "loss_of_consciousness": True,
                    "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)
        assert resp.json()["urgency"] == "RED"
        assert resp.json()["confidence"] == 1.0


class TestTriageResults:
    """GET /triage/{session_id}/result tests."""

    @pytest.mark.triage
    def test_triage_result_has_guidance(self, client, patient_headers, intake_session):
        """Triage result includes patient-facing guidance."""
        # First run triage
        client.post("/triage", json={"session_id": intake_session}, headers=patient_headers)
        # Then get result
        resp = client.get(f"/triage/{intake_session}/result", headers=patient_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["guidance_text"]
        assert len(data["guidance_text"]) > 20

    @pytest.mark.triage
    def test_triage_result_includes_disclaimer(self, client, patient_headers, intake_session):
        """Guidance always includes 'AI guidance' disclaimer."""
        client.post("/triage", json={"session_id": intake_session}, headers=patient_headers)
        resp = client.get(f"/triage/{intake_session}/result", headers=patient_headers)
        assert "AI guidance" in resp.json()["guidance_text"]

    @pytest.mark.triage
    def test_triage_result_not_found(self, client, patient_headers):
        """Triage result for non-triaged session returns 404."""
        resp = client.get("/triage/non-existent/result", headers=patient_headers)
        assert resp.status_code == 404


class TestTriageFeedback:
    """POST /triage/feedback tests."""

    @pytest.mark.triage
    def test_doctor_feedback_success(self, client, doctor_headers, patient_headers, intake_session):
        """Doctor can submit triage feedback for MLOps."""
        # Run triage first
        client.post("/triage", json={"session_id": intake_session}, headers=patient_headers)
        # Doctor submits feedback
        resp = client.post("/triage/feedback", json={
            "session_id": intake_session,
            "doctor_urgency": "AMBER",
            "notes": "AI was correct, patient needs follow-up",
        }, headers=doctor_headers)
        assert resp.status_code == 200
        assert "Feedback recorded" in resp.json()["message"]

    @pytest.mark.triage
    def test_patient_cannot_submit_feedback(self, client, patient_headers, intake_session):
        """Patients cannot submit triage feedback (doctor only)."""
        client.post("/triage", json={"session_id": intake_session}, headers=patient_headers)
        resp = client.post("/triage/feedback", json={
            "session_id": intake_session,
            "doctor_urgency": "GREEN",
        }, headers=patient_headers)
        assert resp.status_code == 403
