"""Conservative SOLARIS interfaces.

Only signal-processing/research analytics are exposed. Experimental model
artifacts are intentionally not loaded by default; see reports/model_registry.json.
"""
from __future__ import annotations

import math
import os
import warnings
from datetime import datetime, timezone
from typing import Any, Mapping

import joblib
import numpy as np
import sklearn
from sklearn.exceptions import InconsistentVersionWarning

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODELS_DIR = os.path.join(BASE_DIR, "models")
ARTIFACT_SKLEARN_VERSION = "1.9.1"  # recorded from the serialized-artifact metadata


def _mapping(data: Any, name: str = "input") -> Mapping[str, Any]:
    if not isinstance(data, Mapping):
        raise ValueError(f"{name} must be a mapping of named fields")
    if any(not isinstance(key, str) or not key for key in data):
        raise ValueError(f"{name} field names must be non-empty strings")
    return data


def _load_artifact(path: str) -> Any:
    if sklearn.__version__ != ARTIFACT_SKLEARN_VERSION:
        raise RuntimeError(
            f"Cannot load serialized artifact {os.path.relpath(path, BASE_DIR)}: "
            f"requires scikit-learn=={ARTIFACT_SKLEARN_VERSION}, "
            f"found {sklearn.__version__}. Install the pinned requirements."
        )
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", InconsistentVersionWarning)
            return joblib.load(path)
    except InconsistentVersionWarning as exc:
        raise RuntimeError(f"Serialized artifact is incompatible with the installed scikit-learn: {path}: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Could not load serialized artifact {path}: {type(exc).__name__}: {exc}") from exc


def _result(model_name: str, model_version: str, status: str, input_features: dict,
            output: dict, data_quality: str, provenance: dict, limitations: list[str]) -> dict:
    result = {"model_name": model_name, "model_version": model_version, "status": status,
              "input_features": input_features, "output": output, "data_quality": data_quality,
              "provenance": provenance, "limitations": limitations,
              "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    if not all(isinstance(result[k], str) and result[k] for k in ("model_name", "model_version", "status", "data_quality", "generated_at_utc")):
        raise RuntimeError("Inference response metadata schema is invalid")
    if not isinstance(result["input_features"], dict) or not isinstance(result["output"], dict) or not isinstance(result["provenance"], dict) or not isinstance(result["limitations"], list):
        raise RuntimeError("Inference response schema is invalid")
    try:
        parsed_timestamp = datetime.fromisoformat(result["generated_at_utc"].replace("Z", "+00:00"))
    except ValueError as exc:
        raise RuntimeError("Inference response timestamp is invalid") from exc
    if parsed_timestamp.tzinfo is None or parsed_timestamp.utcoffset() is None:
        raise RuntimeError("Inference response timestamp must include a UTC offset")
    return result


def _validated_units(data: Mapping[str, Any], expected: Mapping[str, str], *, unit_field: str = "units") -> Mapping[str, Any]:
    data = _mapping(data)
    if set(data) != set(expected) | {unit_field}:
        missing = sorted((set(expected) | {unit_field}) - set(data))
        unknown = sorted(set(data) - set(expected) - {unit_field})
        details = []
        if missing:
            details.append("Missing required inputs: " + ", ".join(missing))
        if unknown:
            details.append("Unknown input fields: " + ", ".join(unknown))
        raise ValueError("; ".join(details))
    units = data[unit_field]
    if not isinstance(units, Mapping) or dict(units) != dict(expected):
        raise ValueError(f"{unit_field} must exactly match required units: {dict(expected)}")
    return {key: data[key] for key in expected}


def _number(value: Any, name: str, *, low: float | None = None,
            high: float | None = None) -> float:
    if value is None or isinstance(value, (bool, np.bool_)) or not isinstance(value, (int, float, np.number)):
        raise ValueError(f"{name} is required and must be numeric")
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name} is required and must be numeric") from exc
    if not math.isfinite(result):
        raise ValueError(f"{name} must be finite")
    if low is not None and result < low or high is not None and result > high:
        raise ValueError(f"{name} must be in [{low if low is not None else '-inf'}, {high if high is not None else 'inf'}]")
    return result


def _required(data: Mapping[str, Any], keys: list[str]) -> dict[str, float]:
    data = _mapping(data)
    unknown = sorted(set(data) - set(keys))
    if unknown:
        raise ValueError("Unknown input fields: " + ", ".join(unknown))
    missing = [k for k in keys if k not in data or data[k] is None]
    if missing:
        raise ValueError("Missing required inputs: " + ", ".join(missing))
    return {k: _number(data[k], k) for k in keys}


