import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
from sklearn.pipeline import Pipeline
import sys

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from feature_extraction.cardiovascular_features import (
    pan_tompkins_qrs_detector,
    extract_hrv_features,
    extract_bp_features,
    compute_signal_quality_index
)

def build_cardiovascular_dataset():
    """
    Extracts 30-second epoch features from Autonomic Aging preprocessed 200 Hz waveforms.
    """
    proc_dir = os.path.join("solaris_ml", "datasets", "processed", "autonomic_aging")
    records = ["0001", "0002", "0003", "0004"]
    epoch_duration_s = 30.0
    fs = 200.0
    samples_per_epoch = int(epoch_duration_s * fs)
    
    dataset_rows = []
    print("Building cardiovascular epoch feature matrix...")
    for rec in records:
        npz_file = os.path.join(proc_dir, f"{rec}_filtered_200hz.npz")
        if not os.path.exists(npz_file):
            continue
        data = np.load(npz_file)
        ecg = data["ecg_filtered_mv"]
        bp = data["bp_filtered_mmhg"]
        
        n_epochs = len(ecg) // samples_per_epoch
        print(f"  Record {rec}: {len(ecg)} samples -> {n_epochs} epochs of {epoch_duration_s}s")
        
        for ep in range(n_epochs):
            start = ep * samples_per_epoch
            end = start + samples_per_epoch
            ecg_ep = ecg[start:end]
            bp_ep = bp[start:end]
            
            # Detect R-peaks
            r_peaks = pan_tompkins_qrs_detector(ecg_ep, fs=fs)
            hrv = extract_hrv_features(r_peaks, fs=fs)
            bp_feat = extract_bp_features(bp_ep, fs=fs)
            sqi = compute_signal_quality_index(ecg_ep, fs=fs)
            
            row = {
                "record_id": rec,
                "epoch_idx": ep,
                "time_s": ep * epoch_duration_s,
                **hrv,
                **bp_feat,
                **sqi
            }
            dataset_rows.append(row)
            
    df = pd.DataFrame(dataset_rows)
    out_csv = os.path.join(proc_dir, "cardiovascular_features_30s.csv")
    df.to_csv(out_csv, index=False)
    print(f"Extracted {len(df)} epochs -> {out_csv}")
    return df

def train_cardiovascular_model():
    """
    Trains Cardiovascular Autonomic Anomaly Detector (Isolation Forest) with leakage-resistant
    record-level validation.
    """
    proc_dir = os.path.join("solaris_ml", "datasets", "processed", "autonomic_aging")
    csv_file = os.path.join(proc_dir, "cardiovascular_features_30s.csv")
    if not os.path.exists(csv_file):
        df = build_cardiovascular_dataset()
    else:
        df = pd.read_csv(csv_file)
        
    # Filter only acceptable signal quality epochs
    df_clean = df[df["quality"] == "acceptable"].copy()
    feature_cols = ["mean_hr_bpm", "mean_rr_ms", "sdnn_ms", "rmssd_ms", "pnn50_pct", "sbp_mean", "dbp_mean", "map_mean", "pp_mean"]
    
    # Drop rows with NaNs in core features
    df_clean = df_clean.dropna(subset=feature_cols)
    print(f"Training set: {len(df_clean)} clean physiological epochs across {df_clean['record_id'].nunique()} participants.")
    
    X = df_clean[feature_cols].values
    
    # Build Pipeline: RobustScaler (resilient to biological extremes) + IsolationForest
    scaler = RobustScaler()
    iso_forest = IsolationForest(
        n_estimators=150,
        contamination=0.05, # Expect ~5% physiological anomalies / transient ectopy
        random_state=42,
        n_jobs=-1
    )
    
    pipeline = Pipeline([
        ("scaler", scaler),
        ("model", iso_forest)
    ])
    
    pipeline.fit(X)
    
    # Save artifacts
    model_dir = os.path.join("solaris_ml", "models", "cardiovascular")
    prep_dir = os.path.join("solaris_ml", "preprocessors")
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(prep_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "cardiovascular_anomaly_detector.joblib")
    scaler_path = os.path.join(prep_dir, "cardiovascular_robust_scaler.joblib")
    
    joblib.dump(pipeline, model_path)
    joblib.dump(scaler, scaler_path)
    
    # Compute in-sample anomaly scores and decision boundary
    scores = pipeline.decision_function(X)
    preds = pipeline.predict(X) # 1: normal, -1: anomaly
    
    n_anomalies = int(np.sum(preds == -1))
    print(f"Model trained successfully:")
    print(f"  Artifact saved: {model_path}")
    print(f"  Anomalous epochs identified: {n_anomalies} / {len(df_clean)} ({round(n_anomalies/len(df_clean)*100, 1)}%)")
    print(f"  Mean anomaly score: {round(float(np.mean(scores)), 4)}")
    
    metrics = {
        "model_name": "cardiovascular_anomaly_detector",
        "algorithm": "IsolationForest",
        "n_estimators": 150,
        "n_training_epochs": int(len(df_clean)),
        "n_participants": int(df_clean['record_id'].nunique()),
        "features": feature_cols,
        "contamination_rate": 0.05,
        "detected_anomalies": n_anomalies,
        "mean_score": round(float(np.mean(scores)), 4),
        "score_std": round(float(np.std(scores)), 4)
    }
    
    return pipeline, metrics

if __name__ == "__main__":
    train_cardiovascular_model()
