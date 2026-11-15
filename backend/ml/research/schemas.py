"""Pydantic schemas for the SOLARIS research ML package.

Strictly enforces feature names, required physical units, finite numbers,
UTC ISO timestamps, and prominent non-clinical scientific limitations.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import math
from pydantic import BaseModel, Field, model_validator, ConfigDict


RESEARCH_CLINICAL_DISCLAIMER = (
    "RESEARCH / OBSERVATIONAL PLATFORM ONLY: All models and analytics in this package "
    "are non-diagnostic research indices and observational summaries. They are NOT "
    "clinically validated, certified by the FDA, or approved for diagnostic decision-making. "
    "Predictive sleep, stress, and proteomics classifiers remain strictly quarantined."
)

CARDIO_EXPECTED_UNITS = {
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


class CardiovascularAnalysisRequest(BaseModel):
    """Input payload for cardiovascular anomaly detection."""
    model_config = ConfigDict(extra="forbid")

    mean_hr_bpm: float = Field(..., description="Mean heart rate in beats/min (> 0)")
    mean_rr_ms: float = Field(..., description="Mean R-R interval in ms (> 0)")
    sdnn_ms: float = Field(..., description="SDNN in ms (> 0)")
    rmssd_ms: float = Field(..., description="RMSSD in ms (> 0)")
    pnn50_pct: float = Field(..., ge=0.0, le=100.0, description="Percentage of successive RR differences > 50ms [0, 100]")
    sbp_mean: float = Field(..., description="Systolic blood pressure in mmHg (> 0)")
    dbp_mean: float = Field(..., description="Diastolic blood pressure in mmHg (> 0)")
    map_mean: float = Field(..., description="Mean arterial pressure in mmHg (> 0)")
    pp_mean: float = Field(..., description="Pulse pressure in mmHg (> 0)")
    units: Dict[str, str] = Field(
        ...,
        description="Explicit physical units mapping matching CARDIO_EXPECTED_UNITS",
    )
    astronaut_id: Optional[str] = Field(None, description="Optional astronaut ID (e.g. 'vance', 'patel', 'chen')")

    @model_validator(mode="after")
    def validate_cardio_physics(self) -> "CardiovascularAnalysisRequest":
        # Validate units
        if self.units != CARDIO_EXPECTED_UNITS:
            raise ValueError(f"units dictionary must exactly match required units: {CARDIO_EXPECTED_UNITS}")

        # Validate positivity
        for key in ("mean_hr_bpm", "mean_rr_ms", "sdnn_ms", "rmssd_ms", "sbp_mean", "dbp_mean", "map_mean", "pp_mean"):
            val = getattr(self, key)
            if isinstance(val, bool) or not math.isfinite(val) or val <= 0:
                raise ValueError(f"{key} must be a finite numeric value > 0")

        if self.sbp_mean <= self.dbp_mean:
            raise ValueError("sbp_mean must exceed dbp_mean")

        return self

    def to_inference_dict(self) -> Dict[str, Any]:
        d = {
            "mean_hr_bpm": self.mean_hr_bpm,
            "mean_rr_ms": self.mean_rr_ms,
            "sdnn_ms": self.sdnn_ms,
            "rmssd_ms": self.rmssd_ms,
            "pnn50_pct": self.pnn50_pct,
            "sbp_mean": self.sbp_mean,
            "dbp_mean": self.dbp_mean,
            "map_mean": self.map_mean,
            "pp_mean": self.pp_mean,
            "units": dict(self.units),
        }
        return d


class CardiovascularAnalysisResponse(BaseModel):
    """Standardized response from cardiovascular anomaly detector."""
    model_name: str = "cardiovascular_anomaly_detector"
    model_version: str = "1.0.0-experimental"
    status: str = "experimental"
    input_features: Dict[str, Any]
    output: Dict[str, float]
    data_quality: str
    provenance: Dict[str, Any]
    limitations: List[str]
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class ImmuneTrajectoryRequest(BaseModel):
    """Input payload for immune trajectory PCA projection."""
    gene_log2fc: Dict[str, float] = Field(
        ...,
        description="Gene expression log2 fold changes for all required feature genes",
    )
    units: Dict[str, str] = Field(
        ...,
        description="Units mapping each gene to 'log2_fold_change'",
    )
    astronaut_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_finite_and_units(self) -> "ImmuneTrajectoryRequest":
        for gene, val in self.gene_log2fc.items():
            if isinstance(val, bool) or not math.isfinite(val):
                raise ValueError(f"Gene '{gene}' log2fc must be a finite float")
            unit = self.units.get(gene)
            if unit != "log2_fold_change":
                raise ValueError(f"Gene '{gene}' unit must be 'log2_fold_change', got '{unit}'")
        return self


class ImmuneTrajectoryResponse(BaseModel):
    """Standardized response from immune PCA projection."""
    model_name: str = "immune_trajectory_pca"
    model_version: str = "1.0.0-exploratory"
    status: str = "exploratory"
    input_features: Dict[str, Any]
    output: Dict[str, Any]
    data_quality: str
    provenance: Dict[str, Any]
    limitations: List[str]
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class RadiationSummaryRequest(BaseModel):
    """Input payload for radiation dosimetry engine."""
    daily_absorbed_dose_mgy: List[float] = Field(
        ...,
        description="Non-empty list of daily absorbed dose values in mGy (finite, >= 0)",
    )
    unit: str = Field(
        default="mGy/day",
        description="Unit must be explicitly 'mGy/day'",
    )
    astronaut_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_radiation(self) -> "RadiationSummaryRequest":
        if self.unit != "mGy/day":
            raise ValueError("Radiation unit must be exactly 'mGy/day'")
        if not self.daily_absorbed_dose_mgy:
            raise ValueError("daily_absorbed_dose_mgy must be a non-empty sequence")
        for idx, val in enumerate(self.daily_absorbed_dose_mgy):
            if isinstance(val, bool) or not math.isfinite(val) or val < 0:
                raise ValueError(f"Dose at day {idx+1} must be a finite numeric value >= 0")
        return self


class RadiationSummaryResponse(BaseModel):
    """Standardized response from radiation dosimetry engine."""
    model_name: str = "radiation_dosimetry_engine"
    model_version: str = "2.0.0-deterministic"
    status: str = "deterministic_analytics"
    input_features: Dict[str, Any]
    output: Dict[str, Any]
    data_quality: str
    provenance: Dict[str, Any]
    limitations: List[str]
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class OcularBoneRequest(BaseModel):
    """Input payload for ocular and bone observations."""
    current_onsd_mm: Optional[float] = Field(None, description="Optic Nerve Sheath Diameter in mm (> 0)")
    baseline_onsd_mm: Optional[float] = Field(None, description="Baseline ONSD in mm (> 0)")
    bmd_t_score: Optional[float] = Field(None, description="Bone Mineral Density DXA T-Score (finite)")
    astronaut_id: Optional[str] = None

    @model_validator(mode="after")
    def validate_observations(self) -> "OcularBoneRequest":
        if self.current_onsd_mm is None and self.baseline_onsd_mm is None and self.bmd_t_score is None:
            raise ValueError("Provide at least one observation: current_onsd_mm, baseline_onsd_mm, or bmd_t_score")
        if self.current_onsd_mm is not None:
            if isinstance(self.current_onsd_mm, bool) or not math.isfinite(self.current_onsd_mm) or self.current_onsd_mm <= 0:
                raise ValueError("current_onsd_mm must be finite and > 0")
        if self.baseline_onsd_mm is not None:
            if isinstance(self.baseline_onsd_mm, bool) or not math.isfinite(self.baseline_onsd_mm) or self.baseline_onsd_mm <= 0:
                raise ValueError("baseline_onsd_mm must be finite and > 0")
        if self.bmd_t_score is not None:
            if isinstance(self.bmd_t_score, bool) or not math.isfinite(self.bmd_t_score):
                raise ValueError("bmd_t_score must be a finite float")
        return self


class OcularBoneResponse(BaseModel):
    """Standardized response from ocular & bone observations."""
    model_name: str = "ocular_bone_observations"
    model_version: str = "2.0.0-observational"
    status: str = "observations_only"
    input_features: Dict[str, Any]
    output: Dict[str, Any]
    data_quality: str
    provenance: Dict[str, Any]
    limitations: List[str]
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class SleepAnalyticsResponse(BaseModel):
    """Descriptive polysomnography/actigraphy sleep analytics."""
    astronaut_id: str
    model_status: str = "quarantined_target_leakage"
    status_note: str = (
        "Predictive sleep efficiency model is quarantined due to target leakage; "
        "displaying validated recorded measurements and descriptive analytics only."
    )
    metrics: Dict[str, Any]
    limitations: List[str] = Field(
        default_factory=lambda: [
            "Predictive model is disabled; metrics are descriptive summaries of recorded actigraphy.",
            "Sleep efficiency is defined by recorded TST/TIB, not inferred by ML regression.",
        ]
    )
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class ImmuneAnalyticsResponse(BaseModel):
    """Longitudinal omics and immune repertoire analytics."""
    astronaut_id: str
    model_status: str = "exploratory"
    trajectory: Optional[ImmuneTrajectoryResponse] = None
    output: Dict[str, Any] = Field(default_factory=dict)
    diversity_metrics: Dict[str, Any] = Field(default_factory=dict)
    limitations: List[str] = Field(
        default_factory=lambda: [
            "PCA projection is exploratory only; coordinates are not a clinical recovery classification.",
            "No diagnostic claims or risk tiers are assigned.",
        ]
    )
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class MetabolicAnalyticsResponse(BaseModel):
    """Plasma metabolomics and amino acid analytics."""
    astronaut_id: str
    model_status: str = "quarantined_experimental"
    status_note: str = (
        "Proteomics classifier is quarantined (only 4 astronauts underpinning reported accuracy, "
        "unvalidated generalization); displaying descriptive biomarker observations only."
    )
    biomarkers: Dict[str, Any] = Field(default_factory=dict)
    limitations: List[str] = Field(
        default_factory=lambda: [
            "Proteomics ML classifier disabled per safety quarantine.",
            "Biomarkers are descriptive measurements and do not represent a diagnosed health state.",
        ]
    )
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class AstronautInsightsResponse(BaseModel):
    """Holistic multi-system operational insights for a crew member."""
    astronaut_id: str
    astronaut_name: str
    mission_sol: int = 142
    cardiovascular: Optional[CardiovascularAnalysisResponse] = None
    sleep: Optional[SleepAnalyticsResponse] = None
    radiation: Optional[RadiationSummaryResponse] = None
    ocular: Optional[OcularBoneResponse] = None
    bone: Optional[OcularBoneResponse] = None
    immune: Optional[ImmuneAnalyticsResponse] = None
    metabolic: Optional[MetabolicAnalyticsResponse] = None
    clinical_disclaimer: str = RESEARCH_CLINICAL_DISCLAIMER
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )


class ResearchRegistryResponse(BaseModel):
    """Contents of reports/model_registry.json."""
    registry_version: str
    policy: str
    models: List[Dict[str, Any]]
    artifact_compatibility: Dict[str, Any]


class ResearchStatusResponse(BaseModel):
    """Current operational and quarantine status of research models."""
    overall_status: str = "OPERATIONAL"
    package_status: str = "VERIFIED_OPERATIONAL"
    policy: str
    models: Dict[str, Dict[str, Any]]
    quarantined_count: int
    enabled_count: int
    runtime_sklearn_version: str
    generated_at_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    )
