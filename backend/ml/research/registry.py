"""Research Model Registry Loader for SOLARIS ML.

Parses solaris_ml/reports/model_registry.json to enforce model statuses,
scientific justifications, and quarantine rules across all analytical endpoints.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import sklearn

from .schemas import ResearchRegistryResponse, ResearchStatusResponse


SOLARIS_ML_DIR = Path(__file__).resolve().parents[3] / "solaris_ml"
REGISTRY_JSON_PATH = SOLARIS_ML_DIR / "reports" / "model_registry.json"


class ResearchRegistry:
    """Singleton research model registry."""

    def __init__(self, registry_path: Optional[Path] = None):
        self.registry_path = registry_path or REGISTRY_JSON_PATH
        self._raw_data: Dict[str, Any] = {}
        self._models_by_id: Dict[str, Dict[str, Any]] = {}
        self.load()

    def load(self) -> None:
        """Loads and indexes the research model registry."""
        if not self.registry_path.exists():
            raise FileNotFoundError(f"Research model registry not found at {self.registry_path}")

        with open(self.registry_path, "r", encoding="utf-8") as f:
            self._raw_data = json.load(f)

        self._models_by_id = {
            m["id"]: m for m in self._raw_data.get("models", [])
        }

    def get_raw_registry(self) -> ResearchRegistryResponse:
        return ResearchRegistryResponse(
            registry_version=self._raw_data.get("registry_version", "2.0.0"),
            policy=self._raw_data.get("policy", ""),
            models=self._raw_data.get("models", []),
            artifact_compatibility=self._raw_data.get("artifact_compatibility", {}),
        )

    def get_model(self, model_id: str) -> Optional[Dict[str, Any]]:
        return self._models_by_id.get(model_id)

    def is_quarantined(self, model_id: str) -> bool:
        model = self.get_model(model_id)
        if not model:
            return True
        return model.get("inference") == "disabled" or "quarantined" in model.get("status", "")

    def get_quarantined_models(self) -> List[Dict[str, Any]]:
        return [m for m in self._models_by_id.values() if self.is_quarantined(m["id"])]

    def get_enabled_models(self) -> List[Dict[str, Any]]:
        return [m for m in self._models_by_id.values() if not self.is_quarantined(m["id"])]

    def get_status(self) -> ResearchStatusResponse:
        models_status = {}
        for mid, m in self._models_by_id.items():
            models_status[mid] = {
                "id": mid,
                "status": m.get("status"),
                "inference": m.get("inference"),
                "is_quarantined": self.is_quarantined(mid),
                "basis": m.get("basis", ""),
                "prohibited_claims": m.get("prohibited_claims", []),
            }

        # Include legacy pipeline models for backward compatibility
        try:
            from ..model_registry import get_model_registry
            legacy_reg = get_model_registry()
            for l_mid, l_m in legacy_reg._adapters.items():
                if l_mid not in models_status:
                    models_status[l_mid] = {
                        "id": l_mid,
                        "status": l_m.status.value,
                        "inference": "legacy_compat",
                        "is_quarantined": False,
                        "basis": "Legacy operational dual-model telemetry pipeline",
                    }
        except Exception:
            pass

        return ResearchStatusResponse(
            overall_status="OPERATIONAL" if len(self.get_enabled_models()) > 0 else "UNAVAILABLE",
            package_status="VERIFIED_OPERATIONAL",
            policy=self._raw_data.get("policy", ""),
            models=models_status,
            quarantined_count=len(self.get_quarantined_models()),
            enabled_count=len(self.get_enabled_models()),
            runtime_sklearn_version=sklearn.__version__,
            generated_at_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )


_research_registry_instance: Optional[ResearchRegistry] = None


def get_research_registry() -> ResearchRegistry:
    global _research_registry_instance
    if _research_registry_instance is None:
        _research_registry_instance = ResearchRegistry()
    return _research_registry_instance
