"""Model Registry for SOLARIS ML service.

Central repository managing model artifacts and adapters. Tracks honest load status,
enforces non-retraining safety protocols, and exposes aggregate system health.
"""

import os
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime, timezone

from .adapters import (
    BaseModelAdapter,
    IsolationForestAdapter,
    RandomForestAdapter,
    EnsembleHealthAdapter,
)
from .schemas import (
    MLStatusResponse,
    ModelArtifactStatus,
    ModelLoadState,
    CLINICAL_SAFETY_DISCLAIMER,
)


DEFAULT_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
DEFAULT_RF_PATH = DEFAULT_MODELS_DIR / "astra_rf_model.joblib"
DEFAULT_ISO_PATH = DEFAULT_MODELS_DIR / "astra_iso_model.joblib"


class ModelRegistry:
    """Singleton model registry for deep-space biomedical models."""

    def __init__(self, models_dir: Optional[str] = None):
        self.models_dir = Path(models_dir).resolve() if models_dir else DEFAULT_MODELS_DIR
        rf_path = str(self.models_dir / "astra_rf_model.joblib")
        iso_path = str(self.models_dir / "astra_iso_model.joblib")

        self.rf_adapter = RandomForestAdapter(file_path=rf_path, version="1.0.0")
        self.iso_adapter = IsolationForestAdapter(file_path=iso_path, version="1.0.0")
        self.ensemble = EnsembleHealthAdapter(
            iso_adapter=self.iso_adapter,
            rf_adapter=self.rf_adapter,
            version="1.0.0",
        )
        self._adapters: Dict[str, BaseModelAdapter] = {
            self.rf_adapter.model_id: self.rf_adapter,
            self.iso_adapter.model_id: self.iso_adapter,
        }

    def load_all(self) -> Dict[str, bool]:
        """Safely loads all registered model artifacts from the models directory.
        
        Per safety constraints, if a model is missing or fails to load,
        its status is recorded honestly as UNAVAILABLE or LOAD_FAILED.
        No synthetic dataset generation or retraining is attempted.
        """
        results = {}
        for model_id, adapter in self._adapters.items():
            success = adapter.load(allowed_dir=str(self.models_dir))
            results[model_id] = success
        return results

    def get_adapter(self, model_id: str) -> Optional[BaseModelAdapter]:
        """Retrieves an individual model adapter by model_id."""
        return self._adapters.get(model_id)

    def get_ensemble(self) -> EnsembleHealthAdapter:
        """Retrieves the unified dual-model ensemble adapter."""
        return self.ensemble

    def is_operational(self) -> bool:
        """True only if all required models are loaded and available."""
        return all(adapter.is_available() for adapter in self._adapters.values())

    def get_status(self) -> MLStatusResponse:
        """Constructs an honest, transparent status report of all registered models."""
        models_status: Dict[str, ModelArtifactStatus] = {}
        loaded_count = 0

        for model_id, adapter in self._adapters.items():
            status = adapter.get_status()
            models_status[model_id] = status
            if status.status == ModelLoadState.LOADED:
                loaded_count += 1

        if loaded_count == len(self._adapters):
            overall = "OPERATIONAL"
        elif loaded_count > 0:
            overall = "DEGRADED"
        else:
            overall = "UNAVAILABLE"

        return MLStatusResponse(
            overall_status=overall,
            models=models_status,
            engine="Scikit-Learn Random Forest + Isolation Forest",
            mode="100% LOCAL AIR-GAPPED",
            clinical_disclaimer=CLINICAL_SAFETY_DISCLAIMER,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


_registry_instance: Optional[ModelRegistry] = None


def get_model_registry(models_dir: Optional[str] = None) -> ModelRegistry:
    """Returns the authoritative ModelRegistry singleton."""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = ModelRegistry(models_dir=models_dir)
        _registry_instance.load_all()
    return _registry_instance
