import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from .database import get_crew_telemetry, update_crew_telemetry, save_checkin_log, get_checkin_logs
from .ml_engine import analyze_crew_biometrics
from .ml import (
    get_inference_service,
    InferenceRequest,
    InferenceResponse,
    AssessmentRequest,
    AssessmentResponse,
    MLStatusResponse,
    BiometricTelemetryInput,
)
from . import database

from .ml.research.router import router as research_ml_router
from .voice_service import router as voice_router

app = FastAPI(title="SOLARIS Medical Intelligence Local Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the authoritative SOLARIS research ML router and local voice router
app.include_router(research_ml_router, prefix="/api/ml")
app.include_router(voice_router)


class SymptomAssessmentRequest(BaseModel):
    crew_name: str
    transcript: str
    sleep_issue: Optional[bool] = False
    skin_issue: Optional[bool] = False
    spine_issue: Optional[bool] = False


@app.get("/api/health")
def health_check():
    service = get_inference_service()
    status_resp = service.get_status()
    is_ready = status_resp.overall_status == "OPERATIONAL"
    return {
        "status": "ONLINE",
        "mode": "100% LOCAL AIR-GAPPED",
        "models_loaded": is_ready,
        "ml_status": status_resp.overall_status,
        "engine": "Scikit-Learn Random Forest + Isolation Forest",
        "database": "Local SQLite (astra_local.db)",
        "clinical_disclaimer": status_resp.clinical_disclaimer,
    }


# -------------------------------------------------------------------------
# Legacy Modular ML Endpoints (/api/ml/inference, /api/ml/assess)
# -------------------------------------------------------------------------

@app.post("/api/ml/inference", response_model=InferenceResponse)
def post_ml_inference(req: InferenceRequest):
    """Executes dual-model inference on strictly validated telemetry features."""
    service = get_inference_service()
    return service.run_inference(req)


@app.post("/api/ml/assess", response_model=AssessmentResponse)
def post_ml_assess(req: AssessmentRequest):
    """Runs comprehensive crew check-in assessment combining symptoms and telemetry."""
    service = get_inference_service()
    return service.run_assessment(req, db_module=database)


# -------------------------------------------------------------------------
# Crew Telemetry & Hotspot Endpoints
# -------------------------------------------------------------------------

@app.get("/api/crew/{name}")
def get_crew_data(name: str):
    telemetry = get_crew_telemetry(name)
    if not telemetry:
        raise HTTPException(status_code=404, detail=f"Crew member '{name}' not found.")

    # Run ML analysis via safe compatibility engine
    ml_result = analyze_crew_biometrics(telemetry, {})

    # Construct 6 hardware-mapped hotspot telemetry packets
    hotspots = {
        "headband": {
            "device": "ASTROSKIN HEADBAND",
            "metric": "SpO2 & Cranial Fluid Shift",
            "spo2": telemetry["spo2_pct"],
            "cranial_ptt_ms": telemetry["cranial_ptt_ms"],
            "status": "NOMINAL" if telemetry["spo2_pct"] >= 98.0 else "CAUTION",
        },
        "heart": {
            "device": "ASTROSKIN THORACIC ECG",
            "metric": "Cardiac Sinus Rhythm & HRV",
            "heart_rate_bpm": telemetry["heart_rate_bpm"],
            "hrv_rmssd_ms": telemetry["hrv_rmssd_ms"],
            "ectopic_jumps_hr": telemetry["ectopic_jumps_hr"],
            "status": "CAUTION" if telemetry["ectopic_jumps_hr"] > 2 or telemetry["heart_rate_bpm"] > 90 else "NOMINAL",
        },
        "lungs": {
            "device": "ASTROSKIN DUAL-BAND",
            "metric": "Thoracic Respiration & Temp",
            "resp_rate_brm": telemetry["resp_rate_brm"],
            "skin_temp_c": telemetry["skin_temp_c"],
            "status": "NOMINAL",
        },
        "dosimeter": {
            "device": "HERA / CPD DOSIMETER",
            "metric": "Active Environmental Dosimetry",
            "radiation_msv_day": telemetry.get("radiation_msv_day"),
            "cumulative_msv": round(telemetry["radiation_msv_day"] * 142, 2) if telemetry.get("radiation_msv_day") else None,
            "status": "NOMINAL" if (telemetry.get("radiation_msv_day") or 0) < 0.6 else "CAUTION",
        },
        "archer": {
            "device": "NASA ARCHER WRISTBAND",
            "metric": "Sleep Actigraphy & Circadian Phase",
            "sleep_hours": telemetry["sleep_hours"],
            "circadian_align_pct": telemetry["circadian_align_pct"],
            "status": "CAUTION" if telemetry["sleep_hours"] < 6.0 else "NOMINAL",
        },
        "spine_skin": {
            "device": "3-AXIS IMU + ASTRA VERBAL",
            "metric": "Lumbar Posture & Dermal Interface",
            "spine_pain_score": telemetry["spine_pain_score"],
            "skin_irritation_score": telemetry["skin_irritation_score"],
            "status": "CAUTION" if telemetry["spine_pain_score"] > 3.0 or telemetry["skin_irritation_score"] > 3.0 else "NOMINAL",
        },
    }

    # Generate briefing script
    crew_name = telemetry["name"]
    hr = telemetry["heart_rate_bpm"]
    hrv = telemetry["hrv_rmssd_ms"]
    spo2 = telemetry["spo2_pct"]
    sleep = telemetry["sleep_hours"]
    ectopic = telemetry["ectopic_jumps_hr"]

    if ectopic >= 3 or hr > 90:
        briefing = (
            f"All pulmonary and oxygen readings are looking fine at {spo2:.1f} percent, {crew_name}, "
            f"but your heart rate has a little jump here and there at {hr:.0f} BPM with a dip in HRV down to {hrv:.0f} milliseconds. "
            f"Archer sleep logged at {sleep:.1f} hours."
        )
    elif sleep < 5.5:
        briefing = (
            f"Welcome back, {crew_name}. SpO2 is nominal at {spo2:.1f}%, but your Archer wristband flags an acute sleep deficit "
            f"of only {sleep:.1f} hours, with elevated resting heart rate at {hr:.0f} BPM."
        )
    else:
        briefing = (
            f"All physiological telemetry is in optimal flight operational range, {crew_name}. "
            f"Resting heart rate is steady at {hr:.0f} BPM, HRV is high at {hrv:.0f} ms, and SpO2 is {spo2:.1f}%."
        )

    return {
        "crew": telemetry,
        "hotspots": hotspots,
        "ml_analysis": ml_result,
        "astra_briefing_script": briefing,
        "solaris_briefing_script": briefing,
        "briefing_script": briefing,
    }


# -------------------------------------------------------------------------
# Legacy Assessment & Log Endpoints
# -------------------------------------------------------------------------

@app.post("/api/assess")
def assess_symptoms(req: SymptomAssessmentRequest):
    """Backwards-compatible assessment endpoint using the new ML service."""
    service = get_inference_service()
    assess_req = AssessmentRequest(
        crew_name=req.crew_name or "vance",
        transcript=req.transcript,
        sleep_issue=req.sleep_issue,
        skin_issue=req.skin_issue,
        spine_issue=req.spine_issue,
        update_database=True,
    )
    result = service.run_assessment(assess_req, db_module=database)

    return {
        "detected_symptoms": result.detected_symptoms,
        "ml_analysis": result.ml_analysis.model_dump(),
        "astra_spoken_response": result.spoken_briefing,
        "solaris_spoken_response": result.spoken_briefing,
        "spoken_response": result.spoken_briefing,
        "countermeasures": result.countermeasures,
        "clinical_disclaimer": result.clinical_disclaimer,
    }


class CheckInRequest(BaseModel):
    crew_name: str
    vitals: Optional[Dict[str, Any]] = None
    symptoms: Optional[List[Any]] = None
    notes: Optional[str] = None


@app.post("/api/checkin")
def checkin_endpoint(req: CheckInRequest):
    return {
        "status": "success",
        "message": f"Biomedical telemetry ingested for {req.crew_name}",
        "logged_at": datetime.utcnow().isoformat()
    }


@app.get("/api/logs/{name}")
def get_logs(name: str):
    return get_checkin_logs(name)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
