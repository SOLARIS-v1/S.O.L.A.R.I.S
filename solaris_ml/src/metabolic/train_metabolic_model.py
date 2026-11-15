import os
import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.pipeline import Pipeline
from sklearn.model_selection import LeaveOneGroupOut, cross_val_predict
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score

def train_metabolic_model():
    raise RuntimeError("Research-only artifact: cohort contains four astronauts. Do not promote or retrain as a general health-state classifier without independent data and a prespecified validation plan.")
    print("Training Metabolic & Biochemical Intelligence Models (NASA OSD-571)...")
    proc_dir = os.path.join("solaris_ml", "datasets", "processed", "omics")
    prot_csv = os.path.join(proc_dir, "plasma_proteomics_matrix.csv")
    
    if not os.path.exists(prot_csv):
        raise FileNotFoundError(f"Proteomics matrix not found at {prot_csv}")
        
    df = pd.read_csv(prot_csv)
    print(f"Loaded plasma proteomics matrix: {df.shape} ({df['Astronaut'].nunique()} astronauts)")
    
    # Target: Preflight (0) vs Immediate Postflight (1)
    target_sub = df[df["ImmediateVLongTerm"].isin(["Preflight", "Immediate_Postflight"])].copy()
    
    meta_cols = ["Sample_name", "Astronaut", "PreVpost", "Timepoint", "ImmediateVLongTerm"]
    feature_cols = [c for c in target_sub.columns if c not in meta_cols]
    
    # Filter features that have at least 50% non-null values
    valid_cols = [c for c in feature_cols if target_sub[c].notna().sum() >= 8]
    print(f"Retained {len(valid_cols)} proteins with sufficient coverage across samples.")
    
    X = target_sub[valid_cols].values
    y = (target_sub["ImmediateVLongTerm"] == "Immediate_Postflight").astype(int).values
    groups = target_sub["Astronaut"].values
    
    print(f"Binary classification cohort: {len(target_sub)} samples across {len(np.unique(groups))} astronauts.")
    print(f"  Class 0 (Preflight): {np.sum(y == 0)}, Class 1 (Immediate Postflight): {np.sum(y == 1)}")
    
    # Pipeline: SimpleImputer + SelectKBest (top 15) + StandardScaler + LogisticRegression
    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="mean")),
        ("selector", SelectKBest(score_func=f_classif, k=15)),
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(penalty="l2", C=0.5, random_state=42, solver="liblinear"))
    ])
    
    # Leave-One-Astronaut-Out Cross-Validation
    logo = LeaveOneGroupOut()
    y_preds = cross_val_predict(pipeline, X, y, groups=groups, cv=logo)
    
    try:
        y_probs = cross_val_predict(pipeline, X, y, groups=groups, cv=logo, method="predict_proba")[:, 1]
        auc = roc_auc_score(y, y_probs)
    except Exception:
        auc = np.nan
        
    acc = accuracy_score(y, y_preds)
    print(f"Leave-One-Astronaut-Out Validation Results:")
    print(f"  Accuracy: {acc*100:.1f}%")
    print(f"  ROC-AUC: {auc:.3f}" if not np.isnan(auc) else "  ROC-AUC: N/A")
    print("  Classification Report:")
    print(classification_report(y, y_preds, target_names=["Preflight", "Immediate_Postflight"], zero_division=0))
    
    # Fit pipeline on all data for production artifact
    pipeline.fit(X, y)
    
    # Extract top selected protein names
    selector = pipeline.named_steps["selector"]
    selected_indices = selector.get_support(indices=True)
    selected_proteins = [valid_cols[i] for i in selected_indices]
    print(f"Top 15 Biomarker Proteins Selected:")
    for p in selected_proteins[:10]:
        print(f"   {p}")
        
    # Save artifacts
    model_dir = os.path.join("solaris_ml", "models", "metabolic")
    prep_dir = os.path.join("solaris_ml", "preprocessors")
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(prep_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "plasma_proteomics_model.joblib")
    joblib.dump({
        "pipeline": pipeline,
        "selected_proteins": selected_proteins,
        "all_proteins": valid_cols,
        "classes": ["Preflight", "Immediate_Postflight"],
        "metrics": {
            "cv_accuracy": float(acc),
            "roc_auc": float(auc) if not np.isnan(auc) else None,
            "n_samples": len(target_sub),
            "n_astronauts": int(len(np.unique(groups)))
        }
    }, model_path)
    
    prep_path = os.path.join(prep_dir, "metabolic_selector_scaler.joblib")
    joblib.dump({
        "selector": selector,
        "scaler": pipeline.named_steps["scaler"]
    }, prep_path)
    
    print(f"Saved metabolic model: {model_path}")
    return pipeline

if __name__ == "__main__":
    train_metabolic_model()
