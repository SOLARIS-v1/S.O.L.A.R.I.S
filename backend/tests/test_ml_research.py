"""SOLARIS ML Research Architecture Integration & Safety Verification Suite.

Tests authoritative ML research package endpoints in FastAPI backend:
1. Model Registry: enabled vs quarantined model policies
2. Cardiovascular Isolation Forest: strictly unsupervised score, unit validation, physiological bounds
3. Immune Trajectory: PCA projection only, never recovery classification
4. Radiation Dosimetry: absorbed dose (mGy) only, never universal mSv conversion
5. Ocular & Bone: observations only, no SANS risk tiers or bone-loss forecasts
6. Quarantined Models: sleep, stress, proteomics, performance rejected with scientific rationale
7. Astronaut Insights: aggregation across valid astronauts, 404 for unknown
8. Response Schema & Metadata: UTC offsets, provenance, scientific limitations
9. Backward Compatibility: legacy health and crew endpoints
"""

import math
import os
import sys
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

# Ensure workspace root is in path
sys.path.insert(0, os.path.abspath("."))

from backend.main import app

client = TestClient(app)


# =============================================================================
# 1. Model Registry Tests
# =============================================================================

def test_ml_registry_endpoint_returns_authoritative_models():
    """Verify GET /api/ml/registry or GET /api/ml/status exposes authoritative models."""
    response = client.get("/api/ml/registry")
    if response.status_code == 404:
        # Check fallback to /api/ml/status
        response = client.get("/api/ml/status")
    
    assert response.status_code == 200, f"Registry failed: {response.status_code} {response.text}"
    data = response.json()
    
    # Check for models list or dict
    models = data.get("models")
    assert models is not None, "Missing models in registry response"
    
    model_ids = [m["id"] if isinstance(m, dict) else m for m in (models.values() if isinstance(models, dict) else models)]
    
    # Must include enabled models
    assert "cardiovascular_anomaly_detector" in model_ids
    assert "immune_trajectory_pca" in model_ids
    assert "radiation_dosimetry_engine" in model_ids
    assert "ocular_bone_observations" in model_ids
    
    # Must include quarantined models
    assert "sleep_recovery_model" in model_ids
    assert "stress_circadian_model" in model_ids
    assert "plasma_proteomics_model" in model_ids
    assert "physical_performance_model" in model_ids


def test_quarantined_models_declared_disabled():
    """Verify quarantined models are marked disabled/quarantined in registry."""
    response = client.get("/api/ml/registry")
    if response.status_code == 404:
        response = client.get("/api/ml/status")
    
    assert response.status_code == 200
    data = response.json()
    models = data.get("models")
    
    model_dict = {}
    if isinstance(models, list):
        model_dict = {m["id"]: m for m in models}
    elif isinstance(models, dict):
        model_dict = models
        
    for q_id in ["sleep_recovery_model", "stress_circadian_model", "plasma_proteomics_model", "physical_performance_model"]:
        if q_id in model_dict:
            m = model_dict[q_id]
            status_str = str(m.get("status", "")).lower() + " " + str(m.get("inference", "")).lower()
            assert "quarantine" in status_str or "disable" in status_str or "unavailable" in status_str, \
                f"Model {q_id} should be quarantined/disabled, got {m}"


# =============================================================================
# 2. Cardiovascular Anomaly Detector Tests
# =============================================================================

def test_cardiovascular_analysis_nominal_features():
    """Verify POST /api/ml/cardiovascular/analyze succeeds with valid inputs & units."""
    valid_payload = {
        "mean_hr_bpm": 70.0,
        "mean_rr_ms": 850.0,
        "sdnn_ms": 40.0,
        "rmssd_ms": 25.0,
        "pnn50_pct": 10.0,
        "sbp_mean": 120.0,
        "dbp_mean": 80.0,
        "map_mean": 90.0,
        "pp_mean": 40.0,
        "units": {
            "mean_hr_bpm": "beats/min",
            "mean_rr_ms": "ms",
            "sdnn_ms": "ms",
            "rmssd_ms": "ms",
            "pnn50_pct": "%",
            "sbp_mean": "mmHg",
            "dbp_mean": "mmHg",
            "map_mean": "mmHg",
            "pp_mean": "mmHg",
        }
    }
    
    response = client.post("/api/ml/cardiovascular/analyze", json=valid_payload)
    assert response.status_code == 200, f"Cardio analysis failed: {response.text}"
    res = response.json()
    
    # Must have unsupervised deviation score
    output = res.get("output", {})
    assert "unsupervised_deviation_score" in output or "anomaly_score" in output
    score = output.get("unsupervised_deviation_score", output.get("anomaly_score"))
    assert isinstance(score, (int, float))
    assert math.isfinite(score)
    
    # Check prohibited claims: must NEVER contain arrhythmia, disease probability, or clinical alert
    res_text = response.text.lower()
    assert "arrhythmia" not in res_text
    assert "disease probability" not in res_text
    assert "clinical alert" not in res_text


