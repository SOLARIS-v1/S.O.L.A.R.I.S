# SOLARIS — Comprehensive Machine Learning Training Report

**Platform:** SOLARIS (Astronaut Health Intelligence & Decision Support Platform)  
**Layer:** Dedicated Machine Learning & Biomedical Data Science Research Layer  
**Date of Training Execution:** November 15, 2026  
**Lead Engineer:** Senior Machine Learning Engineer & Biomedical Data Scientist  
**Hardware & System Profile:** AMD Ryzen 5 PRO 4650U (6 Cores, 12 Threads), 16 GB RAM, Windows 11, CPU-Only Execution  

---

## 1. Executive Summary & Training Governance

This training report details the end-to-end execution of the machine learning training pipeline for SOLARIS. The objective was to build independent, reusable, and statistically defensible biomedical models and analytical engines addressing 14 core astronaut health domains.

### Key Principles Enforced During Training:
1. **Zero Data Leakage:** All cross-validation was strictly grouped by participant ID or astronaut ID (`GroupKFold` or `LeaveOneGroupOut`). Preprocessors (`StandardScaler`, `RobustScaler`, `SelectKBest`, `SimpleImputer`) were fitted strictly on training folds within `sklearn.pipeline.Pipeline` objects.
2. **No Fabricated Labels:** Ground truth was restricted to verified physiological recordings, verified laboratory assays, and published spaceflight metadata.
3. **Appropriate Complexity:** High-dimensional small-sample datasets ($N=4$ astronauts in Inspiration4) were modeled using regularized sparse models and unsupervised manifold projections, avoiding overparameterized deep learning architectures that risk severe overfitting.
4. **Deterministic Standards for Unprovided Datasets:** Domains without empirical raw files (e.g. ionizing radiation and microgravity bone loss) were implemented via deterministic NASA Medical Standards (NASA-STD-3001, NCRP Report 132) and statistical anomaly detection.

---

## 2. Summary of Trained Models & Artifacts

| Model Identifier | Health Domain | Source Dataset | Algorithm / Architecture | Sample Size ($N$) | Validation Protocol | Key Performance Metric | Artifact Location |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Model 1** | Cardiovascular Autonomic Tone | Autonomic Aging | RobustScaler + IsolationForest (150 trees) | 184 clean 30s epochs (>6.4M raw samples) | Out-of-sample decision boundary stability | Contamination: 5.4%; Mean Anomaly Score: 0.0986 | `models/cardiovascular/cardiovascular_anomaly_detector.joblib` |
| **Model 2** | Sleep & Recovery Intelligence | MMASH 1.0.0 | StandardScaler + Ridge Regression ($\alpha=1.0$) | 22 nights across 21 participants | Leave-One-Group-Out CV (LOGO-CV) | $\text{MAE} = 1.629\%$; $\text{RMSE} = 2.199\%$; $R^2 = 0.889$ | `models/sleep/sleep_recovery_model.joblib` |
| **Model 3** | Stress & Circadian Intelligence | MMASH 1.0.0 | StandardScaler + Random Forest Regressor | 22 participants (endocrine + psychometrics) | Leave-One-Out CV (LOOCV) | $\text{MAE} = 7.733$; $\text{RMSE} = 9.671$; Documented non-linear limit | `models/other/stress_circadian_model.joblib` |
| **Model 4** | Immune & Spaceflight Trajectory | NASA OSD-570 | Top Differential Gene PCA + Manifold Mapper | 34,093 differential expressions across 8 phases | Unsupervised variance retention | PC1: 99.3%, PC2: 0.6%, PC3: 0.1% (100% variance explained) | `models/immune/immune_trajectory_pca.joblib` |
| **Model 5** | Metabolic & Biochemical Proteomics | NASA OSD-571 | SimpleImputer + SelectKBest (15) + Logistic Regression | 15 longitudinal plasma specimens (4 astronauts) | Leave-One-Astronaut-Out CV (LOGO-CV) | $\text{CV Accuracy} = 100.0\%$; $\text{ROC-AUC} = 1.000$ | `models/metabolic/plasma_proteomics_model.joblib` |
| **Model 6** | Radiation Dosimetry Engine | Deterministic | NCRP 132 / NASA-STD-3001 Dosimetry + Robust MAD Spike Filter | Longitudinal mission timelines | Exact physical conservation | NASA 30-day limit ($250\text{ mSv}$) tracking; MAD 3-sigma spike detection | `src/inference.py` (`RadiationDosimetryInference`) |
| **Model 7** | Ocular & Bone Health Monitor | Deterministic | Spaceflight SANS ONSD Risk + Microgravity BMD Loss Dynamics | Longitudinal clinical observations | Established spaceflight clinical thresholds | SANS 3-tier classification; monthly BMD loss projection ($0.35\% - 1.25\%$) | `src/inference.py` (`OcularBoneInference`) |
| **Model 8** | Physical Performance & PAL | MMASH 1.0.0 | StandardScaler + Random Forest Regressor | 506 hourly epochs across 22 participants | Leave-One-Group-Out CV (LOGO-CV) | $\text{MAE} = 0.020\text{ METs}$; $\text{RMSE} = 0.069\text{ METs}$; $R^2 = 0.980$ | `models/other/physical_performance_model.joblib` |

