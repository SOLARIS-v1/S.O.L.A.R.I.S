# SOLARIS Dataset Attributions & Licensing Provenance

This document lists the research and reference datasets integrated or evaluated within the SOLARIS codebase. In compliance with strict open scientific provenance rules, license locations are cited directly from the repository when present; unknown license files are recorded as `TODO` rather than inventing license text.

---

### 1. Autonomic Aging (Cardiovascular ECG)
- **Dataset Name**: Autonomic Aging: A dataset to quantify changes of cardiovascular autonomic regulation during healthy aging
- **Source**: PhysioNet (Goldberger AL, et al.)
- **Repository License Path**: `solaris_ml/datasets/raw/autonomic_aging/LICENSE.txt` (TODO if not distributed locally)
- **Scientific Role**: Baseline resting ECG RR-interval and HRV reference distributions.

---

### 2. MMASH (Multilevel Monitoring of Activity and Sleep in Healthy people)
- **Dataset Name**: MMASH: Multilevel Monitoring of Activity and Sleep in Healthy People
- **Source**: PhysioNet / Rossi et al.
- **Repository License Path**: `solaris_ml/datasets/raw/mmash/LICENSE` (TODO if not distributed locally)
- **Scientific Role**: Actigraphy and continuous physiological tracking for descriptive sleep analytics. Quarantined predictive sleep regression is disabled.

---

### 3. NASA OSDR OSD-570 (Inspiration4 Transcriptomics)
- **Dataset Name**: NASA Open Science Data Repository (OSDR) OSD-570: Single-cell transcriptomics and immune profiling
- **Source**: NASA Open Science Data Repository (https://osdr.nasa.gov/)
- **Repository License Path**: `solaris_ml/datasets/raw/osd_570/LICENSE` (TODO: NASA Open Data Policy / Public Domain)
- **Scientific Role**: Exploratory immune repertoire PCA projection. Not a disease diagnosis.

---

### 4. NASA OSDR OSD-571 (Inspiration4 Proteomics)
- **Dataset Name**: NASA Open Science Data Repository (OSDR) OSD-571: Plasma Proteomics
- **Source**: NASA Open Science Data Repository (https://osdr.nasa.gov/)
- **Repository License Path**: `solaris_ml/datasets/raw/osd_571/LICENSE` (TODO: NASA Open Data Policy / Public Domain)
- **Scientific Role**: Molecular and plasma proteomics research exploration. Predictive classifiers quarantined.

---

### 5. SOMA Scan Proteomics
- **Dataset Name**: SomaLogic SOMAscan Proteomic Profiling
- **Source**: SomaLogic / NASA GeneLab & OSDR research cohorts
- **Repository License Path**: TODO
- **Scientific Role**: Research reference exploration only.
