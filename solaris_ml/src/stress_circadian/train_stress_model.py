import os
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge, ElasticNet
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import LeaveOneOut, cross_val_predict
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_stress_circadian_model():
    raise RuntimeError("Quarantined: evaluation was not useful for predictive deployment. Preserve measured biomarkers/questionnaires as separate analytics.")
    print("Training Stress & Circadian Intelligence Models (MMASH)...")
    proc_dir = os.path.join("solaris_ml", "datasets", "processed", "mmash")
    cohort_csv = os.path.join(proc_dir, "mmash_cohort_features.csv")
    
    if not os.path.exists(cohort_csv):
        raise FileNotFoundError(f"Cohort table not found at {cohort_csv}")
        
    df = pd.read_csv(cohort_csv)
    
    # Features: endocrine + psychometric + circadian markers
    feature_cols = [
        "cortisol_wakeup",
        "cortisol_bedtime",
        "cortisol_car_delta",
        "meq_circadian_score",
        "panas_neg_mean",
        "pittsburgh_sleep_quality"
    ]
    target_col = "stai_state_anxiety"
    
    # Impute median for 2 participants with partial saliva
    df_clean = df.copy()
    for col in feature_cols + [target_col]:
        if col in df_clean:
            df_clean[col] = df_clean[col].fillna(df_clean[col].median())
            
    X = df_clean[feature_cols].values
    y = df_clean[target_col].values
    
    loo = LeaveOneOut()
    
    models = {
        "Ridge": Pipeline([("scaler", StandardScaler()), ("model", Ridge(alpha=2.0))]),
        "ElasticNet": Pipeline([("scaler", StandardScaler()), ("model", ElasticNet(alpha=0.5, l1_ratio=0.5, random_state=42))]),
        "RandomForest": RandomForestRegressor(n_estimators=50, max_depth=3, random_state=42)
    }
    
    results = {}
    best_name = None
    best_rmse = float("inf")
    best_model = None
    
    for name, model in models.items():
        y_preds = cross_val_predict(model, X, y, cv=loo)
        mae = mean_absolute_error(y, y_preds)
        rmse = np.sqrt(mean_squared_error(y, y_preds))
        r2 = r2_score(y, y_preds)
        
        results[name] = {"MAE": round(float(mae), 3), "RMSE": round(float(rmse), 3), "R2": round(float(r2), 3)}
        print(f"  {name} (LOOCV): MAE={mae:.3f}, RMSE={rmse:.3f}, R2={r2:.3f}")
        
        if rmse < best_rmse:
            best_rmse = rmse
            best_name = name
            best_model = model
            
    best_model.fit(X, y)
    
    # Save artifacts
    model_dir = os.path.join("solaris_ml", "models", "other")
    prep_dir = os.path.join("solaris_ml", "preprocessors")
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(prep_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "stress_circadian_model.joblib")
    scaler_path = os.path.join(prep_dir, "stress_standard_scaler.joblib")
    
    joblib.dump(best_model, model_path)
    scaler = StandardScaler().fit(X)
    joblib.dump(scaler, scaler_path)
    
    print(f"Selected Best Stress Model: {best_name} (RMSE={best_rmse:.3f})")
    print(f"Saved artifact to {model_path}")
    
    val_df = pd.DataFrame(results).T
    val_path = os.path.join(proc_dir, "stress_model_cv_results.csv")
    val_df.to_csv(val_path)
    
    return best_model, results

if __name__ == "__main__":
    train_stress_circadian_model()
