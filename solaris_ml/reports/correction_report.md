# SOLARIS ML correction report

## Scope and boundaries

This is a research and analytics package, not production-ready, clinically validated, or a medical device. The correction preserves useful signal-processing and research code. No model was retrained and no labels, thresholds, or validation results were created.

## Current inference policy

- Sleep efficiency, stress/anxiety, general proteomics, and formula-derived physical-performance models remain quarantined and disabled.
- Cardiovascular inference is an experimental unsupervised deviation score only. The training set is small, no verified anomaly labels exist, and no independent validation is available.
- Immune inference is an exploratory PCA projection only; no recovery state or health classification is emitted.
- Radiation analytics require explicit, finite, nonnegative daily absorbed-dose observations in mGy/day. They do not convert to equivalent/effective dose or assess safety.
- Ocular and bone interfaces return caller-supplied numeric observations only, without risk tiers, diagnoses, projections, or recommendations.

## Validation and artifact handling

Inference rejects missing required fields, booleans, strings that merely look numeric, non-finite values, malformed containers, unknown fields, and dose-unit mismatches. Result envelopes are schema-checked and include an ISO-8601 UTC generation timestamp, provenance, and limitations. Model artifacts are checked for exact scikit-learn compatibility before deserialization; the embedded metadata for every included scikit-learn artifact reports **1.9.1**, so `requirements.txt` pins `scikit-learn==1.9.1`. The cardiovascular artifact's input width and required operation are checked after loading; immune artifact keys/features are checked before inference.

Quarantined artifacts remain stored under `models/quarantined/` for audit only and are not loaded through the inference interfaces. Historical model cards and evaluation/training reports are explicitly labeled as historical audit records, not endorsed performance or current capability.

## Verification run for this delivery

Commands are run from the `solaris_ml` package directory:

```text
python -m unittest discover -s tests -v
Ran 12 tests — OK
python -W error::SyntaxWarning -m compileall -q -f src tests
Compilation passed with SyntaxWarnings treated as errors
```

The local environment has scikit-learn 1.9.0, while the archived artifact metadata requires 1.9.1. Therefore runtime artifact inference correctly fails closed in this environment. The compatibility guard and incompatible-version path are covered by tests; install the exact pinned dependency before loading supported artifacts. No retraining or performance evaluation was performed.
