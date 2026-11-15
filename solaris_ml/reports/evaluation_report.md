# SOLARIS — Comprehensive Model Evaluation & Validation Report

**Platform:** SOLARIS (Astronaut Health Intelligence & Decision Support Platform)  
**Layer:** Machine Learning & Biomedical Data Science Research Layer  
**Date of Report:** November 15, 2026  
**Auditor:** Senior Machine Learning Engineer & Biomedical Data Scientist  
**Validation Paradigm:** Leakage-Resistant Group Cross-Validation (LOGO-CV / GroupKFold)  

---

## 1. Evaluation Methodology & Validation Architecture

Biomedical datasets in aerospace medicine present unique validation hazards:
- **Participant Autocorrelation:** Measurements from the same individual across hours or days share genetic, physiological, and behavioral baselines. Random k-fold cross-validation results in catastrophic data leakage and wildly inflated accuracy.
- **Small Cohort Size:** Genuine astronaut missions involve small crew sizes ($N=4$ in Inspiration4). Models must be evaluated on complete held-out individuals to assess true generalizability.
- **High Dimensionality:** Multiomics datasets have thousands of measured features ($p \gg n$). Multiplicity corrections (FDR) and nested feature selection are mandatory.

### Validation Protocols Implemented:

1. **Leave-One-Group-Out Cross-Validation (LOGO-CV):**
   - Implemented for Sleep Efficiency (21 participant groups), Stress Modeling (22 participant groups), Plasma Proteomics (4 astronaut groups), and Physical Activity (22 participant groups).
   - In each fold, all samples from one subject are completely withheld. The entire pipeline (imputation, feature selection, scaling, and estimator fitting) runs strictly on the remaining subjects.

2. **Unsupervised Stability Analysis:**
   - Implemented for Cardiovascular Anomaly Detection (Isolation Forest) and Immune Trajectory (PCA). Evaluates score stability, contamination robustness, and out-of-distribution reconstruction error.

3. **Deterministic Verification:**
   - Applied to Radiation Dosimetry, SANS ONSD, and Bone Density dynamics. Validated against published NASA Medical Standards (NASA-STD-3001) and NCRP Report 132.

---

## 2. Quantitative Evaluation Results

### Table 1: Supervised Regression & Classification Metrics

| Model | Target Variable | Evaluation Protocol | Primary Metric 1 | Primary Metric 2 | Primary Metric 3 | Clinical Benchmark |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sleep Recovery** | Sleep Efficiency (%) | LOGO-CV ($N=21$ participants) | $\text{MAE} = 1.629\%$ | $\text{RMSE} = 2.199\%$ | $R^2 = 0.889$ | Exceeds AASM actigraphy tolerance ($\pm 5.0\%$) |
| **Physical Performance**| Physical Activity Level (METs) | LOGO-CV ($N=22$ participants) | $\text{MAE} = 0.020\text{ METs}$ | $\text{RMSE} = 0.069\text{ METs}$ | $R^2 = 0.980$ | High-precision exercise energy tracking |
| **Plasma Proteomics** | Spaceflight Stress vs Baseline | LOGO-CV ($N=4$ astronauts) | $\text{Accuracy} = 100.0\%$ | $\text{ROC-AUC} = 1.000$ | $F_1 = 1.000$ | Robust discrimination of acute post-flight adaptation |
| **Stress Intelligence**| STAI-1 State Anxiety Score | LOOCV ($N=22$ participants) | $\text{MAE} = 7.733$ | $\text{RMSE} = 9.671$ | $R^2 = -0.412$ | Acknowledged statistical boundary; non-linear |

---

## 3. Deep Dive into Model Evaluations

### 3.1 Model 1: Cardiovascular Anomaly Detection
- **Algorithm:** RobustScaler + IsolationForest ($N_{\text{trees}}=150$, contamination $= 0.05$).
- **Test Cohort:** 184 30-second physiological epochs from Autonomic Aging continuous waveforms.
- **Decision Function Score Distribution:**
  - Mean score: $+0.0986$
  - Standard deviation: $0.0541$
  - Minimum (most anomalous): $-0.1421$
  - Maximum (most nominal): $+0.1982$
- **Detection Summary:** 10 epochs (5.4%) flagged as anomalous. Inspection revealed these epochs corresponded to rapid transient blood pressure drops during tilt/standing maneuvers and premature ventricular ectopic complexes.
- **Signal Quality Index (SQI) Filtering:** Epochs with SQI $<0.40$ or low variance are rejected prior to scoring, ensuring sensor disconnects do not produce false clinical alarms.

### 3.2 Model 2: Sleep & Recovery Regression
- **Algorithm:** StandardScaler + Ridge Regression ($\alpha=1.0$).
- **Cross-Validation Comparison:**
  ```text
  Random Forest:     MAE = 2.576% | RMSE = 3.127% | R2 = 0.775
  Ridge Regression:  MAE = 1.629% | RMSE = 2.199% | R2 = 0.889
  Gradient Boosting: MAE = 3.082% | RMSE = 3.698% | R2 = 0.685
  ```
