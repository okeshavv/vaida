"""
VAIDA Epi API — /epi/* endpoints.
Epidemiological surveillance: cluster detection, alerts, dashboard.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.db_models import Patient, EpiEvent
from app.schemas.epi import (
    ClustersResponse, ClusterItem,
    AlertRequest, AlertResponse,
    DashboardResponse,
)
from app.dependencies import get_current_user
from app.blockchain.ledger import get_ledger
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/epi", tags=["Epidemiological Alerts"])


@router.get("/clusters", response_model=ClustersResponse)
def get_clusters(
    district: str = Query(...),
    window_hours: int = Query(default=72, ge=1, le=720),
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get active outbreak clusters by district within a time window."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)

    events = db.query(EpiEvent).filter(
        EpiEvent.district == district,
        EpiEvent.window_start >= cutoff,
    ).all()

    clusters = []
    total_patients = 0
    for e in events:
        total_patients += (e.patient_count or 0)
        clusters.append(ClusterItem(
            cluster_id=e.id,
            district=e.district,
            symptom_cluster=e.symptom_cluster or [],
            patient_count=e.patient_count or 0,
            window_start=e.window_start or cutoff,
            window_end=e.window_end or datetime.now(timezone.utc),
            alert_triggered=e.alert_triggered or False,
        ))

    # Determine alert level
    if total_patients >= settings.EPI_ALERT_THRESHOLD:
        alert_level = "critical"
    elif total_patients >= settings.EPI_ALERT_THRESHOLD // 2:
        alert_level = "watch"
    else:
        alert_level = "none"

    return ClustersResponse(clusters=clusters, alert_level=alert_level)


@router.post("/alert", response_model=AlertResponse, status_code=201)
def trigger_alert(
    req: AlertRequest,
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Trigger a district health officer alert.
    Alert is anchored on the blockchain with ZKP anonymisation.
    """
    event = db.query(EpiEvent).filter(EpiEvent.id == req.cluster_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Cluster not found")

    if event.alert_triggered:
        return AlertResponse(
            alert_tx_hash=event.alert_tx_hash or "already_triggered",
            message="Alert was already triggered for this cluster",
        )

    # ── Anchor on blockchain ──
    ledger = get_ledger()
    tx_hash = ledger.add_epi_alert(
        district=event.district,
        patient_count=event.patient_count or 0,
        symptom_cluster=event.symptom_cluster or [],
    )

    event.alert_triggered = True
    event.alert_tx_hash = tx_hash
    db.commit()

    return AlertResponse(
        alert_tx_hash=tx_hash,
        message=f"Alert triggered and anchored on-chain for district: {event.district}",
    )


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    state: str = Query(default="all"),
    date_from: str = Query(default=None),
    date_to: str = Query(default=None),
    current_user: Patient = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Real-time district-level dashboard data (GeoJSON + timeseries)."""
    query = db.query(EpiEvent)

    if state != "all":
        query = query.filter(EpiEvent.district.like(f"%{state}%"))

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            query = query.filter(EpiEvent.window_start >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            query = query.filter(EpiEvent.window_end <= dt_to)
        except ValueError:
            pass

    events = query.all()

    # ── Build GeoJSON (simplified — no real coords without geocoding) ──
    features = []
    timeseries = []
    for e in events:
        features.append({
            "type": "Feature",
            "properties": {
                "district": e.district,
                "patient_count": e.patient_count,
                "alert_triggered": e.alert_triggered,
                "symptom_cluster": e.symptom_cluster,
            },
            "geometry": {
                "type": "Point",
                "coordinates": [0, 0],  # Production: geocode district
            },
        })
        timeseries.append({
            "district": e.district,
            "count": e.patient_count,
            "window_start": e.window_start.isoformat() if e.window_start else None,
            "alert": e.alert_triggered,
        })

    geo_json = {
        "type": "FeatureCollection",
        "features": features,
    }

    return DashboardResponse(
        geo_json=geo_json,
        timeseries=timeseries,
        total_events=len(events),
    )
