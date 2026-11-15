"""Pydantic validation schemas for SOLARIS ML service.

Preserves physical units, enforces strict feature requirements without silent defaults,
and includes mandatory non-diagnostic clinical safety disclaimers.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
import numpy as np
from pydantic import BaseModel, Field, field_validator, ConfigDict


CLINICAL_SAFETY_DISCLAIMER = (
    "OPERATIONAL DECISION-SUPPORT PROTOTYPE ONLY: This system is designed for spaceflight "
    "operational telemetry anomaly screening. Statistical anomaly scores and risk band "
    "classifications are experimental decision-support metrics and must NEVER be interpreted "
    "as clinical diagnoses, disease probabilities, or certified medical judgments. "
    "No claim of FDA or clinical validation is made."
)


FEATURE_NAMES: List[str] = [
    "heart_rate_bpm",
    "hrv_rmssd_ms",
    "ectopic_jumps_hr",
    "spo2_pct",
    "cranial_ptt_ms",
    "resp_rate_brm",
    "skin_temp_c",
    "radiation_msv_day",
    "sleep_hours",
    "circadian_align_pct",
    "spine_pain_score",
    "skin_irritation_score",
]


FEATURE_METADATA: Dict[str, Dict[str, Any]] = {
    "heart_rate_bpm": {
        "unit": "bpm",
        "description": "Resting heart rate from 3-lead thoracic ECG",
        "baseline_median": 70.0,
        "valid_min": 20.0,
        "valid_max": 250.0,
    },
    "hrv_rmssd_ms": {
        "unit": "ms",
        "description": "Heart Rate Variability RMSSD from continuous ECG R-R intervals",
        "baseline_median": 65.0,
        "valid_min": 0.0,
        "valid_max": 350.0,
    },
    "ectopic_jumps_hr": {
        "unit": "events/hr",
        "description": "Frequency of premature or irregular ectopic ventricular/atrial beats",
        "baseline_median": 0.0,
        "valid_min": 0.0,
        "valid_max": 100.0,
    },
    "spo2_pct": {
        "unit": "%",
        "description": "Peripheral arterial blood oxygen saturation via forehead optical PPG",
        "baseline_median": 99.0,
        "valid_min": 50.0,
        "valid_max": 100.0,
    },
    "cranial_ptt_ms": {
        "unit": "ms",
        "description": "Cranial Pulse Transit Time indexing cephalad microgravity fluid shift",
        "baseline_median": 185.0,
        "valid_min": 50.0,
        "valid_max": 500.0,
    },
    "resp_rate_brm": {
        "unit": "breaths/min",
        "description": "Respiratory rate from dual-band thoracic/abdominal inductance plethysmography",
        "baseline_median": 13.5,
        "valid_min": 4.0,
        "valid_max": 60.0,
    },
    "skin_temp_c": {
        "unit": "°C",
        "description": "Cutaneous dermal interface temperature",
        "baseline_median": 36.6,
        "valid_min": 20.0,
        "valid_max": 45.0,
    },
    "radiation_msv_day": {
        "unit": "mSv/day",
        "description": "Active daily ionizing radiation dose equivalent rate (HERA/CPD)",
        "baseline_median": 0.35,
        "valid_min": 0.0,
        "valid_max": 100.0,
    },
    "sleep_hours": {
        "unit": "hours",
        "description": "Total sleep duration logged via NASA ARCHER wristband actigraphy",
        "baseline_median": 7.5,
        "valid_min": 0.0,
        "valid_max": 24.0,
    },
    "circadian_align_pct": {
        "unit": "%",
        "description": "Circadian phase alignment index relative to 24h ISS zeitgeber cycle",
        "baseline_median": 90.0,
        "valid_min": 0.0,
        "valid_max": 100.0,
    },
    "spine_pain_score": {
        "unit": "0-10 NRS",
        "description": "Self-reported or verbal microgravity spinal elongation unloading discomfort",
        "baseline_median": 0.0,
        "valid_min": 0.0,
        "valid_max": 10.0,
    },
    "skin_irritation_score": {
        "unit": "0-10 NRS",
        "description": "Sensor-garment cutaneous interface erythema/irritation score",
        "baseline_median": 0.0,
        "valid_min": 0.0,
        "valid_max": 10.0,
    },
}


class OperationalStatus(str, Enum):
    NOMINAL = "NOMINAL"
    CAUTION = "CAUTION"
    CRITICAL = "CRITICAL"
    UNAVAILABLE = "UNAVAILABLE"


class ModelLoadState(str, Enum):
    LOADED = "LOADED"
    UNAVAILABLE = "UNAVAILABLE"
    PENDING = "PENDING"
    LOAD_FAILED = "LOAD_FAILED"


class BiometricTelemetryInput(BaseModel):
    """Strictly validated biometric and spaceflight environmental telemetry inputs.
    
    All 12 features are required. Missing values will cause a validation error
    rather than fabricating synthetic defaults.
    """
    model_config = ConfigDict(extra="forbid")

    heart_rate_bpm: float = Field(
        ...,
        ge=20.0,
        le=250.0,
        description="Heart rate in beats per minute (BPM) [Range: 20-250 bpm]",
    )
    hrv_rmssd_ms: float = Field(
        ...,
        ge=0.0,
        le=350.0,
        description="Heart Rate Variability RMSSD in milliseconds (ms) [Range: 0-350 ms]",
    )
    ectopic_jumps_hr: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Premature or ectopic cardiac beats per hour (events/hr) [Range: 0-100 events/hr]",
    )
    spo2_pct: float = Field(
        ...,
        ge=50.0,
        le=100.0,
        description="Blood oxygen saturation percentage (% SpO2) [Range: 50.0-100.0%]",
    )
    cranial_ptt_ms: float = Field(
        ...,
        ge=50.0,
        le=500.0,
        description="Cranial Pulse Transit Time in milliseconds (ms) [Range: 50-500 ms]",
    )
    resp_rate_brm: float = Field(
        ...,
        ge=4.0,
        le=60.0,
        description="Respiratory rate in breaths per minute (breaths/min) [Range: 4-60 breaths/min]",
    )
    skin_temp_c: float = Field(
        ...,
        ge=20.0,
        le=45.0,
        description="Cutaneous skin temperature in degrees Celsius (°C) [Range: 20.0-45.0 °C]",
    )
    radiation_msv_day: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Daily ionizing radiation dose rate in millisieverts per day (mSv/day) [Range: 0.0-100.0 mSv/day]",
    )
    sleep_hours: float = Field(
        ...,
        ge=0.0,
        le=24.0,
        description="Sleep duration in hours (hrs) [Range: 0.0-24.0 hrs]",
    )
    circadian_align_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Circadian phase alignment index percentage (%) [Range: 0.0-100.0%]",
    )
    spine_pain_score: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Microgravity spinal elongation discomfort rating on 0-10 Numerical Rating Scale [Range: 0.0-10.0]",
    )
    skin_irritation_score: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Sensor contact interface erythema rating on 0-10 Numerical Rating Scale [Range: 0.0-10.0]",
    )

    def to_feature_vector(self) -> np.ndarray:
        """Converts telemetry fields into an ordered 2D numpy array (1, 12)."""
        values = [getattr(self, name) for name in FEATURE_NAMES]
        return np.array([values], dtype=np.float64)

    def to_feature_dict(self) -> Dict[str, float]:
        """Returns feature values mapped by feature name."""
        return {name: float(getattr(self, name)) for name in FEATURE_NAMES}


class FeatureContribution(BaseModel):
    """Explains an individual feature's contribution to operational classification."""
    feature: str
    unit: str
    value: float
    baseline_median: float
    impact_score: float
    deviation_direction: str = Field(
        ...,
        description="'ELEVATED' if above nominal baseline median, 'DEPRESSED' if below, 'NOMINAL' if aligned",
    )


