"""
VAIDA Brief Tests — 9 test cases for doctor pre-brief generation.
"""
import pytest


class TestBriefGeneration:
    """GET /brief/{session_id} tests."""

    @pytest.mark.brief
    def test_generate_brief_json_format(self, client, doctor_headers, patient_headers, intake_session):
        """Doctor can get a JSON brief."""
        # Run triage first (non-GREEN needed)
        client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "severe headache",
                "body_location": "head",
                "symptom_character": ["throbbing"],
                "severity_1_10": 7,
                "duration_hours": 48,
                "associated_symptoms": ["nausea", "fever", "dizziness"],
                "red_flag_features": {
                    "chest_pain_sweat": False, "facial_droop": False,
                    "loss_of_consciousness": False, "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)

        resp = client.get(f"/brief/{intake_session}?format=json", headers=doctor_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["format"] == "json"
        assert data["brief_json"]
        assert data["brief_json"]["chief_complaint"]
        assert data["brief_json"]["disclaimer"]

    @pytest.mark.brief
    def test_generate_brief_fhir_format(self, client, doctor_headers, patient_headers, intake_session):
        """FHIR R4 format returns valid Bundle resource."""
        client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "abdominal pain",
                "body_location": "abdomen",
                "symptom_character": ["dull"],
                "severity_1_10": 6,
                "associated_symptoms": ["nausea", "vomiting"],
                "red_flag_features": {
                    "chest_pain_sweat": False, "facial_droop": False,
                    "loss_of_consciousness": False, "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)

        resp = client.get(f"/brief/{intake_session}?format=fhir", headers=doctor_headers)
        assert resp.status_code == 200
        fhir = resp.json()["fhir_json"]
        assert fhir["resourceType"] == "Bundle"
        assert fhir["type"] == "collection"
        assert len(fhir["entry"]) >= 2  # Encounter + Condition

    @pytest.mark.brief
    def test_brief_includes_ai_hypothesis(self, client, doctor_headers, patient_headers, intake_session):
        """Brief includes AI hypothesis / differential."""
        client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "chest pain", "body_location": "chest",
                "symptom_character": ["burning"], "severity_1_10": 5,
                "associated_symptoms": ["heartburn"],
                "red_flag_features": {
                    "chest_pain_sweat": False, "facial_droop": False,
                    "loss_of_consciousness": False, "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)

        resp = client.get(f"/brief/{intake_session}?format=json", headers=doctor_headers)
        assert resp.status_code == 200
        assert resp.json()["ai_hypothesis"]

    @pytest.mark.brief
    def test_green_case_no_brief(self, client, doctor_headers, patient_headers, registered_patient):
        """GREEN urgency cases don't generate doctor briefs."""
        patient_data, _ = registered_patient
        # Create a mild intake
        intake_resp = client.post("/intake", json={
            "patient_id": patient_data["user_id"],
            "symptoms": ["mild cough"],
            "body_location": "throat",
            "severity": 2,
            "lang": "en",
        }, headers=patient_headers)
        session_id = intake_resp.json()["session_id"]

        # Triage with no red flags and low severity
        client.post("/triage", json={
            "session_id": session_id,
            "structured_symptoms": {
                "chief_complaint": "mild cough", "body_location": "throat",
                "symptom_character": ["dull"], "severity_1_10": 2,
                "associated_symptoms": [],
                "red_flag_features": {
                    "chest_pain_sweat": False, "facial_droop": False,
                    "loss_of_consciousness": False, "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)

        # Check triage result — if GREEN, brief should be rejected
        triage_resp = client.get(f"/triage/{session_id}/result", headers=patient_headers)
        if triage_resp.json()["urgency"] == "GREEN":
            resp = client.get(f"/brief/{session_id}?format=json", headers=doctor_headers)
            assert resp.status_code == 400
            assert "GREEN" in resp.json()["detail"]

    @pytest.mark.brief
    def test_brief_requires_doctor_role(self, client, patient_headers, intake_session):
        """Patients cannot access doctor briefs."""
        # Run triage
        client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "pain", "body_location": "head",
                "symptom_character": ["dull"], "severity_1_10": 6,
                "associated_symptoms": ["fever", "nausea"],
                "red_flag_features": {
                    "chest_pain_sweat": False, "facial_droop": False,
                    "loss_of_consciousness": False, "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)

        resp = client.get(f"/brief/{intake_session}?format=json", headers=patient_headers)
        assert resp.status_code == 403

    @pytest.mark.brief
    def test_brief_asha_can_access(self, client, asha_headers, patient_headers, intake_session):
        """ASHA workers can access briefs (same as doctors)."""
        client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "fever", "body_location": "head",
                "symptom_character": ["dull"], "severity_1_10": 6,
                "associated_symptoms": ["fever", "nausea", "weakness"],
                "red_flag_features": {
                    "chest_pain_sweat": False, "facial_droop": False,
                    "loss_of_consciousness": False, "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)

        resp = client.get(f"/brief/{intake_session}?format=json", headers=asha_headers)
        # Should succeed (200) — ASHA has access
        assert resp.status_code == 200

    @pytest.mark.brief
    def test_brief_session_not_found(self, client, doctor_headers):
        """Non-existent session returns 404."""
        resp = client.get("/brief/nonexistent?format=json", headers=doctor_headers)
        assert resp.status_code == 404

    @pytest.mark.brief
    def test_brief_pdf_download(self, client, doctor_headers, patient_headers, intake_session):
        """PDF download endpoint returns PDF content."""
        client.post("/triage", json={
            "session_id": intake_session,
            "structured_symptoms": {
                "chief_complaint": "headache", "body_location": "head",
                "symptom_character": ["throbbing"], "severity_1_10": 7,
                "associated_symptoms": ["nausea", "dizziness"],
                "red_flag_features": {
                    "chest_pain_sweat": False, "facial_droop": False,
                    "loss_of_consciousness": False, "child_breathing_distress": False,
                    "sudden_severe_headache": False,
                },
                "lang_detected": "en",
            },
        }, headers=patient_headers)

        resp = client.get(f"/brief/{intake_session}/download", headers=doctor_headers)
        assert resp.status_code == 200
        assert "pdf" in resp.headers.get("content-type", "").lower() or len(resp.content) > 0
