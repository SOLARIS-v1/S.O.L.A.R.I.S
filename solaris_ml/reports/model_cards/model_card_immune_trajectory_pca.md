# Model Card — immune_trajectory_pca

Generated from `reports/model_registry.json`. The registry is the sole source of current model status and capability claims.

- **Registry status:** `exploratory`
- **Inference:** `enabled_as_projection_only`
- **Artifact:** `models/immune/immune_trajectory_pca.joblib`
- **Evidence basis:** PCA projection; no validated general clinical interpretation
- **Permitted output:** PCA coordinates only

## Required input units

- `all feature_genes`: `log2_fold_change`

## Prohibited claims

- recovery state
- diagnosis
- risk

## Limitations

This card asserts only the status, inference scope, evidence basis, permitted output, replacement guidance, units, and prohibited claims recorded in the authoritative registry. It contains no unstated performance metrics or clinical claims.

Not clinically validated; not for clinical decision-making or production use.