class CardiovascularInference:
    """Experimental unsupervised deviation score; never a diagnosis/alert."""
    model_name = "cardiovascular_anomaly_detector"
    model_version = "1.0.0-experimental"
    feature_cols = ["mean_hr_bpm", "mean_rr_ms", "sdnn_ms", "rmssd_ms",
                    "pnn50_pct", "sbp_mean", "dbp_mean", "map_mean", "pp_mean"]

    def __init__(self):
        path = os.path.join(MODELS_DIR, "cardiovascular", "cardiovascular_anomaly_detector.joblib")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Experimental cardiovascular artifact not found: {path}")
        self.pipeline = _load_artifact(path)
        if not hasattr(self.pipeline, "decision_function") or getattr(self.pipeline, "n_features_in_", None) != len(self.feature_cols):
            raise RuntimeError("Cardiovascular artifact schema mismatch: expected decision_function with exactly 9 trained features")

    def predict(self, input_data: Mapping[str, Any]) -> dict[str, Any]:
        expected_units = {"mean_hr_bpm": "beats/min", "mean_rr_ms": "ms", "sdnn_ms": "ms",
                          "rmssd_ms": "ms", "pnn50_pct": "%", "sbp_mean": "mmHg",
                          "dbp_mean": "mmHg", "map_mean": "mmHg", "pp_mean": "mmHg"}
        raw_features = _validated_units(input_data, expected_units)
        f = _required(raw_features, self.feature_cols)
        for key in ("mean_hr_bpm", "mean_rr_ms", "sdnn_ms", "rmssd_ms", "sbp_mean", "dbp_mean", "map_mean", "pp_mean"):
            if f[key] <= 0:
                raise ValueError(f"{key} must be > 0")
        if not 0 <= f["pnn50_pct"] <= 100:
            raise ValueError("pnn50_pct must be in [0, 100]")
        if f["sbp_mean"] <= f["dbp_mean"]:
            raise ValueError("sbp_mean must exceed dbp_mean")
        score = float(self.pipeline.decision_function(np.array([[f[k] for k in self.feature_cols]]))[0])
        if not math.isfinite(score):
            raise RuntimeError("Cardiovascular artifact produced a non-finite score")
        return _result(self.model_name, self.model_version, "experimental", {**f, "units": expected_units},
                {"unsupervised_deviation_score": score}, "validated_numeric_inputs",
                {"artifact": "models/cardiovascular/cardiovascular_anomaly_detector.joblib",
                 "training_records": 184, "independent_records": 4},
                ["Score is statistical deviation only; not an arrhythmia, disease probability, or clinical alert.",
                 "No verified anomaly labels or independent validation are available."])


class SleepRecoveryInference:
    def predict(self, input_data):
        raise RuntimeError("Sleep efficiency prediction is quarantined: training inputs include components that define the target. Use recorded sleep measurements/analytics instead.")


class StressCircadianInference:
    def predict(self, input_data):
        raise RuntimeError("Stress/anxiety prediction is quarantined. Use measured cortisol, melatonin, and questionnaire values as separate observations.")


class ImmuneTrajectoryInference:
    """Exploratory PCA projection only; no recovery-state label is produced."""
    def __init__(self):
        path = os.path.join(MODELS_DIR, "immune", "immune_trajectory_pca.joblib")
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        self.artifact = _load_artifact(path)
        if not isinstance(self.artifact, dict) or not isinstance(self.artifact.get("feature_genes"), (list, tuple)) or not self.artifact["feature_genes"] or len(set(self.artifact["feature_genes"])) != len(self.artifact["feature_genes"]) or not hasattr(self.artifact.get("pipeline"), "transform"):
            raise RuntimeError("Immune PCA artifact schema is invalid: expected unique feature_genes and a transform-capable pipeline")

    def predict(self, gene_log2fc_dict: Mapping[str, Any]) -> dict[str, Any]:
        gene_log2fc_dict = _mapping(gene_log2fc_dict)
        genes = list(self.artifact["feature_genes"])
        gene_log2fc_dict = _validated_units(gene_log2fc_dict, {gene: "log2_fold_change" for gene in genes})
        unknown = sorted(set(gene_log2fc_dict) - set(genes))
        if unknown:
            raise ValueError("Unknown immune PCA features: " + ", ".join(unknown))
        f = _required(gene_log2fc_dict, genes)
        coords = self.artifact["pipeline"].transform(np.array([[f[g] for g in genes]]))[0]
        coords = [float(c) for c in coords]
        if not all(math.isfinite(c) for c in coords):
            raise RuntimeError("Immune PCA artifact produced non-finite coordinates")
        return _result("immune_trajectory_pca", "1.0.0-exploratory", "exploratory",
                {**f, "units": {gene: "log2_fold_change" for gene in genes}},
                {"pca_coordinates": coords}, "validated_complete_feature_set",
                {"artifact": "models/immune/immune_trajectory_pca.joblib", "feature_count": len(genes)},
                ["PCA visualization/projection only; coordinates are not a clinical score or recovery classification.",
                 "Input must use the feature definition and preprocessing documented with the artifact."])


