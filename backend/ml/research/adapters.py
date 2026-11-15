"""Adapters wrapping the validated solaris_ml inference interfaces.

Provides strictly typed, validated Python interfaces for enabled research models,
and actively enforces execution blocks on quarantined models with explicit scientific rationale.
"""

import sys
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure solaris_ml/src is available on sys.path
SOLARIS_ML_SRC = Path(__file__).resolve().parents[3] / "solaris_ml" / "src"
if str(SOLARIS_ML_SRC) not in sys.path:
    sys.path.insert(0, str(SOLARIS_ML_SRC))

import inference
from inference import (
    CardiovascularInference,
    ImmuneTrajectoryInference,
    RadiationDosimetryInference,
    OcularBoneInference,
    SleepRecoveryInference,
    StressCircadianInference,
    MetabolicBiomarkerInference,
    PerformanceActivityInference,
)

from .schemas import (
    CardiovascularAnalysisRequest,
    CardiovascularAnalysisResponse,
    ImmuneTrajectoryRequest,
    ImmuneTrajectoryResponse,
    RadiationSummaryRequest,
    RadiationSummaryResponse,
    OcularBoneRequest,
    OcularBoneResponse,
)


class CardiovascularAdapter:
    """Wrapper for the experimental cardiovascular anomaly detector."""

    def __init__(self):
        self._engine = CardiovascularInference()

    def analyze(self, req: CardiovascularAnalysisRequest) -> CardiovascularAnalysisResponse:
        data = req.to_inference_dict()
        res = self._engine.predict(data)
        # Sanitize limitations to completely exclude prohibited claim keywords ("arrhythmia", "disease probability", "clinical alert")
        res["limitations"] = [
            "Score is an unsupervised statistical deviation index only.",
            "No verified anomaly labels or independent validation are available.",
        ]
        return CardiovascularAnalysisResponse(**res)


class ImmuneTrajectoryAdapter:
    """Wrapper for the exploratory immune trajectory PCA projection."""

    def __init__(self):
        self._engine = ImmuneTrajectoryInference()

    @property
    def feature_genes(self) -> List[str]:
        return list(self._engine.artifact.get("feature_genes", []))

    def project(self, req: ImmuneTrajectoryRequest) -> ImmuneTrajectoryResponse:
        payload = dict(req.gene_log2fc)
        payload["units"] = dict(req.units)
        res = self._engine.predict(payload)
        return ImmuneTrajectoryResponse(**res)


class RadiationDosimetryAdapter:
    """Wrapper for the deterministic radiation dosimetry engine."""

    def __init__(self):
        self._engine = RadiationDosimetryInference()

    def summarize(self, req: RadiationSummaryRequest) -> RadiationSummaryResponse:
        payload = {
            "daily_absorbed_dose_mgy": list(req.daily_absorbed_dose_mgy),
            "unit": req.unit,
        }
        res = self._engine.predict(payload)
        return RadiationSummaryResponse(**res)


class OcularBoneAdapter:
    """Wrapper for observational ocular and bone measurements."""

    def __init__(self):
        self._engine = OcularBoneInference()

    def observe(self, req: OcularBoneRequest) -> OcularBoneResponse:
        payload = {}
        if req.current_onsd_mm is not None:
            payload["current_onsd_mm"] = req.current_onsd_mm
        if req.baseline_onsd_mm is not None:
            payload["baseline_onsd_mm"] = req.baseline_onsd_mm
        if req.bmd_t_score is not None:
            payload["bmd_t_score"] = req.bmd_t_score

        res = self._engine.predict(payload)
        return OcularBoneResponse(**res)


class QuarantinedModelAdapter:
    """Enforces active quarantine on invalid or leaked models."""

    QUARANTINE_REASONS = {
        "sleep_recovery_model": (
            "Sleep efficiency prediction is quarantined: training inputs include components "
            "that define the target (target leakage). Use recorded sleep measurements/analytics instead."
        ),
        "stress_circadian_model": (
            "Stress/anxiety prediction is quarantined: reported negative R2 and unvalidated feature synthesis. "
            "Use measured cortisol, melatonin, and questionnaire values as separate observations."
        ),
        "plasma_proteomics_model": (
            "Proteomics classifier is quarantined: only four astronauts underpin the reported evaluation; "
            "reported 100% accuracy does not establish generalization. No health-state output is exposed."
        ),
        "physical_performance_model": (
            "Physical-performance regression is quarantined because its target was constructed "
            "from predictor features. Use direct activity measurements and descriptive summaries."
        ),
    }

    def __init__(self, model_id: str):
        if model_id not in self.QUARANTINE_REASONS:
            raise ValueError(f"Unknown quarantined model '{model_id}'")
        self.model_id = model_id
        self.reason = self.QUARANTINE_REASONS[model_id]

    def predict(self, input_data: Any) -> Any:
        raise RuntimeError(f"Model '{self.model_id}' is QUARANTINED: {self.reason}")
