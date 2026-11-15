"""SOLARIS Research ML Integration Package.

Integrates the validated solaris_ml scientific research package into the FastAPI backend.
Enforces strict unit handling, non-diagnostic labeling, and active quarantine for
statistically invalid or leaked models.
"""

from .schemas import (
    CardiovascularAnalysisRequest,
    CardiovascularAnalysisResponse,
    ImmuneTrajectoryRequest,
    ImmuneTrajectoryResponse,
    RadiationSummaryRequest,
    RadiationSummaryResponse,
    OcularBoneRequest,
    OcularBoneResponse,
    ResearchRegistryResponse,
    ResearchStatusResponse,
    SleepAnalyticsResponse,
    ImmuneAnalyticsResponse,
    MetabolicAnalyticsResponse,
    AstronautInsightsResponse,
)
from .registry import ResearchRegistry, get_research_registry
from .adapters import (
    CardiovascularAdapter,
    ImmuneTrajectoryAdapter,
    RadiationDosimetryAdapter,
    OcularBoneAdapter,
    QuarantinedModelAdapter,
)
from .service import ResearchMLService, get_research_ml_service

__all__ = [
    "CardiovascularAnalysisRequest",
    "CardiovascularAnalysisResponse",
    "ImmuneTrajectoryRequest",
    "ImmuneTrajectoryResponse",
    "RadiationSummaryRequest",
    "RadiationSummaryResponse",
    "OcularBoneRequest",
    "OcularBoneResponse",
    "ResearchRegistryResponse",
    "ResearchStatusResponse",
    "SleepAnalyticsResponse",
    "ImmuneAnalyticsResponse",
    "MetabolicAnalyticsResponse",
    "AstronautInsightsResponse",
    "ResearchRegistry",
    "get_research_registry",
    "CardiovascularAdapter",
    "ImmuneTrajectoryAdapter",
    "RadiationDosimetryAdapter",
    "OcularBoneAdapter",
    "QuarantinedModelAdapter",
    "ResearchMLService",
    "get_research_ml_service",
]