def test_cardiovascular_analysis_rejects_missing_units():
    """Verify rejection when units dictionary is omitted."""
    invalid_payload = {
        "mean_hr_bpm": 70.0,
        "mean_rr_ms": 850.0,
        "sdnn_ms": 40.0,
        "rmssd_ms": 25.0,
        "pnn50_pct": 10.0,
        "sbp_mean": 120.0,
        "dbp_mean": 80.0,
        "map_mean": 90.0,
        "pp_mean": 40.0,
    }
    response = client.post("/api/ml/cardiovascular/analyze", json=invalid_payload)
    assert response.status_code in (400, 422), f"Expected 400/422 for missing units, got {response.status_code}"


def test_cardiovascular_analysis_rejects_wrong_unit_string():
    """Verify rejection when a unit is incorrect (e.g., Hz instead of beats/min)."""
    invalid_payload = {
        "mean_hr_bpm": 70.0,
        "mean_rr_ms": 850.0,
        "sdnn_ms": 40.0,
        "rmssd_ms": 25.0,
        "pnn50_pct": 10.0,
        "sbp_mean": 120.0,
        "dbp_mean": 80.0,
        "map_mean": 90.0,
        "pp_mean": 40.0,
        "units": {
            "mean_hr_bpm": "Hz",  # Wrong unit
            "mean_rr_ms": "ms",
            "sdnn_ms": "ms",
            "rmssd_ms": "ms",
            "pnn50_pct": "%",
            "sbp_mean": "mmHg",
            "dbp_mean": "mmHg",
            "map_mean": "mmHg",
            "pp_mean": "mmHg",
        }
    }
    response = client.post("/api/ml/cardiovascular/analyze", json=invalid_payload)
    assert response.status_code in (400, 422), f"Expected 400/422 for bad unit, got {response.status_code}"


def test_cardiovascular_analysis_rejects_unphysiological_sbp_dbp():
    """Verify rejection when SBP <= DBP."""
    invalid_payload = {
        "mean_hr_bpm": 70.0,
        "mean_rr_ms": 850.0,
        "sdnn_ms": 40.0,
        "rmssd_ms": 25.0,
        "pnn50_pct": 10.0,
        "sbp_mean": 80.0,  # <= DBP
        "dbp_mean": 120.0,
        "map_mean": 90.0,
        "pp_mean": 40.0,
        "units": {
            "mean_hr_bpm": "beats/min",
            "mean_rr_ms": "ms",
            "sdnn_ms": "ms",
            "rmssd_ms": "ms",
            "pnn50_pct": "%",
            "sbp_mean": "mmHg",
            "dbp_mean": "mmHg",
            "map_mean": "mmHg",
            "pp_mean": "mmHg",
        }
    }
    response = client.post("/api/ml/cardiovascular/analyze", json=invalid_payload)
    assert response.status_code in (400, 422), f"Expected 400/422 for SBP <= DBP, got {response.status_code}"


# =============================================================================
# 3. Immune Trajectory PCA Tests
# =============================================================================

def test_immune_analytics_projection():
    """Verify GET /api/ml/immune/analytics returns PCA coordinates only."""
    response = client.get("/api/ml/immune/analytics")
    assert response.status_code == 200, f"Immune analytics failed: {response.text}"
    res = response.json()
    
    # Must contain PCA coordinates
    output = res.get("output", {})
    assert "pca_coordinates" in output, "Missing pca_coordinates in output"
    coords = output["pca_coordinates"]
    assert isinstance(coords, list)
    assert len(coords) >= 1
    assert all(isinstance(c, (int, float)) and math.isfinite(c) for c in coords)
    
    # Prohibited claims: recovery state, diagnosis, risk
    res_text = response.text.lower()
    assert "recovery state" not in res_text
    assert "diagnosis" not in res_text


# =============================================================================
# 4. Radiation Dosimetry Tests
# =============================================================================

