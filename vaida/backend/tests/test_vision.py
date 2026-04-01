"""
VAIDA Vision Tests — 10 test cases for image analysis.
"""
import pytest
import io


class TestImageAnalysis:
    """POST /image/analyse tests."""

    @pytest.mark.vision
    def test_analyse_wound_success(self, client, patient_headers, intake_session):
        """Wound image analysis returns findings."""
        resp = client.post("/image/analyse",
            data={"session_id": intake_session, "image_type": "wound"},
            files={"image": ("wound.jpg", b"fake jpeg data", "image/jpeg")},
            headers=patient_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["image_id"]
        assert data["findings"]
        assert data["diagnosis_category"]
        assert data["urgency_indicator"] in ("low", "medium", "high")
        assert data["specialist_type"]

    @pytest.mark.vision
    def test_analyse_rash_success(self, client, patient_headers, intake_session):
        resp = client.post("/image/analyse",
            data={"session_id": intake_session, "image_type": "rash"},
            files={"image": ("rash.jpg", b"fake data", "image/jpeg")},
            headers=patient_headers,
        )
        assert resp.status_code == 201
        assert "Dermatologist" in resp.json()["specialist_type"]

    @pytest.mark.vision
    def test_analyse_eye_success(self, client, patient_headers, intake_session):
        resp = client.post("/image/analyse",
            data={"session_id": intake_session, "image_type": "eye"},
            files={"image": ("eye.jpg", b"fake data", "image/jpeg")},
            headers=patient_headers,
        )
        assert resp.status_code == 201
        assert "Ophthalmologist" in resp.json()["specialist_type"]

    @pytest.mark.vision
    def test_analyse_skin_success(self, client, patient_headers, intake_session):
        resp = client.post("/image/analyse",
            data={"session_id": intake_session, "image_type": "skin"},
            files={"image": ("skin.jpg", b"fake data", "image/jpeg")},
            headers=patient_headers,
        )
        assert resp.status_code == 201

    @pytest.mark.vision
    def test_analyse_invalid_type_fails(self, client, patient_headers, intake_session):
        """Invalid image type is rejected."""
        resp = client.post("/image/analyse",
            data={"session_id": intake_session, "image_type": "xray"},
            files={"image": ("test.jpg", b"fake", "image/jpeg")},
            headers=patient_headers,
        )
        assert resp.status_code == 400
        assert "Invalid image_type" in resp.json()["detail"]

    @pytest.mark.vision
    def test_analyse_empty_image_fails(self, client, patient_headers, intake_session):
        """Empty image file is rejected."""
        resp = client.post("/image/analyse",
            data={"session_id": intake_session, "image_type": "wound"},
            files={"image": ("empty.jpg", b"", "image/jpeg")},
            headers=patient_headers,
        )
        assert resp.status_code == 400

    @pytest.mark.vision
    def test_analyse_invalid_session_fails(self, client, patient_headers):
        """Image analysis with non-existent session fails."""
        resp = client.post("/image/analyse",
            data={"session_id": "nonexistent", "image_type": "wound"},
            files={"image": ("test.jpg", b"data", "image/jpeg")},
            headers=patient_headers,
        )
        assert resp.status_code == 404

    @pytest.mark.vision
    def test_analyse_returns_patient_message(self, client, patient_headers, intake_session):
        """Response includes a patient-friendly message."""
        resp = client.post("/image/analyse",
            data={"session_id": intake_session, "image_type": "wound"},
            files={"image": ("test.jpg", b"data", "image/jpeg")},
            headers=patient_headers,
        )
        assert "doctor" in resp.json()["patient_message"].lower()

    @pytest.mark.vision
    def test_get_image_analysis_by_id(self, client, patient_headers, intake_session):
        """Can retrieve image analysis by ID."""
        # Create analysis first
        create_resp = client.post("/image/analyse",
            data={"session_id": intake_session, "image_type": "rash"},
            files={"image": ("rash.jpg", b"data", "image/jpeg")},
            headers=patient_headers,
        )
        image_id = create_resp.json()["image_id"]

        resp = client.get(f"/image/{image_id}", headers=patient_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == image_id

    @pytest.mark.vision
    def test_get_image_not_found(self, client, patient_headers):
        """Non-existent image analysis returns 404."""
        resp = client.get("/image/nonexistent", headers=patient_headers)
        assert resp.status_code == 404
