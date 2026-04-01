"""
VAIDA Intake Tests — 15 test cases covering symptom submission,
voice upload, session retrieval, patient isolation, and offline sync.
"""
import pytest
import uuid


class TestIntakeSubmission:
    """POST /intake tests."""

    @pytest.mark.intake
    def test_submit_intake_voice_success(self, client, patient_headers, registered_patient):
        """Voice-based intake creates a session."""
        patient_data, _ = registered_patient
        resp = client.post("/intake", json={
            "patient_id": patient_data["user_id"],
            "voice_transcript": "Mujhe sir mein bahut dard hai aur bukhar hai 2 din se",
            "symptoms": ["headache", "fever"],
            "body_location": "head",
            "duration": 48,
            "severity": 7,
            "lang": "hi",
            "source": "voice",
        }, headers=patient_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["session_id"]
        assert data["structured_symptoms"]["chief_complaint"]
        assert data["structured_symptoms"]["body_location"] == "head"

    @pytest.mark.intake
    def test_submit_intake_icon_success(self, client, patient_headers, registered_patient):
        """Icon-based intake (no voice) creates a session."""
        patient_data, _ = registered_patient
        resp = client.post("/intake", json={
            "patient_id": patient_data["user_id"],
            "symptoms": ["stomach pain", "nausea", "vomiting"],
            "body_location": "abdomen",
            "severity": 5,
            "lang": "en",
            "source": "icon",
        }, headers=patient_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["structured_symptoms"]["body_location"] == "abdomen"
        assert "nausea" in str(data["structured_symptoms"])

    @pytest.mark.intake
    def test_submit_intake_mixed_success(self, client, patient_headers, registered_patient):
        """Mixed input (voice + icons) creates a session."""
        patient_data, _ = registered_patient
        resp = client.post("/intake", json={
            "patient_id": patient_data["user_id"],
            "voice_transcript": "burning pain in my chest",
            "symptoms": ["chest pain", "burning"],
            "body_location": "chest",
            "duration": 3,
            "severity": 8,
            "lang": "en",
            "source": "mixed",
        }, headers=patient_headers)
        assert resp.status_code == 201

    @pytest.mark.intake
    def test_submit_intake_missing_symptoms_fails(self, client, patient_headers, registered_patient):
        """Intake with no symptoms is rejected."""
        patient_data, _ = registered_patient
        resp = client.post("/intake", json={
            "patient_id": patient_data["user_id"],
            "symptoms": [],  # empty
            "lang": "en",
        }, headers=patient_headers)
        assert resp.status_code == 422  # Pydantic validation (min_length=1)

    @pytest.mark.intake
    def test_submit_intake_extracts_structured_symptoms(self, client, patient_headers, registered_patient):
        """NLP engine extracts structured symptoms from free text."""
        patient_data, _ = registered_patient
        resp = client.post("/intake", json={
            "patient_id": patient_data["user_id"],
            "voice_transcript": "I have a sharp headache for 3 days with fever and dizziness",
            "symptoms": ["sharp headache", "fever", "dizziness"],
            "body_location": "head",
            "lang": "en",
            "source": "voice",
        }, headers=patient_headers)
        assert resp.status_code == 201
        symptoms = resp.json()["structured_symptoms"]
        assert "sharp" in symptoms["symptom_character"]
        assert symptoms["lang_detected"]

    @pytest.mark.intake
    def test_submit_intake_hindi_detection(self, client, patient_headers, registered_patient):
        """NLP detects Hindi language from input."""
        patient_data, _ = registered_patient
        resp = client.post("/intake", json={
            "patient_id": patient_data["user_id"],
            "voice_transcript": "Mujhe pet mein bahut dard hai aur bukhar hai",
            "symptoms": ["pet dard", "bukhar"],
            "lang": "hi",
            "source": "voice",
        }, headers=patient_headers)
        assert resp.status_code == 201
        assert resp.json()["structured_symptoms"]["lang_detected"] == "hi"

    @pytest.mark.intake
    def test_intake_requires_auth(self, client):
        """Intake without auth token fails."""
        resp = client.post("/intake", json={
            "patient_id": "fake",
            "symptoms": ["headache"],
        })
        assert resp.status_code == 403


class TestSessionRetrieval:
    """GET /intake/{session_id} tests."""

    @pytest.mark.intake
    def test_get_session_by_id(self, client, patient_headers, intake_session):
        """Can retrieve an intake session by ID."""
        resp = client.get(f"/intake/{intake_session}", headers=patient_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == intake_session
        assert data["symptoms_json"]

    @pytest.mark.intake
    def test_get_session_not_found(self, client, patient_headers):
        """Non-existent session returns 404."""
        resp = client.get(f"/intake/{uuid.uuid4()}", headers=patient_headers)
        assert resp.status_code == 404

    @pytest.mark.intake
    def test_patient_isolation(self, client, intake_session):
        """Patient A cannot see Patient B's session."""
        # Register a second patient
        resp = client.post("/auth/register", json={
            "name": "Other Patient",
            "phone": "8888800001",
            "password": "other123",
            "role": "patient",
            "lang": "en",
            "consent": True,
        })
        other_token = resp.json()["token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # Try to access first patient's session
        resp = client.get(f"/intake/{intake_session}", headers=other_headers)
        assert resp.status_code == 403


class TestVoiceUpload:
    """POST /intake/voice tests."""

    @pytest.mark.intake
    def test_voice_upload_returns_transcript(self, client, patient_headers):
        """Voice upload returns a transcript."""
        # Create a minimal audio file (mock)
        resp = client.post("/intake/voice",
            data={"lang_hint": "en"},
            files={"audio_blob": ("audio.wav", b"fake audio data", "audio/wav")},
            headers=patient_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "transcript" in data
        assert "detected_lang" in data

    @pytest.mark.intake
    def test_voice_upload_empty_file_fails(self, client, patient_headers):
        """Empty audio file is rejected."""
        resp = client.post("/intake/voice",
            data={"lang_hint": "en"},
            files={"audio_blob": ("audio.wav", b"", "audio/wav")},
            headers=patient_headers,
        )
        assert resp.status_code == 400


class TestOfflineSync:
    """POST /intake/sync tests."""

    @pytest.mark.offline
    def test_sync_single_offline_session(self, client, patient_headers):
        """Can sync a single offline-queued session."""
        session_id = str(uuid.uuid4())
        resp = client.post("/intake/sync", json={
            "queued_sessions": [{
                "id": session_id,
                "symptoms": ["cough", "fever"],
                "body_location": "throat",
                "lang": "en",
                "source": "icon",
            }],
        }, headers=patient_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["synced"] == 1
        assert data["failed"] == 0

    @pytest.mark.offline
    def test_sync_duplicate_detection(self, client, patient_headers):
        """Duplicate session IDs are detected and skipped."""
        session_id = str(uuid.uuid4())
        payload = {
            "queued_sessions": [{
                "id": session_id,
                "symptoms": ["headache"],
                "lang": "en",
            }],
        }
        # First sync succeeds
        client.post("/intake/sync", json=payload, headers=patient_headers)
        # Second sync detects duplicate
        resp = client.post("/intake/sync", json=payload, headers=patient_headers)
        assert resp.status_code == 200
        assert resp.json()["duplicates"] == 1
        assert resp.json()["synced"] == 0
