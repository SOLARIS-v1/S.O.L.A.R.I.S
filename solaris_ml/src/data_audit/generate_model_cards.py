"""Generate conservative model cards from the authoritative model registry."""
from __future__ import annotations

import json
from pathlib import Path
import re

BASE_DIR = Path(__file__).resolve().parents[2]
REGISTRY_PATH = BASE_DIR / "reports" / "model_registry.json"
CARDS_DIR = BASE_DIR / "reports" / "model_cards"


def _slug(model_id: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", model_id.lower()).strip("_")


def _render_card(model: dict) -> str:
    lines = [
        f"# Model Card — {model['id']}",
        "",
        "Generated from `reports/model_registry.json`. The registry is the sole source of current model status and capability claims.",
        "",
        f"- **Registry status:** `{model['status']}`",
        f"- **Inference:** `{model['inference']}`",
        f"- **Artifact:** `{model.get('artifact', 'none')}`",
        f"- **Evidence basis:** {model['basis']}",
    ]
    if model.get("permitted_output"):
        lines.append(f"- **Permitted output:** {model['permitted_output']}")
    if model.get("replacement"):
        lines.append(f"- **Replacement guidance:** {model['replacement']}")
    units = model.get("input_units")
    if units:
        lines.extend(["", "## Required input units", ""])
        lines.extend(f"- `{name}`: `{unit}`" for name, unit in units.items())
    prohibited = model.get("prohibited_claims", [])
    if prohibited:
        lines.extend(["", "## Prohibited claims", ""])
        lines.extend(f"- {claim}" for claim in prohibited)
    lines.extend([
        "", "## Limitations", "",
        "This card asserts only the status, inference scope, evidence basis, permitted output, replacement guidance, units, and prohibited claims recorded in the authoritative registry. It contains no unstated performance metrics or clinical claims.",
        "", "Not clinically validated; not for clinical decision-making or production use.", "",
    ])
    return "\n".join(lines)


def create_model_cards() -> list[Path]:
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    models = registry.get("models")
    if not isinstance(models, list) or not models:
        raise ValueError("Model registry must contain a non-empty models list")
    ids = [model.get("id") for model in models]
    if any(not isinstance(value, str) or not value for value in ids) or len(ids) != len(set(ids)):
        raise ValueError("Model registry IDs must be unique non-empty strings")
    CARDS_DIR.mkdir(parents=True, exist_ok=True)
    outputs = []
    for model in models:
        if not all(isinstance(model.get(key), str) and model[key] for key in ("status", "inference", "basis")):
            raise ValueError(f"Registry entry {model['id']} is missing status, inference, or basis")
        path = CARDS_DIR / f"model_card_{_slug(model['id'])}.md"
        path.write_text(_render_card(model), encoding="utf-8")
        outputs.append(path)
    # Remove generated cards for models no longer present so stale claims cannot survive regeneration.
    expected = {path.name for path in outputs}
    for path in CARDS_DIR.glob("model_card_*.md"):
        if path.name not in expected:
            path.unlink()
    return outputs


if __name__ == "__main__":
    created = create_model_cards()
    print(f"Generated {len(created)} registry-backed model cards in {CARDS_DIR}")