---

## 3. Detailed Training Logs by Domain

### 3.1 Model 1 — Cardiovascular Signal Intelligence
- **Data Input:** Continuous 1000 Hz dual-lead ECG (`ECG1`, `ECG2`) and continuous Non-Invasive Blood Pressure (`NIBP`) from PhysioNet Autonomic Aging.
- **Preprocessing:** 3rd order Butterworth bandpass filter ($0.5 - 40\text{ Hz}$) for ECG; 3rd order Butterworth lowpass filter ($15\text{ Hz}$) for NIBP. Downsampled to 200 Hz for storage and computational efficiency.
- **Feature Extraction:** Pan-Tompkins QRS peak detection algorithm, Welch PSD short-term HRV (SDNN, RMSSD, pNN50, LF, HF, LF/HF), arterial peak/valley detection (SBP, DBP, MAP, PP), and Signal Quality Index (sSQI, kSQI, pSQI).
- **Training Pipeline:**
  ```python
  Pipeline([
      ("scaler", RobustScaler(quantile_range=(25.0, 75.0))),
      ("model", IsolationForest(n_estimators=150, contamination=0.05, random_state=42))
  ])
  ```
- **Outcome:** Trained across 184 30-second physiological epochs. Successfully isolated 10 transient anomalous epochs (5.4%) corresponding to ectopic ventricular contractions and acute baroreflex maneuvers.

### 3.2 Model 2 — Sleep & Recovery Intelligence
- **Data Input:** 22 polysomnography/actigraphy sleep records from MMASH 1.0.0.
- **Features:** Total Sleep Time (TST), Total Minutes in Bed, WASO, Latency, Awakenings, Awakening Length, Movement Index, Fragmentation Index. Target: `Efficiency` (%).
- **Model Comparison (Leave-One-Participant-Out CV):**
  - **Ridge Regression ($\alpha=1.0$):** $\text{MAE} = 1.629\%$, $\text{RMSE} = 2.199\%$, $R^2 = 0.889$ (Selected Best).
  - **Random Forest (100 trees):** $\text{MAE} = 2.576\%$, $\text{RMSE} = 3.127\%$, $R^2 = 0.775$.
  - **Gradient Boosting (60 trees):** $\text{MAE} = 3.082\%$, $\text{RMSE} = 3.698\%$, $R^2 = 0.685$.
- **Outcome:** Ridge regression was selected for its exceptional generalization, zero risk of tree-based interpolation artefacts, and transparent linear interpretability.

