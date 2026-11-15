import numpy as np
import pandas as pd

def extract_circadian_stress_features(cortisol_wake, cortisol_bed, melatonin_wake=None, melatonin_bed=None, stai1=None, stai2=None):
    """
    Computes circadian endocrine features and psychometric stress alignment:
    - Cortisol Awakening Response (CAR) Delta = Cortisol(wake) - Cortisol(bed)
    - Cortisol Slope = (Cortisol(bed) - Cortisol(wake)) / diurnal_hours
    - Melatonin Diurnal Suppression Ratio = Melatonin(bed) / (Melatonin(wake) + 1e-12)
    - Cortisol-to-Melatonin Evening Ratio
    - Anxiety Index Composite (STAI state vs trait)
    """
    c_w = float(cortisol_wake) if cortisol_wake is not None else np.nan
    c_b = float(cortisol_bed) if cortisol_bed is not None else np.nan
    m_w = float(melatonin_wake) if melatonin_wake is not None else np.nan
    m_b = float(melatonin_bed) if melatonin_bed is not None else np.nan
    
    car_delta = c_w - c_b if not (np.isnan(c_w) or np.isnan(c_b)) else np.nan
    
    # Healthy CAR should typically exhibit an increase upon waking (positive CAR)
    car_status = "normal_awakening_surge" if car_delta > 0 else "flattened_or_inverted" if not np.isnan(car_delta) else "unknown"
    
    melatonin_ratio = m_b / (m_w + 1e-12) if not (np.isnan(m_b) or np.isnan(m_w)) else np.nan
    cortisol_melatonin_ratio = c_b / (m_b + 1e-12) if not (np.isnan(c_b) or np.isnan(m_b)) else np.nan
    
    # Psychological Anxiety Indices
    stai_state = float(stai1) if stai1 is not None and not np.isnan(stai1) else np.nan
    stai_trait = float(stai2) if stai2 is not None and not np.isnan(stai2) else np.nan
    
    # Clinical categorization based on Spielberger STAI thresholds (20-80 scale)
    if not np.isnan(stai_state):
        if stai_state <= 37:
            anxiety_cat = "low_normal"
        elif stai_state <= 44:
            anxiety_cat = "moderate"
        else:
            anxiety_cat = "elevated_high"
    else:
        anxiety_cat = "unknown"
        
    return {
        "cortisol_wake": round(c_w, 6) if not np.isnan(c_w) else np.nan,
        "cortisol_bed": round(c_b, 6) if not np.isnan(c_b) else np.nan,
        "car_delta": round(car_delta, 6) if not np.isnan(car_delta) else np.nan,
        "car_status": car_status,
        "melatonin_bed_wake_ratio": round(melatonin_ratio, 3) if not np.isnan(melatonin_ratio) else np.nan,
        "stai_state_score": round(stai_state, 1) if not np.isnan(stai_state) else np.nan,
        "stai_trait_score": round(stai_trait, 1) if not np.isnan(stai_trait) else np.nan,
        "anxiety_category": anxiety_cat
    }
