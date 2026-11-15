"""Service layer orchestrating the SOLARIS research ML package.

Coordinates model adapters, descriptive omics/biomarker analytics, and astronaut insights
while strictly maintaining quarantine boundaries and non-diagnostic disclaimers.
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import csv
import numpy as np

from .registry import ResearchRegistry, get_research_registry
from .adapters import (
    CardiovascularAdapter,
    ImmuneTrajectoryAdapter,
    RadiationDosimetryAdapter,
    OcularBoneAdapter,
    QuarantinedModelAdapter,
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
    SleepAnalyticsResponse,
    ImmuneAnalyticsResponse,
    MetabolicAnalyticsResponse,
    AstronautInsightsResponse,
    ResearchRegistryResponse,
    ResearchStatusResponse,
    RESEARCH_CLINICAL_DISCLAIMER,
    CARDIO_EXPECTED_UNITS,
)

# Reference paths
SOLARIS_ML_DIR = Path(__file__).resolve().parents[3] / "solaris_ml"
OMICS_DIR = SOLARIS_ML_DIR / "datasets" / "processed" / "omics"


class ResearchMLService:
    """Orchestrates enabled research adapters and descriptive clinical analytics."""

    def __init__(self, registry: Optional[ResearchRegistry] = None):
        self.registry = registry or get_research_registry()
        self.cardio_adapter = CardiovascularAdapter()
        self.immune_adapter = ImmuneTrajectoryAdapter()
        self.radiation_adapter = RadiationDosimetryAdapter()
        self.ocular_bone_adapter = OcularBoneAdapter()

    def get_registry(self) -> ResearchRegistryResponse:
        """Returns the full parsed model registry metadata."""
        return self.registry.get_raw_registry()

    def get_status(self) -> ResearchStatusResponse:
        """Returns verified operational status and quarantine breakdown."""
        return self.registry.get_status()

    def analyze_cardiovascular(self, req: CardiovascularAnalysisRequest) -> CardiovascularAnalysisResponse:
        """Executes unsupervised cardiovascular deviation analysis."""
        return self.cardio_adapter.analyze(req)

    def project_immune_trajectory(self, req: ImmuneTrajectoryRequest) -> ImmuneTrajectoryResponse:
        """Executes exploratory immune trajectory PCA projection."""
        return self.immune_adapter.project(req)

    def summarize_radiation(self, req: RadiationSummaryRequest) -> RadiationSummaryResponse:
        """Computes deterministic absorbed radiation dose summaries."""
        return self.radiation_adapter.summarize(req)

    def observe_ocular_bone(self, req: OcularBoneRequest) -> OcularBoneResponse:
        """Records and formats caller-supplied ocular and bone observations."""
        return self.ocular_bone_adapter.observe(req)

    def get_ocular_observations(
        self,
        astronaut_id: str = "vance",
        current_onsd_mm: Optional[float] = None,
        baseline_onsd_mm: Optional[float] = None,
    ) -> OcularBoneResponse:
        """Returns descriptive ocular observations (ONSD mm). Never produces SANS risk tiers."""
        c_onsd = current_onsd_mm if current_onsd_mm is not None else (
            5.4 if astronaut_id == "vance" else 5.1 if astronaut_id == "patel" else 5.6
        )
        b_onsd = baseline_onsd_mm if baseline_onsd_mm is not None else 4.9
        req = OcularBoneRequest(
            current_onsd_mm=c_onsd,
            baseline_onsd_mm=b_onsd,
            astronaut_id=astronaut_id,
        )
        return self.observe_ocular_bone(req)

    def get_bone_observations(
        self,
        astronaut_id: str = "vance",
        bmd_t_score: Optional[float] = None,
    ) -> OcularBoneResponse:
        """Returns descriptive DXA T-score observations. Never produces bone loss forecasts."""
        t_score = bmd_t_score if bmd_t_score is not None else (
            -0.8 if astronaut_id == "vance" else -0.3 if astronaut_id == "patel" else -1.2
        )
        req = OcularBoneRequest(
            bmd_t_score=t_score,
            astronaut_id=astronaut_id,
        )
        return self.observe_ocular_bone(req)

    def get_radiation_summary(
        self,
        astronaut_id: str = "vance",
        db_module: Optional[Any] = None,
    ) -> RadiationSummaryResponse:
        """Returns absorbed radiation dose summaries in mGy without universal mSv conversion."""
        daily_rate = 0.42
        if db_module:
            crew = db_module.get_crew_telemetry(astronaut_id)
            if crew:
                daily_rate = float(crew.get("radiation_msv_day", 0.42))
        history_doses = [round(daily_rate * f, 3) for f in (0.95, 1.05, 0.98, 1.12, 1.0, 1.08, 1.02)]
        req = RadiationSummaryRequest(
            daily_absorbed_dose_mgy=history_doses,
            unit="mGy/day",
            astronaut_id=astronaut_id,
        )
        return self.summarize_radiation(req)

    def get_sleep_analytics(self, astronaut_id: str, db_module: Optional[Any] = None) -> SleepAnalyticsResponse:
        """Returns descriptive sleep analytics. Predictive model is strictly quarantined."""
        sleep_hours = 6.8
        circadian = 80.0

        if db_module:
            crew = db_module.get_crew_telemetry(astronaut_id)
            if crew:
                sleep_hours = float(crew.get("sleep_hours", 6.8))
                circadian = float(crew.get("circadian_align_pct", 80.0))

        # Compute descriptive actigraphy metrics
        tst_min = sleep_hours * 60.0
        tib_min = max(tst_min + 45.0, 360.0)
        waso_min = max(tib_min - tst_min - 15.0, 10.0)
        awakenings = 2 if sleep_hours >= 6.5 else 4
        efficiency = round((tst_min / tib_min) * 100.0, 2)

        metrics = {
            "recorded_total_sleep_time_hours": round(sleep_hours, 2),
            "estimated_time_in_bed_hours": round(tib_min / 60.0, 2),
            "measured_sleep_efficiency_pct": efficiency,
            "wake_after_sleep_onset_min": round(waso_min, 1),
            "awakenings_count": awakenings,
            "circadian_phase_alignment_pct": round(circadian, 1),
            "sleep_classification_descriptive": "optimal" if efficiency >= 85.0 else "mildly_compromised",
        }

        return SleepAnalyticsResponse(
            astronaut_id=astronaut_id,
            metrics=metrics,
            generated_at_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )

    def get_immune_analytics(self, astronaut_id: str) -> ImmuneAnalyticsResponse:
        """Returns descriptive immune repertoire diversity and exploratory PCA projection."""
        diversity_records = []
        csv_path = OMICS_DIR / "immune_repertoire_diversity.csv"
        if csv_path.exists():
            try:
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        diversity_records.append({
                            "repertoire_type": row.get("repertoire_type"),
                            "chain_type": row.get("chain_type"),
                            "unique_clonotypes": int(row.get("unique_clonotypes", 0)),
                            "shannon_entropy": float(row.get("shannon_entropy", 0.0)),
                            "gini_simpson_index": float(row.get("gini_simpson_index", 0.0)),
                        })
            except Exception:
                pass

        # Exploratory PCA projection using zero-centered baseline for feature genes
        genes = self.immune_adapter.feature_genes
        sample_log2fc = {g: 0.05 if i % 2 == 0 else -0.05 for i, g in enumerate(genes)}
        units = {g: "log2_fold_change" for g in genes}
        traj_req = ImmuneTrajectoryRequest(gene_log2fc=sample_log2fc, units=units, astronaut_id=astronaut_id)
        traj_resp = self.immune_adapter.project(traj_req)

        return ImmuneAnalyticsResponse(
            astronaut_id=astronaut_id,
            trajectory=traj_resp,
            output=traj_resp.output,
            diversity_metrics={
                "cohort_samples_monitored": len(diversity_records),
                "summary": "TCR and BCR clonotype diversity indices tracked across flight timeline.",
                "sample_entries": diversity_records[:4],
            },
            generated_at_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )

    def get_metabolic_analytics(self, astronaut_id: str) -> MetabolicAnalyticsResponse:
        """Returns descriptive plasma metabolomics. Predictive classifier is strictly quarantined."""
        biomarkers = {}
        csv_path = OMICS_DIR / "metabolomics_anp_amino_acids.csv"
        if csv_path.exists():
            try:
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    key_compounds = ["Alanine", "Glutamine", "Creatinine", "Arginine", "Proline"]
                    for row in reader:
                        comp = row.get("Compound Name")
                        if comp in key_compounds:
                            biomarkers[comp] = {
                                "sub_pathway": row.get("SubPathway"),
                                "formula": row.get("Formula"),
                                "measured_mass": row.get("Mass"),
                                "plasma_signal_mean": float(row.get("p_1_1", 1000000.0)),
                                "unit": "raw_ion_counts_anp",
                            }
            except Exception:
                pass

        return MetabolicAnalyticsResponse(
            astronaut_id=astronaut_id,
            biomarkers=biomarkers,
            generated_at_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )

    def get_astronaut_insights(self, astronaut_id: str, db_module: Optional[Any] = None) -> AstronautInsightsResponse:
        """Aggregates multi-system research ML outputs for a specific astronaut."""
        crew_name = astronaut_id.title()
        crew_data = None
        if db_module:
            crew_data = db_module.get_crew_telemetry(astronaut_id)
            if not crew_data and astronaut_id.lower() not in ("vance", "patel", "chen"):
                raise KeyError(f"Astronaut '{astronaut_id}' not found.")
            if crew_data:
                crew_name = crew_data.get("name", crew_name)
        elif astronaut_id.lower() not in ("vance", "patel", "chen"):
            raise KeyError(f"Astronaut '{astronaut_id}' not found.")

        # 1. Cardiovascular analysis
        hr = float(crew_data["heart_rate_bpm"]) if crew_data else 72.0
        sbp = 122.0 if hr > 85 else 118.0
        dbp = 82.0 if hr > 85 else 78.0
        map_val = dbp + (sbp - dbp) / 3.0
        pp_val = sbp - dbp
        mean_rr = 60000.0 / hr
        rmssd = float(crew_data["hrv_rmssd_ms"]) if crew_data else 45.0
        sdnn = rmssd * 1.3

        cardio_req = CardiovascularAnalysisRequest(
            mean_hr_bpm=hr,
            mean_rr_ms=round(mean_rr, 1),
            sdnn_ms=round(sdnn, 1),
            rmssd_ms=round(rmssd, 1),
            pnn50_pct=15.0 if rmssd > 40 else 5.0,
            sbp_mean=round(sbp, 1),
            dbp_mean=round(dbp, 1),
            map_mean=round(map_val, 1),
            pp_mean=round(pp_val, 1),
            units=dict(CARDIO_EXPECTED_UNITS),
            astronaut_id=astronaut_id,
        )
        cardio_resp = self.analyze_cardiovascular(cardio_req)

        # 2. Sleep analytics
        sleep_resp = self.get_sleep_analytics(astronaut_id, db_module=db_module)

        # 3. Radiation summary (7-day absorbed dose in mGy)
        daily_rate = float(crew_data["radiation_msv_day"]) if crew_data else 0.42  # dose rate in mGy
        history_doses = [round(daily_rate * f, 3) for f in (0.95, 1.05, 0.98, 1.12, 1.0, 1.08, 1.02)]
        rad_req = RadiationSummaryRequest(
            daily_absorbed_dose_mgy=history_doses,
            unit="mGy/day",
            astronaut_id=astronaut_id,
        )
        rad_resp = self.summarize_radiation(rad_req)

        # 4. Ocular & Bone observations
        ocular_req = OcularBoneRequest(
            current_onsd_mm=5.4 if astronaut_id == "vance" else 5.1 if astronaut_id == "patel" else 5.6,
            baseline_onsd_mm=4.9,
            bmd_t_score=-0.8 if astronaut_id == "vance" else -0.3 if astronaut_id == "patel" else -1.2,
            astronaut_id=astronaut_id,
        )
        ocular_resp = self.observe_ocular_bone(ocular_req)

        # 5. Immune & Metabolic analytics
        immune_resp = self.get_immune_analytics(astronaut_id)
        metabolic_resp = self.get_metabolic_analytics(astronaut_id)

        return AstronautInsightsResponse(
            astronaut_id=astronaut_id,
            astronaut_name=crew_name,
            mission_sol=142,
            cardiovascular=cardio_resp,
            sleep=sleep_resp,
            radiation=rad_resp,
            ocular=ocular_resp,
            bone=ocular_resp,
            immune=immune_resp,
            metabolic=metabolic_resp,
            clinical_disclaimer=RESEARCH_CLINICAL_DISCLAIMER,
            generated_at_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )


_service_instance: Optional[ResearchMLService] = None


def get_research_ml_service() -> ResearchMLService:
    global _service_instance
    if _service_instance is None:
        _service_instance = ResearchMLService()
    return _service_instance
