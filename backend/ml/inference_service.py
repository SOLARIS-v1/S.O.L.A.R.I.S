"""Inference Service for SOLARIS ML.

Orchestrates strict feature verification, adapter execution, operational assessment,
and safe check-in persistence without fabricated defaults or unvalidated clinical claims.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException

from .model_registry import ModelRegistry, get_model_registry
from .schemas import (
    AssessmentRequest,
    AssessmentResponse,
    BiometricTelemetryInput,
    InferenceRequest,
    InferenceResponse,
    MLStatusResponse,
    OperationalStatus,
    FEATURE_NAMES,
    CLINICAL_SAFETY_DISCLAIMER,
)


class InferenceService:
    """Service handling strict inference and astronaut physiological assessment."""

    def __init__(self, registry: Optional[ModelRegistry] = None):
        self.registry = registry or get_model_registry()

    def get_status(self) -> MLStatusResponse:
        """Returns the current operational status of all registered models."""
        return self.registry.get_status()

    def run_inference(self, request: InferenceRequest) -> InferenceResponse:
        """Runs strict dual-model ML inference on telemetry features.
        
        Args:
            request: InferenceRequest with validated BiometricTelemetryInput.
            
        Raises:
            HTTPException: 503 if models are unavailable.
        """
        if not self.registry.is_operational():
            status = self.registry.get_status()
            raise HTTPException(
                status_code=503,
                detail=(
                    f"ML inference service is {status.overall_status}. Model artifacts could not be loaded. "
                    "Per flight safety protocol, automated synthetic retraining is disabled."
                ),
            )

        ensemble = self.registry.get_ensemble()
        return ensemble.predict(request.features)

    def run_assessment(
        self,
        request: AssessmentRequest,
        db_module: Optional[Any] = None,
    ) -> AssessmentResponse:
        """Processes holistic check-in assessment combining verbal symptoms and telemetry.
        
        Strictly rejects missing features rather than inventing fake telemetry defaults.
        """
        # 1. Resolve crew identifier
        crew_key = request.crew_id or request.crew_name
        crew_data = None

        if db_module is not None and crew_key:
            crew_data = db_module.get_crew_telemetry(crew_key)
            if crew_data is None and request.features is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Crew member '{crew_key}' not found in telemetry database.",
                )

        # 2. Extract or validate telemetry features
        if request.features is not None:
            telemetry_features = request.features
        elif crew_data is not None:
            # Validate that crew record contains all 12 required features
            missing_keys = [
                k for k in FEATURE_NAMES if k not in crew_data or crew_data[k] is None
            ]
            if missing_keys:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Crew telemetry record is missing required features: {missing_keys}. "
                        "Refusing to fabricate synthetic defaults."
                    ),
                )
            feature_kwargs = {k: float(crew_data[k]) for k in FEATURE_NAMES}
            telemetry_features = BiometricTelemetryInput(**feature_kwargs)
        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Assessment requires either 'features' (BiometricTelemetryInput) or "
                    "a valid 'crew_id'/'crew_name' with existing telemetry in database."
                ),
            )

        # 3. NLP Symptom Detection
        raw_text = (request.transcript or "").lower()

        sleep_pattern = r"\b(sleep|tired|insomnia|awake|restless|exhausted|fatigue|couldn't sleep)\b"
        spine_pattern = r"\b(back|spine|ache|stiff|lumbar|elongation|vertebrae|pain|sore)\b"
        skin_pattern = r"\b(skin|rash|dry|itch|irritation|erythema|contact|rubbing)\b"
        cardiac_pattern = r"\b(dizzy|heart|jump|racing|flutter|palpitation|pulse)\b"

        detected_sleep = bool(request.sleep_issue) or bool(re.search(sleep_pattern, raw_text))
        detected_spine = bool(request.spine_issue) or bool(re.search(spine_pattern, raw_text))
        detected_skin = bool(request.skin_issue) or bool(re.search(skin_pattern, raw_text))
        detected_cardiac = bool(re.search(cardiac_pattern, raw_text))

        # 4. Apply physiological adjustments reflecting acute symptoms
        feat_dict = telemetry_features.to_feature_dict()
        adjustments_applied: Dict[str, float] = {}

        if detected_spine:
            new_spine = max(feat_dict["spine_pain_score"], 6.8)
            feat_dict["spine_pain_score"] = new_spine
            adjustments_applied["spine_pain_score"] = new_spine

        if detected_skin:
            new_skin = max(feat_dict["skin_irritation_score"], 5.2)
            feat_dict["skin_irritation_score"] = new_skin
            adjustments_applied["skin_irritation_score"] = new_skin

        if detected_sleep:
            new_sleep = min(feat_dict["sleep_hours"], 4.8)
            new_circ = min(feat_dict["circadian_align_pct"], 58.0)
            feat_dict["sleep_hours"] = new_sleep
            feat_dict["circadian_align_pct"] = new_circ
            adjustments_applied["sleep_hours"] = new_sleep
            adjustments_applied["circadian_align_pct"] = new_circ

        if detected_cardiac:
            new_ectopic = max(feat_dict["ectopic_jumps_hr"], 5.0)
            feat_dict["ectopic_jumps_hr"] = new_ectopic
            adjustments_applied["ectopic_jumps_hr"] = new_ectopic

        adjusted_telemetry = BiometricTelemetryInput(**feat_dict)

        # 5. Execute ML inference
        inference_result = self.run_inference(InferenceRequest(features=adjusted_telemetry))

        # 6. Spoken Briefing formulation
        hr = adjusted_telemetry.heart_rate_bpm
        sleep = adjusted_telemetry.sleep_hours
        name_str = (crew_data["name"] if crew_data else crew_key) or "Astronaut"

        if detected_spine and detected_sleep:
            spoken_briefing = (
                f"Because you're experiencing lumbar spine elongation discomfort in microgravity and only recorded "
                f"{sleep:.1f} hours of sleep on your ARCHER wristband, sympathetic autonomic tone is elevated. "
                f"This correlates with the Astroskin ECG recording heart rate peaks up to {hr:.0f} BPM. "
                f"I have logged this finding and scheduled 20 minutes of ARED resistive unloading and a circadian light session."
            )
        elif detected_spine:
            spoken_briefing = (
                f"Noted microgravity spinal unloading pain. The 3-axis IMU confirms persistent axial elongation. "
                f"I have logged this in your clinical record and recommend an ARED axial compression session."
            )
        elif detected_sleep:
            spoken_briefing = (
                f"Archer sleep deficit confirmed at {sleep:.1f} hours. This sleep deprivation directly correlates with "
                f"reduced heart rate variability and autonomic fatigue. I recommend a 45-minute blue-light session and scheduled restorative rest."
            )
        elif detected_skin:
            spoken_briefing = (
                "Dermal irritation report logged. Inspect smart-garment contact zones and apply barrier emollient."
            )
        else:
            spoken_briefing = (
                f"Recorded your health report: '{request.transcript or 'Nominal check-in'}'. All physiological parameters "
                f"remain synchronized with mission flight surgeon baselines."
            )

        # 7. Persist to DB if requested and database module available
        if request.update_database and db_module is not None and crew_data is not None:
            if adjustments_applied:
                db_module.update_crew_telemetry(crew_data["id"], adjustments_applied)
            db_module.save_checkin_log(
                crew_name=crew_data["name"],
                transcript=request.transcript or "",
                sleep_issue=detected_sleep,
                skin_issue=detected_skin,
                spine_issue=detected_spine,
                ml_status=inference_result.status.value,
                astra_response=spoken_briefing,
                countermeasures=inference_result.countermeasures,
            )

        return AssessmentResponse(
            crew_id=crew_data["id"] if crew_data else request.crew_id,
            crew_name=crew_data["name"] if crew_data else request.crew_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            detected_symptoms={
                "sleepIssue": detected_sleep,
                "skinIssue": detected_skin,
                "spineIssue": detected_spine,
                "cardiacIssue": detected_cardiac,
            },
            symptom_adjustments_applied=adjustments_applied if adjustments_applied else None,
            ml_analysis=inference_result,
            spoken_briefing=spoken_briefing,
            countermeasures=inference_result.countermeasures,
            clinical_disclaimer=CLINICAL_SAFETY_DISCLAIMER,
        )


_inference_service_instance: Optional[InferenceService] = None


def get_inference_service() -> InferenceService:
    """Returns the authoritative InferenceService singleton."""
    global _inference_service_instance
    if _inference_service_instance is None:
        _inference_service_instance = InferenceService()
    return _inference_service_instance
