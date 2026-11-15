# SOLARIS research and analytics package

This package preserves useful signal processing, feature extraction, dataset audit, and exploratory analysis code. It is a research package; it is **not production-ready, clinically validated, or a medical device**. Historical reports are audit records and do not establish model validity. Current model cards are generated solely from the authoritative registry.

Read [the correction report](reports/correction_report.md) and [model registry](reports/model_registry.json) before using any interface. No model was retrained.

## Current inference boundaries

- Cardiovascular: experimental unsupervised deviation score only; no diagnosis or alert.
- Immune: exploratory PCA coordinates only.
- Sleep, stress/anxiety, general proteomics, and physical-performance predictive models: quarantined and disabled.
- Radiation: descriptive summaries of explicitly supplied daily absorbed dose in `mGy/day`; no effective-dose conversion or safety determination.
- Ocular/bone: returns supplied observations only.

## Environment

Use a Python version supported by the pinned dependencies and install `requirements.txt`. The serialized scikit-learn artifacts record version **1.9.1**; this exact version is pinned in `requirements.txt` and `requirements-artifact-validation.txt`. Artifact loading fails with a clear compatibility error under another version. Do not silently upgrade scikit-learn while using these files. The real supported artifacts were loaded and exercised with scikit-learn 1.9.1 during this package revision.

```bash
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m compileall -q src tests
python src/data_audit/generate_model_cards.py
```

For a lean artifact-validation environment use Python 3.14.6 and `python -m pip install -r requirements-artifact-validation.txt`.

## Supported examples

Run from the `solaris_ml` directory:

```python
from src.inference import RadiationDosimetryInference, OcularBoneInference

dose = RadiationDosimetryInference().predict({
    "daily_absorbed_dose_mgy": [0.4, 0.42, 0.38],
    "unit": "mGy/day",
})
observations = OcularBoneInference().predict({
    "current_onsd_mm": 5.9,
    "bmd_t_score": -2.6,
})
```

Cardiovascular input includes a `units` mapping for all nine features (`beats/min`, `ms`, `%`, or `mmHg` as defined in the registry). Immune input includes a `units` mapping assigning `log2_fold_change` to every artifact gene. Missing, wrong, or extra unit entries are rejected. Inference inputs must use the documented field names and contain finite numeric values. Booleans, numeric strings, missing values, unknown fields, and incompatible artifacts are rejected. Responses preserve unit metadata and include a UTC-offset-aware ISO-8601 generation timestamp plus explicit provenance/limitations.

The `src` tree also contains research preprocessing and analysis scripts. Review their source, dataset documentation, and relevant model status before running them; historical scripts are not endorsements of the quarantined prediction endpoints. Never retrain or promote models without defensible data, labels, participant-aware validation, and a documented scientific review.