class AnomalyAssessment(BaseModel):
    """Statistical anomaly detection output from Isolation Forest.
    
    IMPORTANT: The anomaly_score is an unsupervised statistical outlier index
    and MUST NOT be interpreted as a disease probability or clinical condition.
    """
    is_anomaly: bool = Field(
        ...,
        description="True if Isolation Forest flags physiological feature combination as statistical outlier",
    )
    anomaly_score: float = Field(
        ...,
        description="Continuous statistical decision function score (negative values denote outlier divergence). NOT a disease probability.",
    )
    interpretation: str = Field(
        default="Statistical multidimensional outlier detection in telemetry space. NOT a disease probability or clinical diagnosis.",
        description="Safety interpretation label clarifying non-clinical statistical nature of score",
    )


class InferenceRequest(BaseModel):
    """Inference request requiring strictly validated features."""
    features: BiometricTelemetryInput
    crew_id: Optional[str] = Field(None, description="Optional crew identifier (e.g., 'vance', 'patel', 'chen')")
    context_notes: Optional[str] = Field(None, description="Optional mission context notes")


class InferenceResponse(BaseModel):
    """Structured inference response preserving provenance, safety notices, and units."""
    model_version: str
    model_name: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: OperationalStatus
    confidence_pct: Optional[float] = Field(
        None,
        description="Random Forest decision tree ensemble confidence percentage (0-100%)",
    )
    class_probabilities: Optional[Dict[str, float]] = Field(
        None,
        description="Ensemble class probability distribution: NOMINAL, CAUTION, CRITICAL",
    )
    is_anomaly: bool = Field(
        ...,
        description="True if Isolation Forest flags physiological feature combination as statistical outlier",
    )
    anomaly_score: float = Field(
        ...,
        description="Continuous statistical decision function score (negative values denote outlier divergence). NOT a disease probability.",
    )
    anomaly: AnomalyAssessment
    top_contributing_factors: List[FeatureContribution] = Field(
        default_factory=list,
        description="Top physiological telemetry features driving classification",
    )
    causal_explanation: Optional[str] = Field(
        None,
        description="Operational physiological explanation grounded in feature deviations",
    )
    countermeasures: List[str] = Field(
        default_factory=list,
        description="Recommended operational NASA spaceflight countermeasures",
    )
    clinical_disclaimer: str = Field(default=CLINICAL_SAFETY_DISCLAIMER)


