import json
import os

def create_notebook(path, title, description, code_cells):
    nb = {
        "cells": [
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": [
                    f"# {title}\n",
                    f"\n",
                    f"**Historical research notebook. Not production-ready, clinically validated, or a medical device.**\n",
                    f"\n",
                    f"Review `reports/model_registry.json` and `reports/correction_report.md`; quarantined predictive endpoints must not be called.\n",
                    f"\n",
                    f"{description}\n"
                ]
            }
        ],
        "metadata": {
            "language_info": {
                "name": "python"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }
    
    for intro, code in code_cells:
        if intro:
            nb["cells"].append({
                "cell_type": "markdown",
                "metadata": {},
                "source": [f"### {intro}\n"]
            })
        nb["cells"].append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [line + "\n" for line in code.split("\n")]
        })
        
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=2)
    print(f"Created notebook: {path}")

def generate_all_notebooks():
    base_nb = os.path.join("solaris_ml", "notebooks")
    
    # 1. Dataset Exploration
    create_notebook(
        os.path.join(base_nb, "dataset_exploration", "01_dataset_audit_exploration.ipynb"),
        "SOLARIS — Dataset Exploration & Audit Notebook",
        "Inspects verified MMASH, Autonomic Aging, NASA OSD-570/571, and SOMA research datasets.",
        [
            ("Load Dataset Registry", "import json\nwith open('../../reports/dataset_registry.json') as f:\n    reg = json.load(f)\nprint('Audited Datasets:', list(reg['datasets'].keys()))"),
            ("Inspect MMASH Cohort Features", "import pandas as pd\ndf_mmash = pd.read_csv('../../datasets/processed/mmash/mmash_cohort_features.csv')\nprint(df_mmash.info())\ndf_mmash.head()")
        ]
    )

    # 2. Cardiovascular
    create_notebook(
        os.path.join(base_nb, "cardiovascular", "02_cardiovascular_analysis.ipynb"),
        "SOLARIS — Cardiovascular Signal Processing & Anomaly Detection",
        "Explores ECG/HRV feature extraction. The cardiovascular artifact is experimental and emits an unlabeled statistical deviation score only.",
        [
            ("Initialize Cardiovascular Inference", "import sys\nsys.path.append('../../src')\nfrom inference import CardiovascularInference\ninf = CardiovascularInference()\nsample = {'mean_hr_bpm': 74.0, 'mean_rr_ms': 810.0, 'sdnn_ms': 45.0, 'rmssd_ms': 32.0, 'pnn50_pct': 12.0, 'sbp_mean': 120.0, 'dbp_mean': 80.0, 'map_mean': 93.3, 'pp_mean': 40.0}\nprint(inf.predict(sample))")
        ]
    )

    # 3. Sleep
    create_notebook(
        os.path.join(base_nb, "sleep", "03_sleep_recovery_modeling.ipynb"),
        "SOLARIS — Sleep Architecture & Recovery Modeling",
        "Explores recorded sleep observations. Sleep-efficiency prediction is quarantined because of target leakage.",
        [
            ("Quarantined endpoint", "print('Sleep efficiency prediction is disabled; analyze recorded sleep measurements as observations only.')")
        ]
    )

    # 4. Immune
    create_notebook(
        os.path.join(base_nb, "immune", "04_immune_repertoire_trajectory.ipynb"),
        "SOLARIS — Immune Repertoire & Spaceflight Trajectory",
        "Explores TCR/BCR diversity and immune data. The saved PCA is a feature-specific exploratory projection only.",
        [
            ("Inspect Repertoire Diversity", "import pandas as pd\nrep_df = pd.read_csv('../../datasets/processed/omics/immune_repertoire_diversity.csv')\nprint(rep_df.head())\nprint('PCA coordinates are exploratory only; no recovery or health state is inferred.')")
        ]
    )

    # 5. Metabolic
    create_notebook(
        os.path.join(base_nb, "metabolic", "05_plasma_proteomics_biomarkers.ipynb"),
        "SOLARIS — Plasma Proteomics & Metabolic Profiling",
        "Explores Inspiration4 longitudinal plasma proteomics. General health-state classification is quarantined due to the very small cohort.",
        [
            ("Quarantined endpoint", "print('General proteomics classification is disabled; use descriptive analyses only.')")
        ]
    )

    # 6. Radiation
    create_notebook(
        os.path.join(base_nb, "radiation", "06_radiation_dosimetry_analytics.ipynb"),
        "SOLARIS — Radiation Dosimetry & SPE Spike Analysis",
        "Summarizes only explicitly supplied absorbed-dose observations in mGy/day; no effective-dose conversion or safety decision is produced.",
        [
            ("Summarize supplied absorbed dose", "import sys\nsys.path.append('../../src')\nfrom inference import RadiationDosimetryInference\nsample = {'daily_absorbed_dose_mgy': [0.4, 0.42, 0.39, 2.5, 0.41], 'unit': 'mGy/day'}\nprint(RadiationDosimetryInference().predict(sample))")
        ]
    )

if __name__ == "__main__":
    generate_all_notebooks()
