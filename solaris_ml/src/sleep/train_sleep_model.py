import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import LeaveOneGroupOut, cross_validate, cross_val_predict
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_sleep_model():
    raise RuntimeError("Quarantined: target Efficiency is mathematically defined by supplied predictor features. No model is trained or promoted by this script.")
    print("Training Sleep & Recovery Intelligence Models (MMASH)...")
    proc_dir = os.path.join("solaris_ml", "datasets", "processed", "mmash")
    sleep_csv = os.path.join(proc_dir, "mmash_all_sleep_records.csv")
    
    if not os.path.exists(sleep_csv):
        raise FileNotFoundError(f"Sleep records not found at {sleep_csv}")
        
    df = pd.read_csv(sleep_csv)
    
    # Feature columns
    feature_cols = [
        "Total Sleep Time (TST)",
        "Total Minutes in Bed",
        "Wake After Sleep Onset (WASO)",
        "Latency",
        "Number of Awakenings",
        "Average Awakening Length",
        "Movement Index",
        "Fragmentation Index"
    ]
    target_col = "Efficiency"
    group_col = "user_id"
    
    # Clean NaNs
    df_clean = df.dropna(subset=feature_cols + [target_col, group_col]).copy()
    print(f"Loaded {len(df_clean)} sleep records across {df_clean[group_col].nunique()} distinct participants.")
    
    X = df_clean[feature_cols].values
    y = df_clean[target_col].values
    groups = df_clean[group_col].values
    
    # Leakage-resistant Leave-One-Group-Out Cross-Validation
    logo = LeaveOneGroupOut()
    
    candidate_models = {
        "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=4, min_samples_split=3, random_state=42),
        "RidgeRegression": Pipeline([("scaler", StandardScaler()), ("model", Ridge(alpha=1.0))]),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=60, max_depth=3, learning_rate=0.05, random_state=42)
    }
    
    results = {}
    best_name = None
    best_rmse = float("inf")
    best_model = None
    best_preds = None
    
    for name, model in candidate_models.items():
        y_preds = cross_val_predict(model, X, y, groups=groups, cv=logo)
        mae = mean_absolute_error(y, y_preds)
        rmse = np.sqrt(mean_squared_error(y, y_preds))
        r2 = r2_score(y, y_preds)
        
        results[name] = {"MAE": round(float(mae), 3), "RMSE": round(float(rmse), 3), "R2": round(float(r2), 3)}
        print(f"  {name} (LOGO-CV): MAE={mae:.3f}%, RMSE={rmse:.3f}%, R2={r2:.3f}")
        
        if rmse < best_rmse:
            best_rmse = rmse
            best_name = name
            best_model = model
            best_preds = y_preds
            
    # Fit best model on all data for production deployment
    best_model.fit(X, y)
    
    # Save artifacts
    model_dir = os.path.join("solaris_ml", "models", "sleep")
    prep_dir = os.path.join("solaris_ml", "preprocessors")
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(prep_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "sleep_recovery_model.joblib")
    joblib.dump(best_model, model_path)
    
    # Also save standard scaler fitted on training features
    scaler = StandardScaler()
    scaler.fit(X)
    scaler_path = os.path.join(prep_dir, "sleep_standard_scaler.joblib")
    joblib.dump(scaler, scaler_path)
    
    print(f"Selected Best Model: {best_name} (RMSE={best_rmse:.3f}%)")
    print(f"Saved model artifact: {model_path}")
    
    # Save validation metrics to file
    val_df = pd.DataFrame(results).T
    val_path = os.path.join(proc_dir, "sleep_model_cv_results.csv")
    val_df.to_csv(val_path)
    
    return best_model, results

if __name__ == "__main__":
    train_sleep_model()
