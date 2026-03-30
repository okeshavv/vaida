"""Epidemiological alert schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ClusterItem(BaseModel):
    cluster_id: str
    district: str
    symptom_cluster: List[str]
    patient_count: int
    window_start: datetime
    window_end: datetime
    alert_triggered: bool


class ClustersResponse(BaseModel):
    clusters: List[ClusterItem]
    alert_level: str  # none | watch | critical


class AlertRequest(BaseModel):
    cluster_id: str
    officer_id: str


class AlertResponse(BaseModel):
    alert_tx_hash: str
    message: str


class DashboardResponse(BaseModel):
    geo_json: dict
    timeseries: List[dict]
    total_events: int
