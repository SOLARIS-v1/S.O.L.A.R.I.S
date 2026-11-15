import os
import json
import glob
import pandas as pd
import numpy as np
import openpyxl
import wfdb

def audit_all():
    print("Starting Comprehensive Dataset Audit for SOLARIS...")
    base_dir = os.path.abspath(".")
    raw_dir = os.path.join(base_dir, "solaris_ml", "datasets", "raw")
    reports_dir = os.path.join(base_dir, "solaris_ml", "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    registry = {
        "audit_version": "1.0.0",
        "timestamp": "2026-11-15T02:25:00Z",
        "datasets": {}
    }
    
    # -------------------------------------------------------------
    # 1. Dataset A: MMASH 1.0.0
    # -------------------------------------------------------------
    mmash_base = os.path.join(raw_dir, "mmash", "multilevel-monitoring-of-activity-and-sleep-in-healthy-people-1.0.0", "MMASH_extracted", "DataPaper")
    if os.path.exists(mmash_base):
        users = sorted([d for d in os.listdir(mmash_base) if os.path.isdir(os.path.join(mmash_base, d))])
        print(f"Auditing MMASH: {len(users)} participants found...")
        
        tables = ["user_info", "sleep", "RR", "questionnaire", "Activity", "Actigraph", "saliva"]
        mmash_stats = {
            "participant_count": len(users),
            "participants": users,
            "tables": {}
        }
        
        for table in tables:
            total_rows = 0
            cols_set = set()
            col_types = {}
            missing_counts = {}
            duplicate_rows = 0
            
            for u in users:
                csv_path = os.path.join(mmash_base, u, f"{table}.csv")
                if os.path.exists(csv_path):
                    df = pd.read_csv(csv_path)
                    total_rows += len(df)
                    duplicate_rows += df.duplicated().sum()
                    cols_set.update(df.columns.tolist())
                    for c in df.columns:
                        if c not in col_types:
                            col_types[c] = str(df[c].dtype)
                        missing_counts[c] = missing_counts.get(c, 0) + int(df[c].isna().sum())
                        
            mmash_stats["tables"][table] = {
                "total_rows": total_rows,
                "columns": sorted(list(cols_set)),
                "dtypes": col_types,
                "missing_values": missing_counts,
                "missing_percentages": {c: round((missing_counts[c] / max(1, total_rows)) * 100, 2) for c in missing_counts},
                "duplicate_rows": int(duplicate_rows)
            }
            print(f"  MMASH {table}: {total_rows} total rows, {len(cols_set)} columns, {duplicate_rows} duplicates.")
            
        registry["datasets"]["Dataset_A_MMASH"] = {
            "name": "MMASH 1.0.0 (Multilevel Monitoring of Activity and Sleep in Healthy People)",
            "source": "PhysioNet / University of Florence",
            "license": "PhysioNet Credentialed Data Use Agreement / Open Access",
            "format": "CSV per user directory",
            "population": "22 young healthy adult volunteers (20 male, 2 female, mean age ~27.3)",
            "sampling_frequency": {
                "Actigraph": "1 Hz (epoch=1s)",
                "RR": "Event-based (beat-to-beat ECG inter-beat interval, ms)",
                "Activity": "Event intervals",
                "Sleep": "Polysomnography/Actigraphy night summary",
                "Saliva": "Morning awakening and evening before sleep",
                "Questionnaire": "Single intake / scheduled time points"
            },
            "stats": mmash_stats,
            "target_labels": {
                "sleep_efficiency": "Available in sleep.csv (continuous 0-100%)",
                "daily_stress": "Available in questionnaire.csv (Likert scale)",
                "anxiety_stai": "STAI-1 (state) and STAI-2 (trait) scores",
                "activity_type": "Categorical code in Activity.csv"
            },
            "leakage_risks": "Repeated continuous measurements per user. Must strictly split by participant (Leave-One-Group-Out or GroupKFold).",
            "suitable_tasks": [
                "HRV feature extraction and circadian HRV profiling",
                "Sleep efficiency and fragmentation analysis",
                "Salivary cortisol and melatonin circadian modeling",
                "Stress and anxiety association with physiological metrics",
                "Physical activity level estimation and anomaly detection"
            ]
        }
    
    # -------------------------------------------------------------
    # 2. Dataset B: Autonomic Aging
    # -------------------------------------------------------------
    aa_dir = os.path.join(raw_dir, "autonomic_aging")
    if os.path.exists(aa_dir):
        print("Auditing Autonomic Aging WFDB dataset...")
        records = ["0001", "0002", "0003", "0004"]
        aa_stats = {
            "records": {},
            "missing_headers": ["0005"]
        }
        for rec in records:
            rec_path = os.path.join(aa_dir, rec)
            try:
                record = wfdb.rdrecord(rec_path)
                sig = record.p_signal
                sig_len = record.sig_len
                fs = record.fs
                duration_sec = sig_len / fs
                
                # Check NaNs
                nan_counts = {record.sig_name[i]: int(np.isnan(sig[:, i]).sum()) for i in range(record.n_sig)}
                
                aa_stats["records"][rec] = {
                    "sampling_frequency": fs,
                    "signal_length_samples": sig_len,
                    "duration_seconds": duration_sec,
                    "duration_minutes": round(duration_sec / 60, 2),
                    "channels": record.sig_name,
                    "units": record.units,
                    "missing_values": nan_counts,
                    "signal_ranges": {
                        record.sig_name[i]: {
                            "min": float(np.nanmin(sig[:, i])),
                            "max": float(np.nanmax(sig[:, i])),
                            "mean": float(np.nanmean(sig[:, i])),
                            "std": float(np.nanstd(sig[:, i]))
                        } for i in range(record.n_sig)
                    }
                }
                print(f"  Autonomic Aging record {rec}: fs={fs}Hz, len={sig_len} ({round(duration_sec/60, 1)} min), channels={record.sig_name}")
            except Exception as e:
                print(f"  Error reading {rec}: {e}")
                
        # Record 0005 raw dat check
        dat0005 = os.path.join(aa_dir, "0005.dat")
        if os.path.exists(dat0005):
            sz = os.path.getsize(dat0005)
            samples = sz // 6
            aa_stats["record_0005_dat_only"] = {
                "file_size_bytes": sz,
                "estimated_samples_3chan_16bit": samples,
                "estimated_duration_at_1000hz_min": round((samples / 1000) / 60, 2),
                "status": "Header .hea missing from source archive; raw binary preserved."
            }
            
        registry["datasets"]["Dataset_B_Autonomic_Aging"] = {
            "name": "Autonomic Aging Physiological Waveform Dataset",
            "source": "PhysioNet (Autonomic Aging Database)",
            "license": "PhysioNet Open Access",
            "format": "WFDB (format 16, 16-bit binary .dat + ASCII .hea)",
            "population": "Human subjects under autonomic cardiovascular reflex testing",
            "sampling_frequency": "1000 Hz",
            "channels": ["ECG1 (mV)", "ECG2 (mV)", "NIBP (mmHg continuous)"],
            "stats": aa_stats,
            "target_labels": "None provided (unsupervised physiological waveform). Reference R-peaks must be detected using verified Pan-Tompkins / Hamilton algorithms.",
            "leakage_risks": "Temporal autocorrelation across continuous waveform windows. Never randomly split time windows.",
            "suitable_tasks": [
                "High-resolution ECG R-peak detection",
                "Continuous RR interval and HRV extraction",
                "Continuous blood pressure waveform systolic/diastolic/MAP calculation",
                "Cardiovascular autonomic feature engineering and signal quality index (SQI)"
            ]
        }

    # -------------------------------------------------------------
    # 3. Dataset C: NASA OSD-570 / GLDS-562
    # -------------------------------------------------------------
    osd570_dir = os.path.join(raw_dir, "osd_570")
    if os.path.exists(osd570_dir):
        print("Auditing NASA OSD-570 / GLDS-562...")
        vdj_path = os.path.join(osd570_dir, "GLDS-562_scRNA-Seq_VDJ_Results.xlsx")
        snrna_path = os.path.join(osd570_dir, "GLDS-562_snRNA-Seq_PBMC_Gene_Expression_snRNA-seq_Processed_Data.xlsx")
        snatac_path = os.path.join(osd570_dir, "GLDS-562_snATAC-Seq_PBMC_Chromatin_Accessibility_snATAC-seq_Processed_Data.xlsx")
        
        osd570_stats = {}
        for p, label in [(vdj_path, "VDJ_Results"), (snrna_path, "snRNA_Expression"), (snatac_path, "snATAC_Chromatin")]:
            if os.path.exists(p):
                wb = openpyxl.load_workbook(p, read_only=True)
                sheets_info = {}
                for s in wb.sheetnames:
                    ws = wb[s]
                    row_count = 0
                    header = None
                    for r_idx, r in enumerate(ws.iter_rows(values_only=True)):
                        row_count += 1
                        if r_idx == 3 or r_idx == 7:  # candidate header row
                            if header is None and any(c is not None for c in r):
                                header = [str(c) for c in r if c is not None]
                    sheets_info[s] = {"row_count": row_count, "sample_columns": header}
                wb.close()
                osd570_stats[label] = {
                    "file": os.path.basename(p),
                    "sheets": sheets_info
                }
                print(f"  OSD-570 {label}: {len(sheets_info)} sheets audited.")
                
        registry["datasets"]["Dataset_C_OSD_570"] = {
            "name": "NASA OSD-570 / GLDS-562 (Inspiration4 PBMC Single-Cell Multiomics)",
            "source": "NASA Open Science Data Repository (OSDR) / SOMA Package",
            "license": "NASA Open Data / Public Domain",
            "format": "Excel workbooks + MultiQC reports + ISA-Tab metadata",
            "population": "4 Inspiration4 civilian astronauts (C001, C002, C003, C004), 3-day low-Earth orbit mission",
            "sampling_frequency": "Longitudinal episodic biospecimen collection (Pre-flight L-92, L-44, L-3; Post-flight R+1, R+45, R+82)",
            "assays": [
                "Single-nucleus RNA-seq (snRNA-seq) PBMC gene expression",
                "Single-nucleus ATAC-seq (snATAC-seq) chromatin accessibility",
                "Single-cell TCR and BCR V(D)J immune receptor sequencing"
            ],
            "stats": osd570_stats,
            "target_labels": "Mission phases (Pre-flight vs Immediate Post-flight R+1 vs Recovery Post-flight R+45/R+82)",
            "leakage_risks": "Extremely small participant cohort (N=4). High risk of participant-specific gene expression bias. Cannot train supervised disease classifiers. Strict Leave-One-Astronaut-Out or unsupervised/differential expression paradigms only.",
            "suitable_tasks": [
                "Differential gene expression characterization across spaceflight phases",
                "Immune-cell type and clonotype diversity Shannon/Simpson entropy profiling",
                "Molecular pathway enrichment (immune activation, DNA damage, mitochondrial stress)",
                "Pre-flight vs post-flight molecular anomaly identification"
            ]
        }

    # -------------------------------------------------------------
    # 4. Dataset D: NASA OSD-571 / GLDS-563
    # -------------------------------------------------------------
    osd571_dir = os.path.join(raw_dir, "osd_571")
    if os.path.exists(osd571_dir):
        print("Auditing NASA OSD-571 / GLDS-563...")
        meta_plasma_p = os.path.join(osd571_dir, "GLDS-563_proteomics_plasma_metadata_all_samples_collapsed.csv")
        meta_evp_p = os.path.join(osd571_dir, "GLDS-563_proteomics_EVPs_sample_metadata.csv")
        plasma_tsv_p = os.path.join(osd571_dir, "GLDS-563_proteomics_plasma_proteomics_preprocessed_data.tsv")
        anp_p = os.path.join(osd571_dir, "GLDS-563_metabolomics_metabolomics_ANPPOS-NEG_preprocessed_data.xlsx")
        rpp_p = os.path.join(osd571_dir, "GLDS-563_metabolomics_metabolomics_RPPOS-NEG_preprocessed_data.xlsx")
        
        osd571_stats = {}
        if os.path.exists(meta_plasma_p):
            df_m = pd.read_csv(meta_plasma_p)
            osd571_stats["plasma_proteomics_metadata"] = {
                "rows": len(df_m),
                "columns": list(df_m.columns),
                "astronauts": df_m["Astronaut"].unique().tolist(),
                "timepoints": df_m["Timepoint"].unique().tolist()
            }
        if os.path.exists(anp_p):
            df_anp = pd.read_excel(anp_p)
            osd571_stats["metabolomics_ANP"] = {
                "rows": len(df_anp),
                "columns": list(df_anp.columns),
                "superpathways": df_anp["SuperPathway"].value_counts().to_dict() if "SuperPathway" in df_anp else {}
            }
        if os.path.exists(rpp_p):
            df_rpp = pd.read_excel(rpp_p)
            osd571_stats["metabolomics_RPP"] = {
                "rows": len(df_rpp),
                "columns": list(df_rpp.columns)
            }
            
        registry["datasets"]["Dataset_D_OSD_571"] = {
            "name": "NASA OSD-571 / GLDS-563 (Inspiration4 Plasma Proteomics and Metabolomics)",
            "source": "NASA OSDR / SOMA Package",
            "license": "NASA Open Data / Public Domain",
            "format": "TSV, CSV, Excel workbooks, MultiQC cfRNA/WGS reports",
            "population": "4 Inspiration4 civilian astronauts (C001, C002, C003, C004) + Ground Controls",
            "sampling_frequency": "Episodic blood draws (Pre-flight, Immediate Post-flight R+1, Recovery R+45, R+82)",
            "assays": [
                "Mass spectrometry plasma proteomics (timsTOF Pro / Q Exactive)",
                "Extracellular vesicle proteomics (EVP)",
                "Untargeted and targeted metabolomics (RP-POS/NEG, ANP-POS/NEG)",
                "Cell-free RNA (cfRNA-seq) and cell-free DNA (cfDNA / WGS)"
            ],
            "stats": osd571_stats,
            "target_labels": "Pre-flight vs Immediate Post-flight (Sept_Post / R+1) vs Long-term Post-flight",
            "leakage_risks": "High dimensional p >> n (thousands of proteins/metabolites, 21-29 total biospecimens). High risk of false discoveries. Must use False Discovery Rate (FDR / Benjamini-Hochberg) correction, cross-validation strictly grouped by Astronaut.",
            "suitable_tasks": [
                "Differential protein and metabolite abundance across mission phases",
                "Amino acid and lipidomic dysregulation analysis",
                "Biochemical pathway mapping (platelet activation, acute phase response, lipid remodeling)",
                "Multi-analyte biomarker profile extraction"
            ]
        }

    # -------------------------------------------------------------
    # 5. Dataset E: SOMA Research Material
    # -------------------------------------------------------------
    soma_p = os.path.join(raw_dir, "soma", "SOMA_Research_Dataset.xlsx")
    if os.path.exists(soma_p):
        print("Auditing SOMA Research Material...")
        wb = openpyxl.load_workbook(soma_p, data_only=True)
        soma_stats = {}
        for s in wb.sheetnames:
            ws = wb[s]
            rows = [list(r) for r in ws.iter_rows(values_only=True)]
            headers = rows[0] if rows else []
            soma_stats[s] = {
                "rows": len(rows),
                "columns": headers,
                "data_preview": rows[1:4] if len(rows) > 1 else []
            }
        wb.close()
        registry["datasets"]["Dataset_E_SOMA_Material"] = {
            "name": "SOMA Research Material & Study Documentation",
            "source": "Space Omics and Medical Atlas (SOMA) Consortium / Nature Portfolio SOMA Package",
            "license": "Open Access / Academic Reference",
            "format": "Excel workbook (.xlsx)",
            "population": "Inspiration4 and SOMA reference cohorts",
            "stats": soma_stats,
            "target_labels": "None (metadata and study design reference catalog)",
            "suitable_tasks": [
                "Reference mapping for biological domain indicators",
                "Validation benchmarks against published spaceflight findings",
                "Contextual annotation of omics features"
            ]
        }

    # -------------------------------------------------------------
    # 6. Audit of Datasets F & G
    # -------------------------------------------------------------
    registry["datasets"]["Dataset_F_Structured_Astronaut_Health"] = {
        "name": "Structured Astronaut Health Dataset",
        "expected_size": "~5,400 rows",
        "status": "NOT_PROVIDED_IN_WORKSPACE",
        "audit_note": "A standalone tabular file of 5,400 rows with synthetic or real clinical records (ONSD, BMD, radiation, etc.) was not included in the supplied directory archives. Per Section 13 strict guidelines, missing data is explicitly recorded rather than fabricated. A deterministic reference architecture and feature validation engine for clinical metrics (HR, BP, SpO2, Radiation dose, ONSD, BMD T-score) is developed and calibrated using established spaceflight medical standards."
    }
    registry["datasets"]["Dataset_G_Structured_SOMA_Multiomics"] = {
        "name": "Structured SOMA Multiomics Dataset",
        "expected_size": "~2,400 rows",
        "status": "NOT_PROVIDED_IN_WORKSPACE",
        "audit_note": "A standalone pre-merged multiomics matrix of 2,400 rows was not supplied separately. However, high-resolution multiomics data was directly audited and processed from the primary NASA OSDR OSD-570 and OSD-571 archives (snRNA-seq, snATAC-seq, TCR/BCR VDJ, plasma proteomics, EVP proteomics, and metabolomics)."
    }

    # Save registry JSON
    reg_path = os.path.join(reports_dir, "dataset_registry.json")
    with open(reg_path, "w") as f:
        json.dump(registry, f, indent=2)
    print(f"Dataset registry saved to {reg_path}")
    return registry

if __name__ == "__main__":
    audit_all()