class MetabolicBiomarkerInference:
    def predict(self, input_data):
        raise RuntimeError("Proteomics classifier is quarantined for general inference: only four astronauts underpin the reported leave-one-astronaut-out evaluation. Research artifact retained; no health-state output is exposed.")


class RadiationDosimetryInference:
    """Input is explicitly absorbed dose per day (mGy); no mGy-to-mSv conversion."""
    def predict(self, input_data: Mapping[str, Any]) -> dict[str, Any]:
        input_data = _mapping(input_data)
        allowed = {"daily_absorbed_dose_mgy", "unit"}
        if set(input_data) - allowed:
            raise ValueError("Unknown radiation fields: " + ", ".join(sorted(set(input_data) - allowed)))
        if input_data.get("unit", "mGy/day") != "mGy/day":
            raise ValueError("daily_absorbed_dose_mgy unit must be exactly 'mGy/day'")
        if "daily_absorbed_dose_mgy" not in input_data:
            raise ValueError("daily_absorbed_dose_mgy is required; no default dose is assumed")
        raw = input_data["daily_absorbed_dose_mgy"]
        if not isinstance(raw, (list, tuple, np.ndarray)) or isinstance(raw, (str, bytes)):
            raise ValueError("daily_absorbed_dose_mgy must be a numeric 1D array")
        if any(isinstance(x, (bool, np.bool_)) or not isinstance(x, (int, float, np.number)) for x in raw):
            raise ValueError("daily_absorbed_dose_mgy must contain only numeric values, not booleans or strings")
        a = np.asarray(raw, dtype=float)
        if a.ndim != 1 or a.size == 0 or not np.all(np.isfinite(a)):
            raise ValueError("daily_absorbed_dose_mgy must be a non-empty 1D array of finite values")
        if np.any(a < 0):
            raise ValueError("absorbed dose values cannot be negative")
        return _result("radiation_dosimetry_engine", "2.0.0-deterministic", "deterministic_analytics", {"days_monitored": int(a.size), "unit": "mGy/day"},
                {"cumulative_absorbed_dose_mgy": float(a.sum()),
                           "mean_daily_absorbed_dose_mgy": float(a.mean()),
                           "radiation_spike_days_statistical_only": [int(i+1) for i,x in enumerate(a) if x > np.median(a)+3*max(0.05,1.4826*np.median(np.abs(a-np.median(a))))]},
                "validated_finite_nonnegative", {"input_quantity": "user-supplied absorbed dose", "conversion_applied": False},
                ["No equivalent/effective dose conversion: radiation spectrum, dosimetric quantity, and applicable weighting are not provided.",
                 "No regulatory limit or safety determination is calculated.", "Spike flags are distributional summaries, not hazard alerts."])


class OcularBoneInference:
    """Return supplied observations only; no thresholds, diagnoses, or forecasts."""
    def predict(self, input_data: Mapping[str, Any]) -> dict[str, Any]:
        input_data = _mapping(input_data)
        allowed = ("current_onsd_mm", "baseline_onsd_mm", "bmd_t_score")
        unknown = sorted(set(input_data) - set(allowed))
        if unknown:
            raise ValueError("Unknown ocular/bone fields: " + ", ".join(unknown))
        supplied = {k: _number(input_data[k], k, low=0 if k.endswith("onsd_mm") else None)
                    for k in allowed if k in input_data and input_data[k] is not None}
        if not supplied:
            raise ValueError("Provide at least one measured field: " + ", ".join(allowed))
        return _result("ocular_bone_observations", "2.0.0-observational", "observations_only", supplied, dict(supplied),
                "validated_numeric_inputs", {"source": "caller-supplied measurement"},
                ["No SANS classification, ICP estimate, bone diagnosis, future projection, or treatment recommendation is produced."])


class PerformanceActivityInference:
    def predict(self, input_data):
        raise RuntimeError("Physical-performance regression is quarantined because its target was constructed from predictor features. Use direct activity measurements and descriptive summaries.")
