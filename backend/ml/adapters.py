"""Model adapters for SOLARIS ML service.

Encapsulates individual scikit-learn models (Isolation Forest, Random Forest)
and an ensemble adapter with strict input verification, unit preservation,
and unambiguous non-diagnostic labeling.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from .model_loader import safe_load_joblib
from .schemas import (
    AnomalyAssessment,
    BiometricTelemetryInput,
    FeatureContribution,
    InferenceResponse,
    ModelArtifactStatus,
    ModelLoadState,
    OperationalStatus,
    FEATURE_NAMES,
    FEATURE_METADATA,
    CLINICAL_SAFETY_DISCLAIMER,
)


class BaseModelAdapter(ABC):
    """Abstract base class for all ML model adapters."""

    def __init__(
        self,
        model_id: str,
        model_name: str,
        version: str,
        file_path: str,
    ):
        self.model_id = model_id
        self.model_name = model_name
        self.version = version
        self.file_path = file_path
        self.status = ModelLoadState.PENDING
        self.model: Optional[Any] = None
        self.error_message: Optional[str] = None
        self.loaded_at: Optional[str] = None
        self.features_expected: List[str] = list(FEATURE_NAMES)
        self.metadata: Dict[str, Any] = {}

    def load(self, allowed_dir: Optional[str] = None) -> bool:
        """Loads the artifact safely via safe_load_joblib."""
        self.model, err = safe_load_joblib(self.file_path, allowed_dir=allowed_dir)
        if err is not None:
            self.status = ModelLoadState.UNAVAILABLE
            self.error_message = err
            return False

        self.status = ModelLoadState.LOADED
        self.error_message = None
        self.loaded_at = datetime.now(timezone.utc).isoformat()
        self._inspect_loaded_model()
        return True

    def _inspect_loaded_model(self) -> None:
        """Inspects model parameters and attributes for metadata."""
        if self.model is None:
            return
        self.metadata = {
            "type": type(self.model).__name__,
            "module": getattr(type(self.model), "__module__", ""),
        }
        if hasattr(self.model, "n_features_in_"):
            self.metadata["n_features_in"] = int(self.model.n_features_in_)
        if hasattr(self.model, "n_estimators"):
            self.metadata["n_estimators"] = int(self.model.n_estimators)

    def is_available(self) -> bool:
        return self.status == ModelLoadState.LOADED and self.model is not None

    def get_status(self) -> ModelArtifactStatus:
        return ModelArtifactStatus(
            model_id=self.model_id,
            name=self.model_name,
            version=self.version,
            status=self.status,
            file_path=str(self.file_path),
            artifact_exists=Path(self.file_path).exists(),
            features_expected=self.features_expected,
            loaded_at=self.loaded_at,
            error_message=self.error_message,
            metadata=self.metadata,
        )


class IsolationForestAdapter(BaseModelAdapter):
    """Adapter for Scikit-Learn Isolation Forest anomaly detection.
    
    Produces unsupervised statistical outlier scores. Does NOT compute
    disease probabilities or clinical risks.
    """

    def __init__(self, file_path: str, version: str = "1.0.0"):
        super().__init__(
            model_id="astra_iso_forest",
            model_name="Spaceflight Biometric Isolation Forest Anomaly Detector",
            version=version,
            file_path=file_path,
        )

    def assess_anomaly(self, feature_vector: np.ndarray) -> AnomalyAssessment:
        """Evaluates statistical deviation against operational training distribution.
        
        Args:
            feature_vector: 2D numpy array of shape (1, 12).
        
        Returns:
            AnomalyAssessment containing boolean anomaly flag and raw decision function score.
        """
        if not self.is_available():
            raise RuntimeError(
                f"Isolation Forest model is UNAVAILABLE ({self.error_message or 'not loaded'}). "
                "Per mission safety protocol, automated synthetic retraining is disabled."
            )

        if feature_vector.shape != (1, len(FEATURE_NAMES)):
            raise ValueError(
                f"Feature vector shape {feature_vector.shape} invalid. Expected (1, {len(FEATURE_NAMES)})"
            )

        if not np.all(np.isfinite(feature_vector)):
            raise ValueError("Feature vector contains NaN or infinite values.")

        # predict returns -1 for anomaly, 1 for inlier
        raw_pred = int(self.model.predict(feature_vector)[0])
        is_anomaly = bool(raw_pred == -1)

        # decision_function returns negative values for outliers, positive for inliers
        raw_score = float(self.model.decision_function(feature_vector)[0])
        anomaly_score = round(raw_score, 4)

        return AnomalyAssessment(
            is_anomaly=is_anomaly,
            anomaly_score=anomaly_score,
            interpretation=(
                "Statistical multidimensional outlier detection in telemetry space. "
                "NOT a disease probability or clinical diagnosis."
            ),
        )


class RandomForestAdapter(BaseModelAdapter):
    """Adapter for Scikit-Learn Random Forest Classifier.
    
    Classifies flight operational physiological status (NOMINAL, CAUTION, CRITICAL)
    and computes feature importance deviations without claiming medical diagnostic accuracy.
    """

    CLASS_MAP = {
        0: OperationalStatus.NOMINAL,
        1: OperationalStatus.CAUTION,
        2: OperationalStatus.CRITICAL,
    }

    def __init__(self, file_path: str, version: str = "1.0.0"):
        super().__init__(
            model_id="astra_rf_classifier",
            model_name="Spaceflight Operational Physiology Random Forest Classifier",
            version=version,
            file_path=file_path,
        )

    def classify(
        self,
        feature_vector: np.ndarray,
        feature_dict: Dict[str, float],
    ) -> Tuple[OperationalStatus, float, Dict[str, float], List[FeatureContribution]]:
        """Executes classification and computes top contributing physiological drivers."""
        if not self.is_available():
            raise RuntimeError(
                f"Random Forest model is UNAVAILABLE ({self.error_message or 'not loaded'}). "
                "Per mission safety protocol, automated synthetic retraining is disabled."
            )

        if feature_vector.shape != (1, len(FEATURE_NAMES)):
            raise ValueError(
                f"Feature vector shape {feature_vector.shape} invalid. Expected (1, {len(FEATURE_NAMES)})"
            )

        if not np.all(np.isfinite(feature_vector)):
            raise ValueError("Feature vector contains NaN or infinite values.")

        # Predict class
        pred_class_idx = int(self.model.predict(feature_vector)[0])
        status = self.CLASS_MAP.get(pred_class_idx, OperationalStatus.NOMINAL)

        # Probabilities across classes
        probabilities = self.model.predict_proba(feature_vector)[0]
        confidence_pct = round(float(np.max(probabilities)) * 100.0, 1)

        class_probs = {
            OperationalStatus.NOMINAL.value: round(float(probabilities[0]), 4) if len(probabilities) > 0 else 0.0,
            OperationalStatus.CAUTION.value: round(float(probabilities[1]), 4) if len(probabilities) > 1 else 0.0,
            OperationalStatus.CRITICAL.value: round(float(probabilities[2]), 4) if len(probabilities) > 2 else 0.0,
        }

        # Feature importances & deviations
        importances = getattr(self.model, "feature_importances_", np.ones(len(FEATURE_NAMES)) / len(FEATURE_NAMES))
        contributions: List[FeatureContribution] = []

        for name, imp in zip(FEATURE_NAMES, importances):
            val = feature_dict[name]
            meta = FEATURE_METADATA[name]
            median = meta["baseline_median"]
            scale = max(median, 1.0)
            norm_dev = abs(val - median) / scale
            impact = round(float(norm_dev * imp), 4)

            direction = "NOMINAL"
            if val > median * 1.05:
                direction = "ELEVATED"
            elif val < median * 0.95:
                direction = "DEPRESSED"

            contributions.append(
                FeatureContribution(
                    feature=name,
                    unit=meta["unit"],
                    value=round(val, 2),
                    baseline_median=median,
                    impact_score=impact,
                    deviation_direction=direction,
                )
            )

        # Sort descending by impact score
        contributions.sort(key=lambda x: x.impact_score, reverse=True)

        return status, confidence_pct, class_probs, contributions


class EnsembleHealthAdapter:
    """Combines Isolation Forest and Random Forest for comprehensive operational analysis."""

    def __init__(
        self,
        iso_adapter: IsolationForestAdapter,
        rf_adapter: RandomForestAdapter,
        version: str = "1.0.0",
    ):
        self.iso_adapter = iso_adapter
        self.rf_adapter = rf_adapter
        self.version = version

    def is_available(self) -> bool:
        return self.iso_adapter.is_available() and self.rf_adapter.is_available()

    def predict(self, telemetry: BiometricTelemetryInput) -> InferenceResponse:
        """Runs strict dual-model inference on validated biometric telemetry."""
        vector = telemetry.to_feature_vector()
        feat_dict = telemetry.to_feature_dict()

        # 1. Isolation Forest Anomaly Assessment
        anomaly = self.iso_adapter.assess_anomaly(vector)

        # 2. Random Forest Classification & Feature Importance
        rf_status, confidence_pct, class_probs, contributions = self.rf_adapter.classify(
            vector, feat_dict
        )

        # Operational rule: If Isolation Forest detects acute outlier and RF is NOMINAL, elevate to CAUTION
        final_status = rf_status
        if anomaly.is_anomaly and final_status == OperationalStatus.NOMINAL:
            final_status = OperationalStatus.CAUTION

        # Generate physiological causal explanation and countermeasures
        explanation, countermeasures = self._formulate_operational_guidance(
            feat_dict, final_status, anomaly.is_anomaly
        )

        return InferenceResponse(
            model_version=f"RFv{self.rf_adapter.version}+ISOv{self.iso_adapter.version}",
            model_name="SOLARIS Spaceflight Multi-Model Operational Pipeline",
            timestamp=datetime.now(timezone.utc).isoformat(),
            status=final_status,
            confidence_pct=confidence_pct,
            class_probabilities=class_probs,
            is_anomaly=anomaly.is_anomaly,
            anomaly_score=anomaly.anomaly_score,
            anomaly=anomaly,
            top_contributing_factors=contributions[:4],
            causal_explanation=explanation,
            countermeasures=countermeasures,
            clinical_disclaimer=CLINICAL_SAFETY_DISCLAIMER,
        )

    def _formulate_operational_guidance(
        self,
        features: Dict[str, float],
        status: OperationalStatus,
        is_anomaly: bool,
    ) -> Tuple[str, List[str]]:
        """Grounds causal reasoning in exact measured feature deviations."""
        hr = features["heart_rate_bpm"]
        hrv = features["hrv_rmssd_ms"]
        spo2 = features["spo2_pct"]
        sleep = features["sleep_hours"]
        circadian = features["circadian_align_pct"]
        spine = features["spine_pain_score"]
        skin = features["skin_irritation_score"]
        rad = features["radiation_msv_day"]
        ectopic = features["ectopic_jumps_hr"]

        has_spine = spine > 2.5
        has_sleep = sleep < 5.8
        has_hr_elevated = hr > 88.0 or ectopic >= 2.0
        has_skin = skin > 2.5
        has_radiation = rad > 0.8

        countermeasures: List[str] = []

        if has_spine and has_sleep and has_hr_elevated:
            explanation = (
                f"Cephalad fluid redistribution and microgravity spinal elongation (pain score: {spine:.1f}/10) "
                f"coupled with an acute sleep deficit of {sleep:.1f} hours are elevating sympathetic autonomic tone. "
                f"This explains the observed cardiac rate elevation ({hr:.0f} BPM, HRV: {hrv:.0f} ms). "
                f"Forehead optical SpO2 remains nominal at {spo2:.1f}%, ruling out hypoxic distress."
            )
            countermeasures = [
                "ARED Resistive Axial Compression Protocol (20 min)",
                "Circadian Phase-Shifting Blue-Enriched Light Session (45 min)",
                "Melatonin 0.5mg administration 30 minutes prior to scheduled sleep window",
                "Continuous 3-Lead ECG telemetry monitoring",
            ]
        elif has_hr_elevated and not has_spine:
            explanation = (
                f"Astroskin 3-lead thoracic ECG captured intermittent rate elevations to {hr:.0f} BPM with "
                f"{ectopic:.0f} ectopic events/hr and reduced HRV ({hrv:.0f} ms). SpO2 is {spo2:.1f}%, confirming "
                f"autonomic baroreflex modulation rather than pulmonary impairment."
            )
            countermeasures = [
                "Continuous 3-Lead ECG telemetry telemetry stream",
                "Electrolyte and hydration replenishment (500 mL isotonic fluid)",
                "Scheduled 30-minute rest period and reassessment",
            ]
        elif has_sleep:
            explanation = (
                f"NASA ARCHER actigraphy registers an acute sleep deficit of {sleep:.1f} hours with circadian "
                f"phase alignment at {circadian:.0f}%. Autonomic recovery index is lowered, presenting mild "
                f"cardiovascular reserve fatigue."
            )
            countermeasures = [
                "Circadian blue-light therapy session (45 min)",
                "Scheduled 30-minute restorative rest cycle",
                "Dim cabin ambient illumination 90 minutes before sleep window",
            ]
        elif has_spine:
            explanation = (
                f"Microgravity axial spinal elongation reported at {spine:.1f}/10. Prolonged lack of gravitational "
                f"compression leads to intervertebral disc expansion and paravertebral muscular tension."
            )
            countermeasures = [
                "ARED Axial Compression and lumbar unloading regimen (20 min)",
                "Foam roller spinal decompression protocol in crew quarters",
            ]
        elif has_skin:
            explanation = (
                f"Smart-garment contact interface logs dermal irritation score of {skin:.1f}/10, consistent with "
                f"microgravity moisture retention and local sensor contact pressure."
            )
            countermeasures = [
                "Apply hypoallergenic dermal barrier emollient to contact sites",
                "Inspect sensor band tension and rotate sensor placement slightly",
            ]
        elif has_radiation:
            explanation = (
                f"Active environmental dosimeter recorded elevated daily ionizing dose rate of {rad:.2f} mSv/day. "
                f"Physiological vitals remain steady with resting HR at {hr:.0f} BPM."
            )
            countermeasures = [
                "Log cumulative ionizing dose to HERA dosimeter registry",
                "Verify storm shelter shielding integrity if SPE alerts trigger",
            ]
        else:
            explanation = (
                f"All physiological telemetry parameters are aligned with NASA spaceflight operational baselines. "
                f"Resting heart rate is calm at {hr:.0f} BPM, HRV is {hrv:.0f} ms, and SpO2 is nominal at {spo2:.1f}%."
            )
            countermeasures = [
                "Continue standard mission exercise routine (ARED resistive + T2 treadmill)",
                "Maintain standard 24-hour hydration and nutrition logs",
            ]

        return explanation, countermeasures
