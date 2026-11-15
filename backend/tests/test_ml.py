"""Comprehensive unit and integration test suite for SOLARIS ML service layer.

Tests strict feature validation, safe artifact loading, non-retraining safety protocols,
anomaly scoring, and FastAPI endpoints.
"""

import pytest
import numpy as np
from pydantic import ValidationError
from fastapi.testclient import TestClient

from backend.main import app
from backend.ml import (
    BiometricTelemetryInput,
    InferenceRequest,
    InferenceResponse,
    AssessmentRequest,
    AssessmentResponse,
    ModelRegistry,
    get_model_registry,
    InferenceService,
    get_inference_service,
    safe_load_joblib,
    FEATURE_NAMES,
    FEATURE_METADATA,
    CLINICAL_SAFETY_DISCLAIMER,
)
from backend.ml.schemas import OperationalStatus, ModelLoadState


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def nominal_features_dict():
    return {
        "heart_rate_bpm": 70.0,
        "hrv_rmssd_ms": 65.0,
        "ectopic_jumps_hr": 0.0,
        "spo2_pct": 99.0,
        "cranial_ptt_ms": 185.0,
        "resp_rate_brm": 13.5,
        "skin_temp_c": 36.6,
        "radiation_msv_day": 0.35,
        "sleep_hours": 7.5,
        "circadian_align_pct": 90.0,
        "spine_pain_score": 0.0,
        "skin_irritation_score": 0.0,
    }


@pytest.fixture
def nominal_features(nominal_features_dict):
    return BiometricTelemetryInput(**nominal_features_dict)


# -----------------------------------------------------------------------------
# 1. Schema & Validation Tests
# -----------------------------------------------------------------------------

def test_feature_names_count():
    assert len(FEATURE_NAMES) == 12
    for name in FEATURE_NAMES:
        assert name in FEATURE_METADATA
        meta = FEATURE_METADATA[name]
        assert "unit" in meta
        assert "baseline_median" in meta


def test_strict_validation_rejects_missing_features():
    incomplete = {
        "heart_rate_bpm": 70.0,
        "hrv_rmssd_ms": 65.0,
    }
    with pytest.raises(ValidationError) as exc_info:
        BiometricTelemetryInput(**incomplete)
    errors = exc_info.value.errors()
    assert len(errors) == 10  # 10 missing features


def test_strict_validation_rejects_out_of_bounds_values(nominal_features_dict):
    # Heart rate over 250 bpm
    bad_hr = dict(nominal_features_dict, heart_rate_bpm=300.0)
    with pytest.raises(ValidationError):
        BiometricTelemetryInput(**bad_hr)

    # Negative radiation dose
    bad_rad = dict(nominal_features_dict, radiation_msv_day=-1.0)
    with pytest.raises(ValidationError):
        BiometricTelemetryInput(**bad_rad)

    # Pain score over 10
    bad_pain = dict(nominal_features_dict, spine_pain_score=11.0)
    with pytest.raises(ValidationError):
        BiometricTelemetryInput(**bad_pain)


def test_feature_vector_conversion(nominal_features):
    vec = nominal_features.to_feature_vector()
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (1, 12)
    assert vec[0, 0] == nominal_features.heart_rate_bpm


# -----------------------------------------------------------------------------
# 2. Safe Model Loader Tests
# -----------------------------------------------------------------------------

def test_safe_loader_valid_model():
    from backend.ml.model_registry import DEFAULT_RF_PATH
    model, err = safe_load_joblib(str(DEFAULT_RF_PATH))
    assert err is None
    assert model is not None
    assert hasattr(model, "predict")


def test_safe_loader_missing_file():
    model, err = safe_load_joblib("backend/models/nonexistent.joblib")
    assert model is None
    assert err is not None
    assert "not found" in err.lower()


def test_safe_loader_disallowed_extension():
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp:
        model, err = safe_load_joblib(tmp.name)
        assert model is None
        assert err is not None
        assert "unsupported" in err.lower() or "extension" in err.lower()


def test_safe_loader_path_traversal():
    from backend.ml.model_registry import DEFAULT_MODELS_DIR
    model, err = safe_load_joblib(
        str(DEFAULT_MODELS_DIR / ".." / "database.py"),
        allowed_dir=str(DEFAULT_MODELS_DIR),
    )
    assert model is None
    assert err is not None
    assert "security violation" in err.lower() or "outside allowed" in err.lower()


# -----------------------------------------------------------------------------
# 3. Model Registry & Status Tests
# -----------------------------------------------------------------------------

def test_registry_operational_status():
    reg = get_model_registry()
    status = reg.get_status()
    assert status.overall_status == "OPERATIONAL"
    assert "astra_rf_classifier" in status.models
    assert "astra_iso_forest" in status.models
    assert status.models["astra_rf_classifier"].status == ModelLoadState.LOADED
    assert status.models["astra_iso_forest"].status == ModelLoadState.LOADED
    assert CLINICAL_SAFETY_DISCLAIMER in status.clinical_disclaimer