def test_radiation_summary_absorbed_dose_only():
    """Verify GET /api/ml/radiation/summary returns absorbed dose (mGy) only."""
    response = client.get("/api/ml/radiation/summary")
    assert response.status_code == 200, f"Radiation summary failed: {response.text}"
    res = response.json()
    
    output = res.get("output", {})
    assert "cumulative_absorbed_dose_mgy" in output
    mgy = output["cumulative_absorbed_dose_mgy"]
    assert isinstance(mgy, (int, float)) and mgy >= 0 and math.isfinite(mgy)
    
    # Must NOT claim universal effective dose conversion or safety status
    assert "cumulative_effective_dose_msv" not in output
    assert "safety status" not in response.text.lower()


# =============================================================================
# 5. Ocular & Bone Observations Tests
# =============================================================================

def test_ocular_observations_only():
    """Verify GET /api/ml/ocular/observations returns descriptive observations without SANS tiers."""
    response = client.get("/api/ml/ocular/observations")
    assert response.status_code == 200, f"Ocular failed: {response.text}"
    res = response.json()
    
    output = res.get("output", {})
    assert "current_onsd_mm" in output or "onsd_mm" in output
    assert "sans_risk_tier" not in output


def test_bone_observations_only():
    """Verify GET /api/ml/bone/observations returns T-scores without bone loss forecasts."""
    response = client.get("/api/ml/bone/observations")
    assert response.status_code == 200, f"Bone failed: {response.text}"
    res = response.json()
    
    output = res.get("output", {})
    assert "bmd_t_score" in output or "t_score" in output
    assert "projected_monthly_bmd_loss_pct" not in output
    assert "bone_loss_forecast" not in output


# =============================================================================
# 6. Quarantined Endpoints Enforcement
# =============================================================================

def test_sleep_analytics_quarantine_enforcement():
    """Verify GET /api/ml/sleep/analytics explicitly flags quarantine for target leakage."""
    response = client.get("/api/ml/sleep/analytics")
    assert response.status_code in (200, 400, 403, 422)
    res_text = response.text.lower()
    assert "quarantined" in res_text or "target leakage" in res_text or "disabled" in res_text


def test_metabolic_analytics_quarantine_enforcement():
    """Verify GET /api/ml/metabolic/analytics explicitly flags quarantine."""
    response = client.get("/api/ml/metabolic/analytics")
    assert response.status_code in (200, 400, 403, 422)
    res_text = response.text.lower()
    assert "quarantined" in res_text or "generalization" in res_text or "disabled" in res_text


# =============================================================================
# 7. Astronaut Insights Aggregation
# =============================================================================

def test_astronaut_insights_valid_crew():
    """Verify GET /api/ml/astronaut/{astronaut_id}/insights returns aggregated observations."""
    for crew_id in ["vance", "patel", "chen"]:
        response = client.get(f"/api/ml/astronaut/{crew_id}/insights")
        assert response.status_code == 200, f"Astronaut insights failed for {crew_id}: {response.text}"
        res = response.json()
        assert "astronaut_id" in res or "crew_id" in res
        assert "cardiovascular" in res or "radiation" in res or "ocular_bone" in res or "insights" in res


def test_astronaut_insights_unknown_crew_404():
    """Verify GET /api/ml/astronaut/{astronaut_id}/insights returns 404 for unknown astronaut."""
    response = client.get("/api/ml/astronaut/unknown_nonexistent_astronaut/insights")
    assert response.status_code == 404


# =============================================================================
# 8. Response Schema & Metadata Integrity
# =============================================================================

def test_response_metadata_timestamp_has_utc_offset():
    """Verify API responses include valid ISO timestamps with UTC offset."""
    response = client.get("/api/ml/radiation/summary")
    assert response.status_code == 200
    res = response.json()
    ts_field = res.get("generated_at_utc", res.get("timestamp"))
    assert ts_field is not None, "Missing timestamp in response"
    
    # Must have UTC offset (+00:00 or Z)
    assert ts_field.endswith("+00:00") or ts_field.endswith("Z") or "+00:00" in ts_field
    dt = datetime.fromisoformat(ts_field.replace("Z", "+00:00"))
    assert dt.tzinfo is not None, "Timestamp must be timezone-aware"


# =============================================================================
# 9. Backward Compatibility
# =============================================================================

def test_legacy_health_check_still_online():
    """Verify legacy GET /api/health still works."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ONLINE"


def test_legacy_crew_telemetry_still_works():
    """Verify legacy GET /api/crew/vance still works."""
    response = client.get("/api/crew/vance")
    assert response.status_code == 200
    assert "crew" in response.json()


if __name__ == "__main__":
    pytest.main(["-v", __file__])
