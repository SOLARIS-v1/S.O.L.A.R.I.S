import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import LeaveOneGroupOut, cross_val_predict
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def build_activity_hourly_dataset():
    """
    Aggregates MMASH Actigraph into hourly physical performance epochs.
    """
    raw_dir = os.path.join("solaris_ml", "datasets", "raw", "mmash", "multilevel-monitoring-of-activity-and-sleep-in-healthy-people-1.0.0", "MMASH_extracted", "DataPaper")
    proc_dir = os.path.join("solaris_ml", "datasets", "processed", "mmash")
    os.makedirs(proc_dir, exist_ok=True)
    
    users = sorted([d for d in os.listdir(raw_dir) if os.path.isdir(os.path.join(raw_dir, d))])
    
    rows = []
    print("Building hourly physical activity performance dataset...")
    for u in users:
        act_p = os.path.join(raw_dir, u, "Actigraph.csv")
        if not os.path.exists(act_p):
            continue
        # Read essential columns
        df = pd.read_csv(act_p, usecols=["Steps", "HR", "Vector Magnitude", "Inclinometer Standing", "Inclinometer Sitting", "Inclinometer Lying", "time"])
        
        # Parse hour from time string HH:MM:SS
        df["hour"] = df["time"].str.split(":").str[0].astype(int)
        
        # Aggregate by hour
        for h, grp in df.groupby("hour"):
            if len(grp) < 1800: # at least 30 minutes of data in that hour
                continue
            total_steps = int(grp["Steps"].sum())
            mean_hr = float(grp["HR"].replace(0, np.nan).mean())
            mean_vm = float(grp["Vector Magnitude"].mean())
            standing_min = float(grp["Inclinometer Standing"].sum() / 60.0)
            sitting_min = float(grp["Inclinometer Sitting"].sum() / 60.0)
            lying_min = float(grp["Inclinometer Lying"].sum() / 60.0)
            
            # Physical Activity Level (PAL) MET proxy: 1.0 (sleep) to 4.0+ (exercise)
            pal_proxy = 1.0 + (mean_vm / 50.0) * 0.5 + (total_steps / 1000.0) * 0.4
            pal_proxy = float(np.clip(pal_proxy, 1.0, 6.0))
            
            rows.append({
                "user_id": u,
                "hour": h,
                "total_steps": total_steps,
                "mean_hr_bpm": round(mean_hr, 1) if not np.isnan(mean_hr) else 75.0,
                "mean_vector_magnitude": round(mean_vm, 2),
                "standing_minutes": round(standing_min, 1),
                "sitting_minutes": round(sitting_min, 1),
                "lying_minutes": round(lying_min, 1),
                "physical_activity_level_met": round(pal_proxy, 2)
            })
            
    df_act = pd.DataFrame(rows)
    out_p = os.path.join(proc_dir, "mmash_hourly_activity.csv")
    df_act.to_csv(out_p, index=False)
    print(f"Hourly performance dataset saved: {df_act.shape} -> {out_p}")
    return df_act

def train_performance_model():
    raise RuntimeError("Quarantined: target physical_activity_level_met is formula-derived from predictor features; this is not independent ground truth.")
    print("Training Physical Performance & Activity Level Model...")
    proc_dir = os.path.join("solaris_ml", "datasets", "processed", "mmash")
    csv_p = os.path.join(proc_dir, "mmash_hourly_activity.csv")
    
    if not os.path.exists(csv_p):
        df = build_activity_hourly_dataset()
    else:
        df = pd.read_csv(csv_p)
        
    feature_cols = ["total_steps", "mean_hr_bpm", "mean_vector_magnitude", "standing_minutes", "sitting_minutes", "lying_minutes"]
    target_col = "physical_activity_level_met"
    group_col = "user_id"
    
    df_clean = df.dropna(subset=feature_cols + [target_col, group_col]).copy()
    print(f"Cohort: {len(df_clean)} hourly epochs across {df_clean[group_col].nunique()} participants.")
    
    X = df_clean[feature_cols].values
    y = df_clean[target_col].values
    groups = df_clean[group_col].values
    
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("rf", RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1))
    ])
    
    logo = LeaveOneGroupOut()
    y_preds = cross_val_predict(model, X, y, groups=groups, cv=logo)
    
    mae = mean_absolute_error(y, y_preds)
    rmse = np.sqrt(mean_squared_error(y, y_preds))
    r2 = r2_score(y, y_preds)
    
    print(f"Leave-One-Participant-Out Evaluation:")
    print(f"  MAE: {mae:.3f} METs")
    print(f"  RMSE: {rmse:.3f} METs")
    print(f"  R2: {r2:.3f}")
    
    model.fit(X, y)
    
    model_dir = os.path.join("solaris_ml", "models", "other")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "physical_performance_model.joblib")
    joblib.dump({
        "pipeline": model,
        "feature_names": feature_cols,
        "metrics": {"MAE": float(mae), "RMSE": float(rmse), "R2": float(r2)}
    }, model_path)
    print(f"Saved performance model: {model_path}")
    return model

if __name__ == "__main__":
    train_performance_model()
