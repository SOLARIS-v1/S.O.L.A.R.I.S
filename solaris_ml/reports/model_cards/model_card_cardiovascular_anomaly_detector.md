# Model Card — cardiovascular_anomaly_detector

Generated from `reports/model_registry.json`. The registry is the sole source of current model status and capability claims.

- **Registry status:** `experimental_research_only`
- **Inference:** `enabled_as_unsupervised_score_only`
- **Artifact:** `models/cardiovascular/cardiovascular_anomaly_detector.joblib`
- **Evidence basis:** 184 epochs from 4 records; no verified anomaly labels; no independent validation
- **Permitted output:** unsupervised deviation score only

## Required input units

- `mean_hr_bpm`: `beats/min`
- `mean_rr_ms`: `ms`
- `sdnn_ms`: `ms`
- `rmssd_ms`: `ms`
- `pnn50_pct`: `%`
- `sbp_mean`: `mmHg`
- `dbp_mean`: `mmHg`
- `map_mean`: `mmHg`
- `pp_mean`: `mmHg`

## Prohibited claims

- arrhythmia
- disease probability
- clinical alert

## Limitations

This card asserts only the status, inference scope, evidence basis, permitted output, replacement guidance, units, and prohibited claims recorded in the authoritative registry. It contains no unstated performance metrics or clinical claims.

Not clinically validated; not for clinical decision-making or production use.
