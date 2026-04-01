"""
VAIDA Consult Tests — 6 test cases for teleconsultation lifecycle.
"""
import pytest


class TestConsultInitiation:
    """POST /consult/initiate tests."""

    @pytest.mark.consult
    def test_initiate_creates_jitsi_room(self, client, patient_headers, doctor_headers,
                                         registered_doctor, intake_session):
        """Initiating consult creates a Jitsi room URL."""
        doctor_data, _ = registered_doctor
        resp = client.post("/consult/initiate", json={
            "session_id": intake_session,
            "doctor_id": doctor_data["user_id"],
        }, headers=patient_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "jit.si" in data["jitsi_room_url"].lower() or "jitsi" in data["jitsi_room_url"].lower()
        assert "vaida-" in data["jitsi_room_url"]
        assert data["brief_link"]

    @pytest.mark.consult
    def test_initiate_returns_brief_link(self, client, patient_headers, doctor_headers,
                                         registered_doctor, intake_session):
        """Consult initiation includes link to the brief."""
        doctor_data, _ = registered_doctor
        resp = client.post("/consult/initiate", json={
            "session_id": intake_session,
            "doctor_id": doctor_data["user_id"],
        }, headers=patient_headers)
        assert f"/brief/{intake_session}" in resp.json()["brief_link"]


class TestConsultCompletion:
    """PUT /consult/{id}/complete tests."""

    @pytest.mark.consult
    def test_complete_consult_stores_outcome(self, client, patient_headers, doctor_headers,
                                              registered_doctor, intake_session):
        """Doctor can complete a consult with diagnosis."""
        doctor_data, _ = registered_doctor
        init_resp = client.post("/consult/initiate", json={
            "session_id": intake_session,
            "doctor_id": doctor_data["user_id"],
        }, headers=patient_headers)
        consult_id = init_resp.json()["consult_id"]

        resp = client.put(f"/consult/{consult_id}/complete", json={
            "diagnosis": "Tension headache",
            "prescription": "Paracetamol 500mg",
            "follow_up": "Review in 1 week if symptoms persist",
        }, headers=doctor_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "done"

    @pytest.mark.consult
    def test_complete_requires_doctor_role(self, client, patient_headers,
                                            registered_doctor, intake_session):
        """Patients cannot complete consultations."""
        doctor_data, _ = registered_doctor
        init_resp = client.post("/consult/initiate", json={
            "session_id": intake_session,
            "doctor_id": doctor_data["user_id"],
        }, headers=patient_headers)
        consult_id = init_resp.json()["consult_id"]

        resp = client.put(f"/consult/{consult_id}/complete", json={
            "diagnosis": "Self-diagnosis",
        }, headers=patient_headers)
        assert resp.status_code == 403

    @pytest.mark.consult
    def test_complete_invalid_id_fails(self, client, doctor_headers):
        """Completing non-existent consult returns 404."""
        resp = client.put("/consult/nonexistent/complete", json={
            "diagnosis": "test",
        }, headers=doctor_headers)
        assert resp.status_code == 404

    @pytest.mark.consult
    def test_complete_already_done_fails(self, client, patient_headers, doctor_headers,
                                          registered_doctor, intake_session):
        """Cannot complete a consult twice."""
        doctor_data, _ = registered_doctor
        init_resp = client.post("/consult/initiate", json={
            "session_id": intake_session,
            "doctor_id": doctor_data["user_id"],
        }, headers=patient_headers)
        consult_id = init_resp.json()["consult_id"]

        # Complete once
        client.put(f"/consult/{consult_id}/complete", json={
            "diagnosis": "Migraine",
        }, headers=doctor_headers)
        # Try again
        resp = client.put(f"/consult/{consult_id}/complete", json={
            "diagnosis": "Different diagnosis",
        }, headers=doctor_headers)
        assert resp.status_code == 400
