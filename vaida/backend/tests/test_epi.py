"""
VAIDA Epi Tests — 8 test cases for epidemiological surveillance.
"""
import pytest
from datetime import datetime, timedelta, timezone
from app.models.db_models import EpiEvent


class TestEpiClusters:
    """GET /epi/clusters tests."""

    @pytest.mark.epi
    def test_get_clusters_by_district(self, client, patient_headers, db_session):
        """Returns clusters for a specific district."""
        # Seed epi data
        event = EpiEvent(
            district="Jaipur",
            symptom_cluster=["fever", "cough"],
            patient_count=10,
            window_start=datetime.now(timezone.utc) - timedelta(hours=24),
            window_end=datetime.now(timezone.utc),
            alert_triggered=False,
        )
        db_session.add(event)
        db_session.commit()

        resp = client.get("/epi/clusters?district=Jaipur&window_hours=72",
                          headers=patient_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["clusters"]) >= 1
        assert data["clusters"][0]["district"] == "Jaipur"

    @pytest.mark.epi
    def test_get_clusters_empty_result(self, client, patient_headers):
        """No clusters returns empty list."""
        resp = client.get("/epi/clusters?district=EmptyDistrict",
                          headers=patient_headers)
        assert resp.status_code == 200
        assert resp.json()["clusters"] == []
        assert resp.json()["alert_level"] == "none"

    @pytest.mark.epi
    def test_alert_level_critical(self, client, patient_headers, db_session):
        """15+ patients triggers critical alert level."""
        event = EpiEvent(
            district="Jodhpur",
            symptom_cluster=["fever", "rash"],
            patient_count=20,
            window_start=datetime.now(timezone.utc) - timedelta(hours=12),
            window_end=datetime.now(timezone.utc),
        )
        db_session.add(event)
        db_session.commit()

        resp = client.get("/epi/clusters?district=Jodhpur&window_hours=72",
                          headers=patient_headers)
        assert resp.json()["alert_level"] == "critical"


class TestEpiAlerts:
    """POST /epi/alert tests."""

    @pytest.mark.epi
    def test_trigger_alert_blockchain(self, client, patient_headers, db_session):
        """Alert is anchored on the blockchain."""
        event = EpiEvent(
            district="Udaipur",
            symptom_cluster=["diarrhea", "vomiting"],
            patient_count=18,
            window_start=datetime.now(timezone.utc) - timedelta(hours=48),
            window_end=datetime.now(timezone.utc),
        )
        db_session.add(event)
        db_session.commit()
        db_session.refresh(event)

        resp = client.post("/epi/alert", json={
            "cluster_id": event.id,
            "officer_id": "officer-001",
        }, headers=patient_headers)
        assert resp.status_code == 201
        assert resp.json()["alert_tx_hash"].startswith("0x")

    @pytest.mark.epi
    def test_duplicate_alert_handled(self, client, patient_headers, db_session):
        """Re-triggering same alert is handled gracefully."""
        event = EpiEvent(
            district="Bikaner",
            symptom_cluster=["fever"],
            patient_count=25,
            window_start=datetime.now(timezone.utc) - timedelta(hours=24),
            window_end=datetime.now(timezone.utc),
        )
        db_session.add(event)
        db_session.commit()
        db_session.refresh(event)

        # Trigger once
        client.post("/epi/alert", json={
            "cluster_id": event.id,
            "officer_id": "officer-001",
        }, headers=patient_headers)
        # Trigger again
        resp = client.post("/epi/alert", json={
            "cluster_id": event.id,
            "officer_id": "officer-001",
        }, headers=patient_headers)
        assert resp.status_code == 201  # No crash
        assert "already" in resp.json()["message"]

    @pytest.mark.epi
    def test_alert_cluster_not_found(self, client, patient_headers):
        """Alert for non-existent cluster returns 404."""
        resp = client.post("/epi/alert", json={
            "cluster_id": "nonexistent",
            "officer_id": "officer-001",
        }, headers=patient_headers)
        assert resp.status_code == 404


class TestEpiDashboard:
    """GET /epi/dashboard tests."""

    @pytest.mark.epi
    def test_dashboard_returns_geojson(self, client, patient_headers, db_session):
        """Dashboard returns GeoJSON format."""
        event = EpiEvent(
            district="Jaipur",
            symptom_cluster=["fever"],
            patient_count=5,
            window_start=datetime.now(timezone.utc) - timedelta(hours=12),
            window_end=datetime.now(timezone.utc),
        )
        db_session.add(event)
        db_session.commit()

        resp = client.get("/epi/dashboard", headers=patient_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["geo_json"]["type"] == "FeatureCollection"
        assert isinstance(data["timeseries"], list)
        assert data["total_events"] >= 1

    @pytest.mark.epi
    def test_dashboard_epi_data_anonymised(self, client, patient_headers, db_session):
        """Dashboard data contains no patient IDs (anonymised)."""
        event = EpiEvent(
            district="Jaipur",
            symptom_cluster=["cough"],
            patient_count=3,
            window_start=datetime.now(timezone.utc) - timedelta(hours=6),
            window_end=datetime.now(timezone.utc),
        )
        db_session.add(event)
        db_session.commit()

        resp = client.get("/epi/dashboard", headers=patient_headers)
        data_str = str(resp.json())
        assert "patient_id" not in data_str
        assert "phone" not in data_str
        assert "name" not in data_str
