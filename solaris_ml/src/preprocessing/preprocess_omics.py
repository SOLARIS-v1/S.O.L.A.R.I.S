import os
import openpyxl
import pandas as pd
import numpy as np

def calculate_diversity(frequencies):
    freqs = np.array(frequencies, dtype=float)
    total = np.sum(freqs)
    if total <= 0:
        return 0.0, 0.0, 0.0
    probs = freqs / total
    # Shannon entropy
    shannon = -np.sum(probs * np.log(probs + 1e-12))
    # Gini-Simpson index
    simpson = 1.0 - np.sum(probs ** 2)
    # Top 10 clonotype fraction
    sorted_probs = np.sort(probs)[::-1]
    top10_frac = np.sum(sorted_probs[:10])
    return round(float(shannon), 4), round(float(simpson), 4), round(float(top10_frac), 4)

def preprocess_omics():
    print("Preprocessing NASA OSD-570 and OSD-571 Omics Datasets...")
    base_dir = os.path.abspath(".")
    raw_570 = os.path.join(base_dir, "solaris_ml", "datasets", "raw", "osd_570")
    raw_571 = os.path.join(base_dir, "solaris_ml", "datasets", "raw", "osd_571")
    out_dir = os.path.join(base_dir, "solaris_ml", "datasets", "processed", "omics")
    os.makedirs(out_dir, exist_ok=True)
    
    # -------------------------------------------------------------
    # 1. Immune Repertoire Diversity (TCR / BCR)
    # -------------------------------------------------------------
    vdj_p = os.path.join(raw_570, "GLDS-562_scRNA-Seq_VDJ_Results.xlsx")
    repertoire_summary = []
    
    if os.path.exists(vdj_p):
        print("  Processing VDJ Repertoires...")
        for sheet_name in ["TCR_VDJ", "BCR_VDJ"]:
            # Read first few rows with openpyxl to find the actual header row
            wb = openpyxl.load_workbook(vdj_p, read_only=True)
            ws = wb[sheet_name]
            header_row = 4
            wb.close()
            
            # Read with pandas skipping metadata comments
            df_vdj = pd.read_excel(vdj_p, sheet_name=sheet_name, skiprows=3)
            
            # Group by Grouping (Alpha/Beta or Heavy/Light) and Species/Sample if present
            group_col = "Grouping" if "Grouping" in df_vdj else df_vdj.columns[3]
            seq_col = "Sequence" if "Sequence" in df_vdj else df_vdj.columns[-1]
            
            for chain, group in df_vdj.groupby(group_col):
                counts = group[seq_col].value_counts()
                shannon, simpson, top10 = calculate_diversity(counts.values)
                repertoire_summary.append({
                    "repertoire_type": sheet_name.replace("_VDJ", ""),
                    "chain_type": str(chain),
                    "total_sequences": len(group),
                    "unique_clonotypes": len(counts),
                    "shannon_entropy": shannon,
                    "gini_simpson_index": simpson,
                    "top10_clonotype_dominance": top10
                })
        rep_df = pd.DataFrame(repertoire_summary)
        rep_path = os.path.join(out_dir, "immune_repertoire_diversity.csv")
        rep_df.to_csv(rep_path, index=False)
        print(f"  Saved immune repertoire diversity: {rep_path}")

    # -------------------------------------------------------------
    # 2. snRNA-seq Differential Gene Expression Summary
    # -------------------------------------------------------------
    snrna_p = os.path.join(raw_570, "GLDS-562_snRNA-Seq_PBMC_Gene_Expression_snRNA-seq_Processed_Data.xlsx")
    if os.path.exists(snrna_p):
        print("  Processing snRNA-seq Differential Expression...")
        wb = openpyxl.load_workbook(snrna_p, read_only=True)
        sheets = wb.sheetnames
        wb.close()
        
        diff_genes_all = []
        for s in sheets:
            df_s = pd.read_excel(snrna_p, sheet_name=s, skiprows=7)
            # Find significant genes (p_val_adj < 0.05)
            p_col = "p_val_adj" if "p_val_adj" in df_s else "p_val"
            fc_col = "avg_log2FC" if "avg_log2FC" in df_s else df_s.columns[2]
            gene_col = "Gene" if "Gene" in df_s else df_s.columns[0]
            
            sig = df_s[pd.to_numeric(df_s[p_col], errors='coerce') < 0.05].copy()
            sig["comparison_sheet"] = s
            diff_genes_all.append(sig)
            
        if diff_genes_all:
            diff_df = pd.concat(diff_genes_all, ignore_index=True)
            diff_path = os.path.join(out_dir, "snrna_significant_differential_genes.csv")
            diff_df.to_csv(diff_path, index=False)
            print(f"  Saved significant differential genes: {diff_df.shape} -> {diff_path}")

    # -------------------------------------------------------------
    # 3. Plasma Proteomics Matrix across Astronauts and Phases
    # -------------------------------------------------------------
    meta_p = os.path.join(raw_571, "GLDS-563_proteomics_plasma_metadata_all_samples_collapsed.csv")
    tsv_p = os.path.join(raw_571, "GLDS-563_proteomics_plasma_proteomics_preprocessed_data.tsv")
    
    if os.path.exists(meta_p) and os.path.exists(tsv_p):
        print("  Processing Plasma Proteomics matrix...")
        meta_df = pd.read_csv(meta_p)
        # Load tsv in chunks or directly
        df_prot = pd.read_csv(tsv_p, sep="\t", usecols=["Sample Name", "Protein Group", "Intensity (Log10)", "Gene Names"])
        # Strip replicate suffix (-1, -2) to map to collapsed sample names
        df_prot["Base_Sample"] = df_prot["Sample Name"].str.replace(r"-\d+$", "", regex=True)
        
        # Pivot table: Samples x Gene Names (averaging replicates)
        pivot_prot = df_prot.pivot_table(index="Base_Sample", columns="Gene Names", values="Intensity (Log10)", aggfunc="mean")
        
        # Merge with metadata
        merged_prot = meta_df.merge(pivot_prot, left_on="Sample_name", right_index=True, how="inner")
        prot_path = os.path.join(out_dir, "plasma_proteomics_matrix.csv")
        merged_prot.to_csv(prot_path, index=False)
        print(f"  Saved plasma proteomics matrix: {merged_prot.shape} -> {prot_path}")

    # -------------------------------------------------------------
    # 4. Plasma Metabolomics (Amino acids & Lipids)
    # -------------------------------------------------------------
    anp_p = os.path.join(raw_571, "GLDS-563_metabolomics_metabolomics_ANPPOS-NEG_preprocessed_data.xlsx")
    if os.path.exists(anp_p):
        print("  Processing ANP Metabolomics (Amino Acids)...")
        df_anp = pd.read_excel(anp_p)
        anp_clean_path = os.path.join(out_dir, "metabolomics_anp_amino_acids.csv")
        df_anp.to_csv(anp_clean_path, index=False)
        print(f"  Saved ANP metabolomics table: {df_anp.shape} -> {anp_clean_path}")

    print("Omics preprocessing complete.")

if __name__ == "__main__":
    preprocess_omics()
