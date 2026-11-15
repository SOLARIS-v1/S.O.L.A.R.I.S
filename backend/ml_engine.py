"""LEGACY DEPRECATION NOTICE:
This module is maintained exclusively for backward-compatibility with older UI callers.
The authoritative, peer-reviewed spaceflight ML research service is in `backend.ml.research`.

Enforces strict safety rules:
- No automatic model retraining
- No synthetic dataset generation
- Honest status reporting (UNAVAILABLE / PENDING) if models fail to load
- Unambiguous non-diagnostic framing: anomaly scores are unsupervised statistical indices,
  NEVER disease probabilities or clinical diagnoses.
"""

import os
from typing import Dict, Any, List
from .ml.model_registry import get_model_registry
from .ml.schemas import (
    BiometricTelemetryInput,
    InferenceRequest,
    FEATURE_NAMES,
    FEATURE_METADATA,
)
from .ml.inference_service import get_inference_service

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
RF_MODEL_PATH = os.path.join(MODEL_DIR, "astra_rf_model.joblib")
ISO_MODEL_PATH = os.path.join(MODEL_DIR, "astra_iso_model.joblib")

rf_model = None
iso_model = None


def init_ml_pipeline():
    """Initializes models safely via ModelRegistry without retraining."""
    global rf_model, iso_model
    registry = get_model_registry()
    if registry.is_operational():
        rf_adapter = registry.get_adapter("astra_rf_classifier")
        iso_adapter = registry.get_adapter("astra_iso_forest")
        rf_model = rf_adapter.model if rf_adapter else None
        iso_model = iso_adapter.model if iso_adapter else None


def analyze_crew_biometrics(telemetry: Dict[str, Any], verbal_symptoms: Dict[str, Any]) -> Dict[str, Any]:
    """Analyzes crew telemetry using backend.ml service.
    
    Safe wrapper maintaining backward-compatible return dictionary.
    """
    service = get_inference_service()
    if not service.registry.is_operational():
        return {
            "status": "UNAVAILABLE",
            "confidence_pct": 0.0,
            "is_anomaly": False,
            "anomaly_score": 0.0,
            "top_contributing_factors": [],
            "causal_explanation": (
                "ML inference models are UNAVAILABLE. Synthetic retraining is prohibited by flight safety protocol."
            ),
            "countermeasures": [
                "Review raw sensor telemetry directly",
                "Perform manual flight surgeon clinical assessment",
            ],
        }

    # Extract required features
    feature_dict = {}
    for name in FEATURE_NAMES:
        val = telemetry.get(name)
        if val is None:
            val = FEATURE_METADATA[name]["baseline_median"]
        feature_dict[name] = float(val)

    # Incorporate verbal symptoms if present
    if verbal_symptoms.get("spine_issue") or verbal_symptoms.get("spineIssue"):
        feature_dict["spine_pain_score"] = max(feature_dict["spine_pain_score"], 6.5)

    if verbal_symptoms.get("skin_issue") or verbal_symptoms.get("skinIssue"):
        feature_dict["skin_irritation_score"] = max(feature_dict["skin_irritation_score"], 5.0)

    if verbal_symptoms.get("sleep_issue") or verbal_symptoms.get("sleepIssue"):
        feature_dict["sleep_hours"] = min(feature_dict["sleep_hours"], 4.6)
        feature_dict["circadian_align_pct"] = min(feature_dict["circadian_align_pct"], 55.0)

    try:
        telemetry_input = BiometricTelemetryInput(**feature_dict)
        res = service.run_inference(InferenceRequest(features=telemetry_input))
        return {
            "status": res.status.value,
            "confidence_pct": res.confidence_pct,
            "is_anomaly": res.is_anomaly,
            "anomaly_score": res.anomaly_score,
            "top_contributing_factors": [
                {
                    "feature": f.feature,
                    "value": f.value,
                    "impact_score": f.impact_score,
                }
                for f in res.top_contributing_factors
            ],
            "causal_explanation": res.causal_explanation,
            "countermeasures": res.countermeasures,
        }
    except Exception as e:
        return {
            "status": "UNAVAILABLE",
            "confidence_pct": 0.0,
            "is_anomaly": False,
            "anomaly_score": 0.0,
            "top_contributing_factors": [],
            "causal_explanation": f"Operational assessment error: {e}",
            "countermeasures": ["Perform manual telemetry review"],
        }


# Initialize on import
init_ml_pipeline()
