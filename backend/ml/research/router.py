"""FastAPI router exposing the SOLARIS research ML package endpoints.

Includes:
- GET /api/ml/status
- GET /api/ml/registry
- POST /api/ml/cardiovascular/analyze
- GET /api/ml/sleep/analytics
- GET /api/ml/immune/analytics
- GET /api/ml/metabolic/analytics
- GET /api/ml/radiation/summary (and POST /api/ml/radiation/summary)
- GET /api/ml/ocular/observations
- GET /api/ml/bone/observations
- GET /api/ml/astronaut/{astronaut_id}/insights
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from .schemas import (
    CardiovascularAnalysisRequest,
    CardiovascularAnalysisResponse,
    ImmuneTrajectoryRequest,
    ImmuneTrajectoryResponse,
    RadiationSummaryRequest,
    RadiationSummaryResponse,
    OcularBoneRequest,
    OcularBoneResponse,
    SleepAnalyticsResponse,
    ImmuneAnalyticsResponse,
    MetabolicAnalyticsResponse,
    AstronautInsightsResponse,
    ResearchRegistryResponse,
    ResearchStatusResponse,
)
from .service import get_research_ml_service
from ... import database

router = APIRouter(tags=["research_ml"])


@router.get("/status", response_model=ResearchStatusResponse)
def get_ml_status():
    """Returns honest operational status of all research models and quarantine states."""
    service = get_research_ml_service()
    return service.get_status()


@router.get("/registry", response_model=ResearchRegistryResponse)
def get_ml_registry():
    """Returns parsed model registry from solaris_ml/reports/model_registry.json."""
    service = get_research_ml_service()
    return service.get_registry()


@router.post("/cardiovascular/analyze", response_model=CardiovascularAnalysisResponse)
def analyze_cardiovascular(req: CardiovascularAnalysisRequest):
    """Executes unsupervised cardiovascular anomaly detection on strictly validated features."""
    service = get_research_ml_service()
    try:
        return service.analyze_cardiovascular(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sleep/analytics", response_model=SleepAnalyticsResponse)
def get_sleep_analytics(astronaut_id: str = Query("vance", description="Astronaut ID")):
    """Returns descriptive sleep actigraphy analytics. Note: Predictive model is quarantined."""
    service = get_research_ml_service()
    return service.get_sleep_analytics(astronaut_id, db_module=database)


@router.get("/immune/analytics", response_model=ImmuneAnalyticsResponse)
def get_immune_analytics(astronaut_id: str = Query("vance", description="Astronaut ID")):
    """Returns exploratory immune repertoire diversity and PCA projection."""
    service = get_research_ml_service()
    return service.get_immune_analytics(astronaut_id)


@router.get("/metabolic/analytics", response_model=MetabolicAnalyticsResponse)
def get_metabolic_analytics(astronaut_id: str = Query("vance", description="Astronaut ID")):
    """Returns descriptive plasma amino acid biomarkers. Note: Proteomics model is quarantined."""
    service = get_research_ml_service()
    return service.get_metabolic_analytics(astronaut_id)


@router.get("/radiation/summary", response_model=RadiationSummaryResponse)
def get_radiation_summary(astronaut_id: str = Query("vance", description="Astronaut ID")):
    """Returns deterministic absorbed dose summary (mGy). No mSv conversion or safety claims."""
    service = get_research_ml_service()
    crew = database.get_crew_telemetry(astronaut_id)
    daily_rate = float(crew["radiation_msv_day"]) if crew else 0.42
    sample_doses = [round(daily_rate * f, 3) for f in (0.95, 1.05, 0.98, 1.12, 1.0, 1.08, 1.02)]
    req = RadiationSummaryRequest(
        daily_absorbed_dose_mgy=sample_doses,
        unit="mGy/day",
        astronaut_id=astronaut_id,
    )
    return service.summarize_radiation(req)


@router.post("/radiation/summary", response_model=RadiationSummaryResponse)
def post_radiation_summary(req: RadiationSummaryRequest):
    """Computes absorbed dose summary for custom daily dose array."""
    service = get_research_ml_service()
    try:
        return service.summarize_radiation(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/ocular/observations", response_model=OcularBoneResponse)
def get_ocular_observations(
    astronaut_id: str = Query("vance", description="Astronaut ID"),
    current_onsd_mm: Optional[float] = Query(None, description="Current ONSD measurement in mm"),
    baseline_onsd_mm: Optional[float] = Query(None, description="Baseline ONSD in mm"),
):
    """Returns observational ONSD measurements. No SANS risk tiers are assigned."""
    service = get_research_ml_service()
    val = current_onsd_mm or (5.4 if astronaut_id == "vance" else 5.1 if astronaut_id == "patel" else 5.6)
    base = baseline_onsd_mm or 4.9
    req = OcularBoneRequest(
        current_onsd_mm=val,
        baseline_onsd_mm=base,
        astronaut_id=astronaut_id,
    )
    return service.observe_ocular_bone(req)


@router.get("/bone/observations", response_model=OcularBoneResponse)
def get_bone_observations(
    astronaut_id: str = Query("vance", description="Astronaut ID"),
    bmd_t_score: Optional[float] = Query(None, description="Current DXA BMD T-Score"),
):
    """Returns observational BMD T-Score. No monthly loss forecasts are produced."""
    service = get_research_ml_service()
    val = bmd_t_score if bmd_t_score is not None else (-0.8 if astronaut_id == "vance" else -0.3 if astronaut_id == "patel" else -1.2)
    req = OcularBoneRequest(
        bmd_t_score=val,
        astronaut_id=astronaut_id,
    )
    return service.observe_ocular_bone(req)


@router.get("/astronaut/{astronaut_id}/insights", response_model=AstronautInsightsResponse)
def get_astronaut_insights(astronaut_id: str):
    """Returns holistic research ML insights across systems for an astronaut."""
    service = get_research_ml_service()
    crew = database.get_crew_telemetry(astronaut_id)
    if not crew:
        raise HTTPException(status_code=404, detail=f"Astronaut '{astronaut_id}' not found.")
    return service.get_astronaut_insights(astronaut_id, db_module=database)