class AssessmentRequest(BaseModel):
    """Request for holistic crew assessment combining verbal check-in and telemetry."""
    crew_name: Optional[str] = Field(None, description="Crew name or callsign (e.g., 'vance', 'Commander Vance')")
    crew_id: Optional[str] = Field(None, description="Unique crew ID (e.g., 'vance', 'patel', 'chen')")
    transcript: Optional[str] = Field(None, description="Spoken verbal check-in transcript")
    features: Optional[BiometricTelemetryInput] = Field(
        None,
        description="Explicit telemetry features. If omitted, features are loaded from verified crew telemetry.",
    )
    sleep_issue: Optional[bool] = Field(None, description="Explicit flag for acute sleep disruption")
    skin_issue: Optional[bool] = Field(None, description="Explicit flag for dermal irritation")
    spine_issue: Optional[bool] = Field(None, description="Explicit flag for microgravity spine elongation pain")
    update_database: Optional[bool] = Field(
        default=False,
        description="Whether to persist check-in transcript and symptom updates to SQLite database",
    )


class AssessmentResponse(BaseModel):
    """Comprehensive response for astronaut assessment."""
    crew_id: Optional[str]
    crew_name: Optional[str]
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    detected_symptoms: Dict[str, bool]
    symptom_adjustments_applied: Optional[Dict[str, float]] = None
    ml_analysis: InferenceResponse
    spoken_briefing: str
    countermeasures: List[str]
    clinical_disclaimer: str = Field(default=CLINICAL_SAFETY_DISCLAIMER)


class ModelArtifactStatus(BaseModel):
    """Honest operational status of an individual ML model artifact."""
    model_id: str
    name: str
    version: str
    status: ModelLoadState
    file_path: str
    artifact_exists: bool
    features_expected: List[str] = Field(default_factory=lambda: list(FEATURE_NAMES))
    loaded_at: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MLStatusResponse(BaseModel):
    """Aggregate ML service status reporting loaded artifacts honestly."""
    overall_status: str = Field(..., description="'OPERATIONAL', 'DEGRADED', or 'UNAVAILABLE'")
    models: Dict[str, ModelArtifactStatus]
    engine: str = "Scikit-Learn Random Forest + Isolation Forest"
    mode: str = "100% LOCAL AIR-GAPPED"
    clinical_disclaimer: str = Field(default=CLINICAL_SAFETY_DISCLAIMER)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
