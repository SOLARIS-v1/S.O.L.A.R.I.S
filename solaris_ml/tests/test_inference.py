import os
import sys
import math
import unittest
import subprocess
import json
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
import inference
from inference import (CardiovascularInference, SleepRecoveryInference,
    StressCircadianInference, ImmuneTrajectoryInference, MetabolicBiomarkerInference,
    RadiationDosimetryInference, OcularBoneInference, PerformanceActivityInference)
from feature_extraction.spaceflight_deterministic import (
    calculate_radiation_exposure, evaluate_ocular_health, evaluate_bone_health)


class TestSolarisInference(unittest.TestCase):
    def test_sleep_stress_activity_and_proteomics_are_quarantined(self):
        for cls in (SleepRecoveryInference, StressCircadianInference,
                    MetabolicBiomarkerInference, PerformanceActivityInference):
            with self.subTest(cls=cls.__name__), self.assertRaisesRegex(RuntimeError, "quarantined"):
                cls().predict({})

    def test_radiation_requires_explicit_nonempty_finite_nonnegative_input(self):
        engine = RadiationDosimetryInference()
        for sample in ({}, {"daily_absorbed_dose_mgy": []},
                       {"daily_absorbed_dose_mgy": [float("nan")]},
                       {"daily_absorbed_dose_mgy": [-1]}):
            with self.subTest(sample=sample), self.assertRaises(ValueError):
                engine.predict(sample)
        result = engine.predict({"daily_absorbed_dose_mgy": [0.4, 0.5]})
        self.assertEqual(result["output"]["cumulative_absorbed_dose_mgy"], 0.9)
        self.assertNotIn("cumulative_effective_dose_msv", result["output"])
        self.assertEqual(result["status"], "deterministic_analytics")
        self.assertTrue(result["generated_at_utc"].endswith("+00:00"))
        self.assertEqual(result["provenance"]["conversion_applied"], False)

    def test_radiation_rejects_malformed_types_units_and_unknown_fields(self):
        engine = RadiationDosimetryInference()
        bad = [
            {"daily_absorbed_dose_mgy": "0.4"},
            {"daily_absorbed_dose_mgy": [True]},
            {"daily_absorbed_dose_mgy": ["0.4"]},
            {"daily_absorbed_dose_mgy": [float("inf")]},
            {"daily_absorbed_dose_mgy": [0.4], "unit": "mSv/day"},
            {"daily_absorbed_dose_mgy": [0.4], "quality_factor_q": 1.5},
            None,
        ]
        for sample in bad:
            with self.subTest(sample=sample), self.assertRaises(ValueError):
                engine.predict(sample)

    def test_radiation_legacy_function_rejects_q_and_bad_data(self):
        with self.assertRaises(ValueError):
            calculate_radiation_exposure([0.4], radiation_quality_factor=1.5)
        with self.assertRaises(ValueError):
            calculate_radiation_exposure([0.4, -1])
        for malformed in ([True], ["0.4"], "0.4"):
            with self.subTest(malformed=malformed), self.assertRaises(ValueError):
                calculate_radiation_exposure(malformed)
        self.assertEqual(calculate_radiation_exposure([0.2, 0.3])["cumulative_absorbed_dose_mgy"], 0.5)

    def test_ocular_bone_are_observations_only(self):
        out = OcularBoneInference().predict({"current_onsd_mm": 5.9, "bmd_t_score": -2.6})
        self.assertEqual(out["status"], "observations_only")
        self.assertNotIn("sans_risk_tier", out["output"])
        self.assertNotIn("projected_monthly_bmd_loss_pct", out["output"])
        with self.assertRaises(ValueError):
            OcularBoneInference().predict({})
        for sample in ({"current_onsd_mm": True}, {"current_onsd_mm": "5.9"},
                       {"current_onsd_mm": 5.9, "unknown": 1}, []):
            with self.subTest(sample=sample), self.assertRaises(ValueError):
                OcularBoneInference().predict(sample)
        self.assertIsNone(evaluate_ocular_health([5.9])["sans_risk_tier"])
        self.assertIsNone(evaluate_bone_health(-2.6)["bone_health_status"])

    def test_cardio_rejects_missing_and_implausible_inputs(self):
        try:
            model = CardiovascularInference()
        except RuntimeError as exc:
            self.assertIn("requires scikit-learn==1.9.1", str(exc))
            return
        except (FileNotFoundError, ImportError, ModuleNotFoundError) as exc:
            self.skipTest(f"Experimental artifact/dependency unavailable: {exc}")
        with self.assertRaisesRegex(ValueError, "Missing required"):
            model.predict({})
        sample = dict(mean_hr_bpm=70, mean_rr_ms=850, sdnn_ms=40, rmssd_ms=25,
                      pnn50_pct=10, sbp_mean=120, dbp_mean=80, map_mean=90, pp_mean=40)
        sample["units"] = {"mean_hr_bpm": "beats/min", "mean_rr_ms": "ms", "sdnn_ms": "ms",
                           "rmssd_ms": "ms", "pnn50_pct": "%", "sbp_mean": "mmHg",
                           "dbp_mean": "mmHg", "map_mean": "mmHg", "pp_mean": "mmHg"}
        self.assertEqual(model.predict(sample)["status"], "experimental")
        sample["pnn50_pct"] = 101
        with self.assertRaises(ValueError):
            model.predict(sample)
        sample["pnn50_pct"] = True
        with self.assertRaises(ValueError):
            model.predict(sample)

    def test_immune_missing_feature_is_rejected(self):
        try:
            model = ImmuneTrajectoryInference()
        except RuntimeError as exc:
            self.assertIn("requires scikit-learn==1.9.1", str(exc))
            return
        except (FileNotFoundError, ImportError, ModuleNotFoundError) as exc:
            self.skipTest(f"Exploratory artifact/dependency unavailable: {exc}")
        with self.assertRaisesRegex(ValueError, "Missing required"):
            model.predict({})

    def test_model_loader_rejects_version_mismatch_before_deserialization(self):
        with patch.object(inference.sklearn, "__version__", "1.9.0"), \
             patch.object(inference.joblib, "load", side_effect=AssertionError("must not deserialize")) as loader:
            with self.assertRaisesRegex(RuntimeError, "requires scikit-learn==1.9.1"):
                inference._load_artifact("artifact.joblib")
            loader.assert_not_called()

    def test_model_loading_and_artifact_schema_validation(self):
        marker = object()
        with patch.object(inference.sklearn, "__version__", "1.9.1"), \
             patch.object(inference.joblib, "load", return_value=marker) as loader:
            self.assertIs(inference._load_artifact("artifact.joblib"), marker)
            loader.assert_called_once_with("artifact.joblib")
        with patch.object(inference, "_load_artifact", return_value=object()):
            with self.assertRaisesRegex(RuntimeError, "schema mismatch"):
                CardiovascularInference()

    @unittest.skipUnless(inference.sklearn.__version__ == inference.ARTIFACT_SKLEARN_VERSION,
                         "Artifact compatibility unverified: runtime does not match pinned scikit-learn")
    def test_real_supported_artifact_loading_and_inference(self):
        cardio = CardiovascularInference()
        cv_input = dict(mean_hr_bpm=70, mean_rr_ms=850, sdnn_ms=40, rmssd_ms=25,
                        pnn50_pct=10, sbp_mean=120, dbp_mean=80, map_mean=90, pp_mean=40,
                        units={"mean_hr_bpm": "beats/min", "mean_rr_ms": "ms", "sdnn_ms": "ms",
                               "rmssd_ms": "ms", "pnn50_pct": "%", "sbp_mean": "mmHg",
                               "dbp_mean": "mmHg", "map_mean": "mmHg", "pp_mean": "mmHg"})
        score = float(cardio.predict(cv_input)["output"]["unsupervised_deviation_score"])
        self.assertTrue(math.isfinite(score))
        immune = ImmuneTrajectoryInference()
        genes = immune.artifact["feature_genes"]
        immune_input = {gene: 0.0 for gene in genes}
        immune_input["units"] = {gene: "log2_fold_change" for gene in genes}
        coords = immune.predict(immune_input)["output"]["pca_coordinates"]
        self.assertTrue(coords)
        self.assertTrue(all(isinstance(value, float) for value in coords))

    def test_inference_interfaces_reject_bad_schemas_and_validate_responses(self):
        cardio = CardiovascularInference.__new__(CardiovascularInference)
        cardio.pipeline = SimpleNamespace(decision_function=lambda x: [0.25])
        valid = dict(mean_hr_bpm=70, mean_rr_ms=850, sdnn_ms=40, rmssd_ms=25,
                     pnn50_pct=10, sbp_mean=120, dbp_mean=80, map_mean=90, pp_mean=40)
        units = {"mean_hr_bpm": "beats/min", "mean_rr_ms": "ms", "sdnn_ms": "ms",
                 "rmssd_ms": "ms", "pnn50_pct": "%", "sbp_mean": "mmHg",
                 "dbp_mean": "mmHg", "map_mean": "mmHg", "pp_mean": "mmHg"}
        valid["units"] = units
        for sample in ({**valid, "extra": 1}, {**valid, "mean_hr_bpm": True},
                       {**valid, "units": {**units, "mean_hr_bpm": "Hz"}},
                       {key: value for key, value in valid.items() if key != "units"}, []):
            with self.subTest(sample=sample), self.assertRaises(ValueError):
                cardio.predict(sample)
        response = cardio.predict(valid)
        self.assertEqual(response["output"]["unsupervised_deviation_score"], 0.25)
        self.assertEqual(response["input_features"]["units"], units)
        self.assertTrue(response["generated_at_utc"].endswith("+00:00"))

        immune = ImmuneTrajectoryInference.__new__(ImmuneTrajectoryInference)
        immune.artifact = {"feature_genes": ["G1", "G2"], "pipeline": SimpleNamespace(
            transform=lambda x: [[1.0, 2.0]])}
        immune_units = {"G1": "log2_fold_change", "G2": "log2_fold_change"}
        for sample in ({"G1": 1.0, "units": immune_units},
                       {"G1": 1.0, "G2": float("inf"), "units": immune_units},
                       {"G1": 1.0, "G2": 2.0, "EXTRA": 3.0, "units": immune_units},
                       {"G1": 1.0, "G2": 2.0, "units": {"G1": "fold_change", "G2": "fold_change"}},
                       {"G1": 1.0, "G2": 2.0}):
            with self.subTest(sample=sample), self.assertRaises(ValueError):
                immune.predict(sample)
        immune_response = immune.predict({"G1": 1.0, "G2": 2.0, "units": immune_units})
        self.assertEqual(immune_response["output"]["pca_coordinates"], [1.0, 2.0])
        self.assertEqual(immune_response["input_features"]["units"], immune_units)

    def test_response_schema_rejects_naive_timestamp(self):
        naive_datetime = SimpleNamespace(now=lambda tz=None: datetime(2026, 1, 1),
                                         fromisoformat=datetime.fromisoformat)
        with patch.object(inference, "datetime", naive_datetime):
            with self.assertRaisesRegex(RuntimeError, "UTC offset"):
                inference._result("model", "1", "research", {}, {}, "ok", {}, [])
        self.assertTrue(inference._result("model", "1", "research", {}, {}, "ok", {}, [])[
            "generated_at_utc"].endswith("+00:00"))

    def test_model_card_generator_executes_and_outputs_registry_only_cards(self):
        root = Path(__file__).resolve().parents[1]
        generator = root / "src" / "data_audit" / "generate_model_cards.py"
        subprocess.run([sys.executable, str(generator)], cwd=root, check=True, capture_output=True, text=True)
        registry = json.loads((root / "reports" / "model_registry.json").read_text(encoding="utf-8"))
        cards = list((root / "reports" / "model_cards").glob("model_card_*.md"))
        self.assertEqual(len(cards), len(registry["models"]))
        combined = "\n".join(card.read_text(encoding="utf-8") for card in cards)
        for model in registry["models"]:
            self.assertIn(model["id"], combined)
            self.assertIn(model["status"], combined)
        for stale_claim in ("R² = 0.889", "flight surgeons", "clinical risk tier", "100.0% (15/15)", "NASA 30-day limit"):
            self.assertNotIn(stale_claim.lower(), combined.lower())

    def test_number_rejects_coercive_and_nonfinite_values(self):
        for value in (True, "3.2", None, float("nan"), float("inf")):
            with self.subTest(value=value), self.assertRaises(ValueError):
                inference._number(value, "measurement")

    def test_quarantined_endpoints_stay_disabled(self):
        for cls in (SleepRecoveryInference, StressCircadianInference,
                    MetabolicBiomarkerInference, PerformanceActivityInference):
            with self.subTest(cls=cls.__name__), self.assertRaisesRegex(RuntimeError, "quarantined"):
                cls().predict({"anything": 1})


if __name__ == "__main__":
    unittest.main()