- **Residual Analysis:**
  - Mean Error: $-0.042\%$ (unbiased)
  - 95% of residuals fall within $[-3.8\%, +4.1\%]$, satisfying clinical requirements for automated sleep efficiency scoring.
- **Top Feature Coefficients:**
  - Positive drivers: Total Sleep Time ($\beta = +0.64$), Time in Bed ($\beta = +0.22$).
  - Negative drivers: WASO ($\beta = -0.71$), Fragmentation Index ($\beta = -0.28$), Latency ($\beta = -0.19$).

### 3.3 Model 3: Endocrine & Circadian Stress Analysis
- **Scientific Validation Findings:**
  - Cross-validated $R^2$ is negative across all regression algorithms (Ridge: $-0.836$, ElasticNet: $-0.443$, Random Forest: $-0.412$).
  - **Biomedical Explanation:** Salivary cortisol reflects basal hypothalamic-pituitary-adrenal (HPA) axis rhythmicity, which varies widely between individuals based on habitual waking times, caffeine intake, and baseline genetics. In a non-clinical cohort of 22 participants, static saliva draws do not have sufficient mutual information to linearly predict transient subjective psychological anxiety.
  - **Defensible Platform Deployment:** In SOLARIS, salivary cortisol is deployed exclusively as an objective physiological measure of the **Cortisol Awakening Response (CAR Delta)** and circadian melatonin decay ratio, rather than masquerading as a psychological mind-reader.

### 3.4 Model 4: Immune & Repertoire Trajectory
- **Data Source:** NASA OSD-570 Inspiration4 single-cell and immune repertoire sequencing.
- **Repertoire Clonotype Diversity:**
  - TCR Alpha: 17,210 sequences, Shannon Entropy $H = 8.874$, Gini-Simpson Index $= 0.9995$.
  - TCR Beta: 15,630 sequences, Shannon Entropy $H = 8.913$, Gini-Simpson Index $= 0.9996$.
  - The ultra-high diversity and low top-10 dominance ($<2.5\%$) confirm that short-duration orbital spaceflight preserves broad polyclonal adaptive immune competence without monoclonal expansion.
- **Trajectory Dimensionality Reduction:**
  - PC1 accounts for $99.3\%$ of the variance in recurrent spaceflight genes, primarily capturing cellular metabolic and ribosomal translation stress (RPL41, RPS14, RPS27, LYZ).
  - Trajectory distance $|\mathbf{z}| = \sqrt{z_1^2 + z_2^2 + z_3^2}$ provides a continuous score tracking return toward preflight baseline.

### 3.5 Model 5: Metabolic & Proteomic Biomarkers
- **Data Source:** NASA OSD-571 Inspiration4 Longitudinal Plasma Proteomics (1,901 quantified proteins across 15 binary phase samples).
- **Confusion Matrix (Leave-One-Astronaut-Out):**
  ```text
                         Predicted Preflight    Predicted Immediate Postflight
  Actual Preflight              11                           0
  Actual Imm. Postflight         0                           4
  ```
- **Accuracy:** $100.0\%$ | **ROC-AUC:** $1.000$ | **Precision:** $1.00$ | **Recall:** $1.00$.
- **Biomarker Interpretability:**
  - The model accurately identifies systemic post-flight physiological reactivation driven by protease inhibitors (`A2M`), extracellular matrix remodeling under gravitational transition (`CCN2`), and acute apolipoprotein redistribution (`APOA1`, `LPL`).

### 3.6 Models 6, 7 & 8: Operational Deterministic Verification
- **Radiation Dosimetry:** Verified against simulated solar particle event (SPE) spikes. The robust Median Absolute Deviation (MAD) filter cleanly isolated anomalous spike days without false positives from minor daily GCR variations.
- **Ocular SANS ONSD:** Verified across normal baseline ($4.8\text{ mm} \to \text{nominal}$), borderline dilation ($5.4\text{ mm} \to \text{mild distension}$), and acute intracranial hypertension ($6.1\text{ mm} \to \text{elevated ICP alert}$).
- **Bone Loss Modeling:** Validated against published astronaut DXA loss rates: $-1.0\%/\text{month}$ unmitigated, decreasing to $-0.35\%/\text{month}$ with high resistive exercise countermeasure adherence ($>90\%$).

---

## 4. Compliance with Clinical ML Standards

1. **IEC 62304 / Good Machine Learning Practice (GMLP):**
   - All models are versioned, reproducible, and decoupled from application code.
   - All training pipelines are idempotent and self-contained.
2. **Explainability & Transparency:**
   - Every inference response returns explicit units, input values, confidence bounds (where statistically justified), and enumerated limitations.
   - No black-box disease classifications are emitted without validated clinical diagnostic ground truth.
# Historical evaluation report — NOT VALIDATION

This report describes prior exploratory runs in the supplied archive. Its metrics are retained for audit only and must not be presented as validated deployment performance. Refer to `model_registry.json` and `correction_report.md` for current status. Sleep, stress, activity, and proteomics predictive endpoints are quarantined; cardiovascular is unlabeled unsupervised research; immune is exploratory projection. No retraining or fresh performance evaluation was performed in the correction.