def test_registry_honest_unavailable_on_missing_dir():
    reg = ModelRegistry(models_dir="backend/invalid_dir_test")
    reg.load_all()
    status = reg.get_status()
    assert status.overall_status == "UNAVAILABLE"
    assert status.models["astra_rf_classifier"].status == ModelLoadState.UNAVAILABLE
    assert status.models["astra_iso_forest"].status == ModelLoadState.UNAVAILABLE


# -----------------------------------------------------------------------------
# 4. Inference & Safety Framing Tests
# -----------------------------------------------------------------------------

def test_inference_nominal_case(nominal_features):
    svc = get_inference_service()
    req = InferenceRequest(features=nominal_features)
    resp = svc.run_inference(req)

    assert resp.status == OperationalStatus.NOMINAL
    assert resp.confidence_pct is not None
    assert resp.confidence_pct > 50.0
    assert resp.is_anomaly is False
    assert resp.anomaly_score > 0.0  # Isolation Forest inlier
    assert CLINICAL_SAFETY_DISCLAIMER in resp.clinical_disclaimer
    # Verify non-clinical labeling
    assert "disease" not in resp.anomaly.interpretation.lower() or "not a disease" in resp.anomaly.interpretation.lower()


def test_inference_acute_anomaly():
    svc = get_inference_service()
    # High radiation, elevated heart rate, severe pain, ectopic jumps
    abnormal = BiometricTelemetryInput(
        heart_rate_bpm=110.0,
        hrv_rmssd_ms=20.0,
        ectopic_jumps_hr=8.0,
        spo2_pct=93.0,
        cranial_ptt_ms=150.0,
        resp_rate_brm=22.0,
        skin_temp_c=37.8,
        radiation_msv_day=2.5,
        sleep_hours=3.5,
        circadian_align_pct=45.0,
        spine_pain_score=7.0,
        skin_irritation_score=5.0,
    )
    req = InferenceRequest(features=abnormal)
    resp = svc.run_inference(req)

    assert resp.status in (OperationalStatus.CAUTION, OperationalStatus.CRITICAL)
    assert resp.is_anomaly is True
    assert resp.anomaly_score < 0.0  # Isolation Forest outlier
    assert len(resp.countermeasures) > 0


# -----------------------------------------------------------------------------
# 5. FastAPI Endpoints Integration Tests
# -----------------------------------------------------------------------------

def test_api_health_endpoint(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ONLINE"
    assert data["models_loaded"] is True
    assert data["ml_status"] == "OPERATIONAL"


def test_api_ml_status_endpoint(client):
    r = client.get("/api/ml/status")
    assert r.status_code == 200
    data = r.json()
    assert data["overall_status"] == "OPERATIONAL"
    assert "astra_rf_classifier" in data["models"]
    assert "astra_iso_forest" in data["models"]


def test_api_ml_inference_success(client, nominal_features_dict):
    r = client.post("/api/ml/inference", json={"features": nominal_features_dict})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "NOMINAL"
    assert "anomaly" in data
    assert "is_anomaly" in data
    assert "anomaly_score" in data
    assert "top_contributing_factors" in data
    assert len(data["countermeasures"]) >= 1


def test_api_ml_inference_strict_rejection(client):
    # Send empty payload
    r = client.post("/api/ml/inference", json={})
    assert r.status_code == 422

    # Send incomplete features
    r = client.post("/api/ml/inference", json={"features": {"heart_rate_bpm": 80.0}})
    assert r.status_code == 422


def test_api_ml_assess_with_crew_name(client):
    r = client.post(
        "/api/ml/assess",
        json={
            "crew_name": "vance",
            "transcript": "My back is really aching from elongation and I couldn't sleep.",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["detected_symptoms"]["sleepIssue"] is True
    assert data["detected_symptoms"]["spineIssue"] is True
    assert data["ml_analysis"]["status"] in ("CAUTION", "CRITICAL")
    assert "spoken_briefing" in data
    assert len(data["countermeasures"]) > 0


def test_api_ml_assess_unknown_crew(client):
    r = client.post(
        "/api/ml/assess",
        json={"crew_name": "unknown_cosmonaut_123"},
    )
    assert r.status_code == 404


def test_legacy_assess_endpoint_compatibility(client):
    r = client.post(
        "/api/assess",
        json={
            "crew_name": "vance",
            "transcript": "Chest feels fluttery with ectopic jumps",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "detected_symptoms" in data
    assert "ml_analysis" in data
    assert "astra_spoken_response" in data
    assert "countermeasures" in data


def test_crew_endpoint_ml_integration(client):
    r = client.get("/api/crew/vance")
    assert r.status_code == 200
    data = r.json()
    assert "ml_analysis" in data
    assert "status" in data["ml_analysis"]
    assert "hotspots" in data
