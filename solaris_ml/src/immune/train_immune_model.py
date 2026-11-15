import os
import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

def train_immune_model():
    print("Developing Immune Intelligence & Spaceflight Trajectory Pipeline (NASA OSD-570)...")
    proc_dir = os.path.join("solaris_ml", "datasets", "processed", "omics")
    diff_genes_csv = os.path.join(proc_dir, "snrna_significant_differential_genes.csv")
    rep_csv = os.path.join(proc_dir, "immune_repertoire_diversity.csv")
    
    if not os.path.exists(diff_genes_csv):
        raise FileNotFoundError(f"snRNA diff genes not found at {diff_genes_csv}")
        
    df_diff = pd.read_csv(diff_genes_csv)
    df_rep = pd.read_csv(rep_csv) if os.path.exists(rep_csv) else None
    
    print(f"Loaded {len(df_diff)} significant differential expression entries across {df_diff['comparison_sheet'].nunique()} comparison phases.")
    
    # Extract top recurrent spaceflight differential genes across comparisons
    gene_counts = df_diff["Gene"].value_counts()
    top_genes = gene_counts.head(50).index.tolist()
    print(f"Top recurrent spaceflight immune genes: {top_genes[:10]}")
    
    # Build comparison-level feature matrix: comparisons x top genes log2FC
    pivot_fc = df_diff[df_diff["Gene"].isin(top_genes)].pivot_table(
        index="comparison_sheet",
        columns="Gene",
        values="avg_log2FC",
        aggfunc="mean"
    ).fillna(0.0)
    
    X = pivot_fc.values
    
    # Train Unsupervised Immune Trajectory PCA (2 components for clinical interpretation)
    n_components = min(3, len(pivot_fc), X.shape[1])
    pca_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("pca", PCA(n_components=n_components, random_state=42))
    ])
    
    pca_pipeline.fit(X)
    coords = pca_pipeline.transform(X)
    
    pca_obj = pca_pipeline.named_steps["pca"]
    explained_var = pca_obj.explained_variance_ratio_
    print(f"PCA Fitted: {n_components} components explain {np.sum(explained_var)*100:.1f}% variance.")
    for i, var in enumerate(explained_var):
        print(f"  PC{i+1}: {var*100:.1f}%")
        
    # Save artifacts
    model_dir = os.path.join("solaris_ml", "models", "immune")
    prep_dir = os.path.join("solaris_ml", "preprocessors")
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(prep_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "immune_trajectory_pca.joblib")
    joblib.dump({
        "pipeline": pca_pipeline,
        "feature_genes": list(pivot_fc.columns),
        "comparison_sheets": list(pivot_fc.index),
        "explained_variance_ratio": explained_var.tolist(),
        "repertoire_summary": df_rep.to_dict(orient="records") if df_rep is not None else []
    }, model_path)
    
    scaler_path = os.path.join(prep_dir, "immune_standard_scaler.joblib")
    joblib.dump(pca_pipeline.named_steps["scaler"], scaler_path)
    
    print(f"Immune trajectory model saved: {model_path}")
    return pca_pipeline

if __name__ == "__main__":
    train_immune_model()