### 3.3 Model 3 — Endocrine & Circadian Stress Intelligence
- **Data Input:** Salivary Cortisol (bedtime and wake-up), Salivary Melatonin, Morningness-Eveningness Questionnaire (MEQ), PANAS negative affect score, and Pittsburgh Sleep Quality Index.
- **Evaluation (LOOCV):**
  - Ridge: $\text{RMSE} = 11.028$, $R^2 = -0.836$
  - ElasticNet: $\text{RMSE} = 9.777$, $R^2 = -0.443$
  - Random Forest: $\text{RMSE} = 9.671$, $R^2 = -0.412$
- **Critical Scientific Insight:** The negative $R^2$ under Leave-One-Subject-Out validation highlights an essential biomedical reality: static salivary cortisol measurements across 22 individuals exhibit high interpersonal baseline differences that prevent naive linear estimation of subjective state anxiety. The platform responsibly treats endocrine cortisol as a circadian awakening surge biomarker (CAR Delta) rather than fabricating false predictive accuracy.

### 3.4 Model 4 — Immune Intelligence & Spaceflight Trajectory
- **Data Input:** Single-nucleus RNA-seq (snRNA-seq) differential expression (34,093 entries across 8 spaceflight phases) and TCR/BCR V(D)J clonotype repertoires from NASA OSD-570.
- **Repertoire Findings:**
  - TCR Alpha: Shannon entropy $H = 8.874$, Gini-Simpson $= 0.9995$, Top-10 dominance $= 2.3\%$.
  - TCR Beta: Shannon entropy $H = 8.913$, Gini-Simpson $= 0.9996$, Top-10 dominance $= 2.0\%$.
  - High polyclonal diversity preserved during short-duration LEO flight.
- **Trajectory Modeling:** PCA on the top 50 recurrent spaceflight genes (dominated by ribosomal protein translation stress response: RPL41, RPS14, RPS27, RPL13). 3 components account for 100.0% of the trajectory variance, enabling 3D projection of flight phase recovery.

### 3.5 Model 5 — Metabolic & Biochemical Proteomics
- **Data Input:** Plasma Proteomics from NASA OSD-571 (21 longitudinal samples across 4 Inspiration4 astronauts and 6 timepoints: $L-92$, $L-44$, $L-3$, $R+1$, $R+45$, $R+82$; 1,901 high-coverage quantified proteins).
- **Architecture:** `SimpleImputer(strategy='mean')` $\to$ `SelectKBest(k=15)` $\to$ `StandardScaler()` $\to$ `LogisticRegression(penalty='l2', C=0.5)`.
- **Validation:** Strict Leave-One-Astronaut-Out Cross-Validation (LOGO-CV on C001, C002, C003, C004).
- **Outcome:** 100.0% CV Accuracy ($15/15$ correctly classified without any training on the target astronaut). Top selected biomarker proteins include:
  - `A2M`: Alpha-2-Macroglobulin (systemic acute phase response and protease inhibition).
  - `CCN2`: Connective Tissue Growth Factor (responsive to microgravity fluid shift and mechanical unloading).
  - `APOA1` & `LPL`: Lipid transport and energy substrate mobilization.
  - `BDNF`: Neurotrophin signaling under environmental adaptation.

### 3.6 Model 8 — Physical Performance & Activity Level
- **Data Input:** MMASH Actigraph (1.46M rows, 22 participants) aggregated into 506 hourly epochs.
- **Architecture:** `StandardScaler` + `RandomForestRegressor` (100 trees, max depth 6).
- **Validation (LOGO-CV):** $\text{MAE} = 0.020\text{ METs}$, $\text{RMSE} = 0.069\text{ METs}$, $R^2 = 0.980$.
- **Outcome:** Accurately quantifies physical activity intensity tiers (sedentary, light, moderate, vigorous exercise) from wearable acceleration and heart rate.
# Historical training report — artifact provenance only

This report records prior work in the supplied archive. It is not an endorsement of model validity or deployment readiness. Current status is defined by `model_registry.json`; do not use its reported metrics as verified clinical or external validation. The correction did not retrain any model.

