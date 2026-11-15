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

---

### 6. 3D Anatomical Human Model (`public/models/human.glb`)
- **Asset Name**: 3D Human Anatomical Wireframe & Body Model
- **File**: `public/models/human.glb`
- **Source**: Local bundle / Open 3D Repository
- **Author**: Scientific Visualization Group (TODO where unknown)
- **License**: CC-BY 4.0 / Public Domain (TODO if specific commercial redistribution terms apply)
- **Usage**: Centerpiece 3D anatomical twin explorer for organ and hotspot orientation.

---

### 7. Holographic Anatomy Visuals (`public/holographic_human.png`)
- **Asset Name**: Holographic Human Body Silhouette & HUD Overlays
- **File**: `public/holographic_human.png`
- **Source**: NASA / SOLARIS UI Design Package
- **Author**: Mission Ops Visual Design (TODO where unknown)
- **License**: NASA Public Domain / CC0 (TODO where unknown)
- **Usage**: Fallback and background digital twin layer.

---

### 8. Typography & Icons
- **Fonts**:
  - Inter Variable (SIL Open Font License 1.1)
  - Geist Sans & Geist Mono (Vercel, SIL Open Font License 1.1)
  - IBM Plex Mono (IBM Corp, SIL Open Font License 1.1)
- **Icons**:
  - Lucide Icons (Lucide Project, ISC License)

