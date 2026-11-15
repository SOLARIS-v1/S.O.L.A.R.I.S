# Delivery summary

## Verification performed

- Runtime: Python 3.14.6, scikit-learn 1.9.1, NumPy 2.5.1, SciPy 1.18.1, joblib 1.6.0.
- `python -m unittest discover -s tests -v`: **15 tests passed**.
- `python -W error::SyntaxWarning -m compileall -q -f src tests`: **passed**.
- The model-card generator was executed by its regression test. It generated one card per registry entry, replaced stale cards, and the test checked for previously unsupported metrics and claims.
- Both supported serialized artifacts were loaded under scikit-learn 1.9.1 and exercised with sample inference: cardiovascular deviation scoring and immune PCA projection **passed**.
- Cardiovascular and immune inference now require complete unit metadata and echo units in the response. Generated timestamps must carry a UTC offset.

## Exact artifact environment

`requirements-artifact-validation.txt` records the Python 3.14.6 validation runtime dependencies, including the exact scikit-learn 1.9.1 version stored in the supported artifact metadata. The general `requirements.txt` also pins scikit-learn to 1.9.1.

## Scope and limitations

No models were retrained and no labels, thresholds, performance claims, or clinical claims were added. Predictive sleep, stress/anxiety, proteomics, and physical-performance models remain quarantined. Cardiovascular output remains an experimental statistical deviation score with no verified anomaly labels or independent validation. Immune output remains exploratory PCA coordinates without clinical interpretation. Radiation remains descriptive absorbed-dose analytics without effective-dose conversion or safety determinations. Ocular and bone endpoints remain observation-only.

Artifact loading and the exercised inference calls verify software compatibility and interface behavior; they do not validate scientific performance or clinical usefulness. This package is **not clinically validated or production-ready**.
