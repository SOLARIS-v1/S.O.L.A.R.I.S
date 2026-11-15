"""SOLARIS Machine Learning Service Layer.

Provides safe model loading, strict feature validation, modular model adapters,
and honest operational health tracking for deep-space astronaut telemetry.
"""

from .schemas import (
    BiometricTelemetryInput,
    InferenceRequest,
    InferenceResponse,
    AssessmentRequest,
    AssessmentResponse,
    AnomalyAssessment,
    FeatureContribution,
    MLStatusResponse,
    ModelArtifactStatus,
    FEATURE_NAMES,
    FEATURE_METADATA,
    CLINICAL_SAFETY_DISCLAIMER,
)
from .model_loader import safe_load_joblib
from .model_registry import ModelRegistry, get_model_registry
from .inference_service import InferenceService, get_inference_service

__all__ = [
    "BiometricTelemetryInput",
    "InferenceRequest",
    "InferenceResponse",
    "AssessmentRequest",
    "AssessmentResponse",
    "AnomalyAssessment",
    "FeatureContribution",
    "MLStatusResponse",
    "ModelArtifactStatus",
    "FEATURE_NAMES",
    "FEATURE_METADATA",
    "CLINICAL_SAFETY_DISCLAIMER",
    "safe_load_joblib",
    "ModelRegistry",
    "get_model_registry",
    "InferenceService",
    "get_inference_service",
]
