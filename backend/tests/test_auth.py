"""
VAIDA Auth Tests — 15 test cases covering registration, login, tokens, consent.
"""
import pytest


class TestRegistration:
    """Registration endpoint tests."""

    @pytest.mark.auth
    def test_register_patient_success(self, client):
        """A patient can register with valid data + consent."""
        resp = client.post("/auth/register", json={
            "name": "Rajesh Kumar",
            "phone": "9999900001",
            "password": "pass1234",
            "role": "patient",
            "lang": "hi",
            "consent": True,
            "district": "Jaipur",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "user_id" in data
        assert "token" in data
        assert len(data["token"]) > 20  # JWT should be substantial

    @pytest.mark.auth
    def test_register_asha_worker(self, client):
        """ASHA worker registration works."""
        resp = client.post("/auth/register", json={
            "name": "Sunita Devi",
            "phone": "9999900002",
            "password": "asha5678",
            "role": "asha",
            "lang": "hi",
            "consent": True,
        })
        assert resp.status_code == 201
        assert resp.json()["user_id"]

    @pytest.mark.auth
    def test_register_doctor(self, client):
        """Doctor registration works."""
        resp = client.post("/auth/register", json={
            "name": "Dr. Priya Patel",
            "phone": "9999900003",
            "password": "doc12345",
            "role": "doctor",
            "lang": "en",
            "consent": True,
        })
        assert resp.status_code == 201

    @pytest.mark.auth
    def test_register_duplicate_phone_fails(self, client):
        """Cannot register same phone number twice."""
        payload = {
            "name": "User A",
            "phone": "9999900010",
            "password": "pass1234",
            "role": "patient",
            "lang": "en",
            "consent": True,
        }
        client.post("/auth/register", json=payload)
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"]

    @pytest.mark.auth
    def test_register_missing_consent_fails(self, client):
        """Registration without consent is rejected (DPDPA 2023)."""
        resp = client.post("/auth/register", json={
            "name": "No Consent",
            "phone": "9999900011",
            "password": "pass1234",
            "role": "patient",
            "lang": "en",
            "consent": False,
        })
        assert resp.status_code == 400
        assert "Consent" in resp.json()["detail"]

    @pytest.mark.auth
    def test_register_invalid_role_fails(self, client):
        """Invalid role is rejected."""
        resp = client.post("/auth/register", json={
            "name": "Bad Role",
            "phone": "9999900012",
            "password": "pass1234",
            "role": "admin",  # invalid
            "lang": "en",
            "consent": True,
        })
        assert resp.status_code == 422  # Pydantic validation

    @pytest.mark.auth
    def test_register_invalid_phone_fails(self, client):
        """Invalid phone format is rejected."""
        resp = client.post("/auth/register", json={
            "name": "Bad Phone",
            "phone": "abc",
            "password": "pass1234",
            "role": "patient",
            "lang": "en",
            "consent": True,
        })
        assert resp.status_code == 422


class TestLogin:
    """Login endpoint tests."""

    @pytest.mark.auth
    def test_login_success_with_otp(self, client):
        """Login with valid phone + bypass OTP returns tokens."""
        # First register
        client.post("/auth/register", json={
            "name": "Login Test",
            "phone": "9999900020",
            "password": "pass1234",
            "role": "patient",
            "lang": "en",
            "consent": True,
        })
        # Then login with OTP
        resp = client.post("/auth/login", json={
            "phone": "9999900020",
            "otp": "123456",  # bypass code
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "patient"

    @pytest.mark.auth
    def test_login_wrong_otp_fails(self, client):
        """Login with wrong OTP is rejected."""
        client.post("/auth/register", json={
            "name": "OTP Fail",
            "phone": "9999900021",
            "password": "pass1234",
            "role": "patient",
            "lang": "en",
            "consent": True,
        })
        resp = client.post("/auth/login", json={
            "phone": "9999900021",
            "otp": "000000",  # wrong OTP
        })
        assert resp.status_code == 401

    @pytest.mark.auth
    def test_login_nonexistent_user_fails(self, client):
        """Login for unregistered phone fails."""
        resp = client.post("/auth/login", json={
            "phone": "0000000000",
            "otp": "123456",
        })
        assert resp.status_code == 404


class TestTokens:
    """Token management tests."""

    @pytest.mark.auth
    def test_refresh_token_success(self, client):
        """Valid refresh token returns new access token."""
        # Register and login
        client.post("/auth/register", json={
            "name": "Token Test",
            "phone": "9999900030",
            "password": "pass1234",
            "role": "patient",
            "lang": "en",
            "consent": True,
        })
        login = client.post("/auth/login", json={
            "phone": "9999900030",
            "otp": "123456",
        })
        refresh_token = login.json()["refresh_token"]

        resp = client.post("/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    @pytest.mark.auth
    def test_refresh_with_invalid_token_fails(self, client):
        """Invalid refresh token is rejected."""
        resp = client.post("/auth/refresh", json={
            "refresh_token": "invalid.token.here",
        })
        assert resp.status_code == 401

    @pytest.mark.auth
    def test_protected_endpoint_without_token_fails(self, client):
        """Accessing protected endpoint without auth fails."""
        resp = client.post("/intake", json={
            "patient_id": "fake",
            "symptoms": ["headache"],
        })
        assert resp.status_code == 403  # No auth header

    @pytest.mark.auth
    def test_protected_endpoint_with_bad_token_fails(self, client):
        """Accessing protected endpoint with invalid token fails."""
        resp = client.post("/intake", json={
            "patient_id": "fake",
            "symptoms": ["headache"],
        }, headers={"Authorization": "Bearer invalid.jwt.token"})
        assert resp.status_code == 401


class TestConsent:
    """Consent recording tests."""

    @pytest.mark.auth
    def test_consent_recorded_on_chain(self, client, patient_headers, registered_patient):
        """Consent is recorded on the blockchain during registration."""
        data, _ = registered_patient
        # Registration already records consent — check the message
        assert "Consent recorded" in data["message"]

    @pytest.mark.auth
    def test_additional_consent_returns_tx_hash(self, client, patient_headers, registered_patient):
        """Recording additional consent returns a blockchain tx hash."""
        patient_data, _ = registered_patient
        resp = client.post("/auth/consent", json={
            "patient_id": patient_data["user_id"],
            "consent_type": "image_analysis",
            "lang": "en",
        }, headers=patient_headers)
        assert resp.status_code == 200
        assert resp.json()["consent_tx_hash"].startswith("0x")
