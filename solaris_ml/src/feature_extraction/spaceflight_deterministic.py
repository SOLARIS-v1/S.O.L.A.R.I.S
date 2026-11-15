"""Validated descriptive functions for caller-supplied spaceflight observations.

These functions intentionally do not infer clinical risk or convert absorbed to
effective dose without radiation-field/dosimetric metadata.
"""
import numpy as np


def _finite_scalar(value, name):
    if isinstance(value, (bool, np.bool_)) or not isinstance(value, (int, float, np.number)):
        raise ValueError(f"{name} must be a numeric scalar")
    result = float(value)
    if not np.isfinite(result):
        raise ValueError(f"{name} must be finite")
    return result


def _numeric_vector(values, name):
    if not isinstance(values, (list, tuple, np.ndarray)):
        raise ValueError(f"{name} must be a 1D sequence of numeric values")
    if any(isinstance(x, (bool, np.bool_)) or not isinstance(x, (int, float, np.number)) for x in values):
        raise ValueError(f"{name} must contain numeric values, not booleans or strings")
    result = np.asarray(values, dtype=float)
    if result.ndim != 1 or result.size == 0 or not np.all(np.isfinite(result)):
        raise ValueError(f"{name} must be a non-empty 1D sequence of finite values")
    return result


def calculate_radiation_exposure(daily_rates_mgy, radiation_quality_factor=None, mission_days=None):
    """Summarize absorbed dose in mGy only. Legacy Q argument is rejected."""
    if radiation_quality_factor is not None:
        raise ValueError("Quality-factor conversion is unsupported without radiation spectrum and dosimetric context")
    rates = _numeric_vector(daily_rates_mgy, "daily_rates_mgy")
    if np.any(rates < 0):
        raise ValueError("daily_rates_mgy must be a non-empty 1D array of finite nonnegative values")
    if mission_days is not None:
        if isinstance(mission_days, (bool, np.bool_)) or not isinstance(mission_days, (int, np.integer)) or mission_days < rates.size:
            raise ValueError("mission_days must be an integer at least as large as the number of supplied daily values")
    med = float(np.median(rates))
    mad = float(np.median(np.abs(rates-med)))
    threshold = med + 3 * max(0.05, 1.4826 * mad)
    return {"cumulative_absorbed_dose_mgy": float(rates.sum()),
            "mean_daily_absorbed_dose_mgy": float(rates.mean()),
            "days_monitored": int(rates.size),
            "radiation_spike_days_statistical_only": [int(i+1) for i,x in enumerate(rates) if x > threshold],
            "effective_dose_msv": None,
            "safety_status": "not_assessed"}


def evaluate_ocular_health(onsd_measurements_mm, baseline_onsd_mm=None):
    """Return ONSD observations and optional trend without assigning risk tiers."""
    values = _numeric_vector(onsd_measurements_mm, "onsd_measurements_mm")
    if np.any(values <= 0):
        raise ValueError("onsd_measurements_mm must be a non-empty 1D array of finite positive values")
    result = {"current_onsd_mm": float(values[-1]), "measurement_count": int(values.size),
              "sans_risk_tier": None, "clinical_action": None}
    if baseline_onsd_mm is not None:
        baseline = _finite_scalar(baseline_onsd_mm, "baseline_onsd_mm")
        if baseline <= 0:
            raise ValueError("baseline_onsd_mm must be finite and positive")
        result["baseline_onsd_mm"] = baseline
        result["delta_from_baseline_mm"] = float(values[-1]-baseline)
    if values.size >= 3:
        result["trend_slope_per_observation"] = float(np.polyfit(np.arange(values.size), values, 1)[0])
    return result


def evaluate_bone_health(current_t_score, baseline_t_score=None, mission_month=None, exercise_countermeasure_compliance=None):
    """Return supplied T-score observation only; no diagnosis/projection."""
    current = _finite_scalar(current_t_score, "current_t_score")
    result = {"current_bmd_t_score": current, "bone_health_status": None,
              "projected_6mo_bmd_loss_pct": None, "countermeasure_recommendation": None}
    if baseline_t_score is not None:
        baseline = _finite_scalar(baseline_t_score, "baseline_t_score")
        result["baseline_t_score"] = baseline
        result["delta_t_from_baseline"] = current-baseline
    return result
