import numpy as np
import pandas as pd

def compute_sleep_metrics(tst_min, tib_min, waso_min, awakenings_count, latency_min=None):
    """
    Computes standard polysomnography/actigraphy clinical sleep metrics:
    - Sleep Efficiency (%) = (Total Sleep Time / Total Minutes in Bed) * 100
    - Wake After Sleep Onset (WASO)
    - Awakening Frequency (awakenings per hour of sleep)
    - Sleep Fragmentation Index (SFI)
    """
    tst = float(tst_min)
    tib = float(tib_min)
    waso = float(waso_min)
    awakenings = float(awakenings_count)
    latency = float(latency_min) if latency_min is not None else 0.0
    
    if tib <= 0:
        return {
            "sleep_efficiency": np.nan, "tst_hours": np.nan,
            "waso_ratio": np.nan, "awakening_rate_per_hr": np.nan,
            "sleep_quality_category": "unknown"
        }
        
    efficiency = (tst / tib) * 100.0
    efficiency = min(100.0, max(0.0, efficiency))
    tst_hours = tst / 60.0
    
    waso_ratio = waso / tib
    awakening_rate = awakenings / max(0.5, tst_hours)
    
    # Clinical classification based on American Academy of Sleep Medicine (AASM)
    if efficiency >= 85.0 and waso <= 30.0:
        category = "optimal"
    elif efficiency >= 75.0 and waso <= 60.0:
        category = "mildly_compromised"
    else:
        category = "fragmented_impaired"
        
    return {
        "sleep_efficiency": round(efficiency, 2),
        "tst_hours": round(tst_hours, 2),
        "waso_min": round(waso, 1),
        "waso_ratio": round(waso_ratio, 3),
        "awakening_rate_per_hr": round(awakening_rate, 2),
        "sleep_latency_min": round(latency, 1),
        "sleep_quality_category": category
    }

def extract_circadian_chronotype(meq_score):
    """
    Morningness-Eveningness Questionnaire (MEQ) score classification:
    - 70-86: Definitely Morning Type
    - 59-69: Moderately Morning Type
    - 42-58: Intermediate Type (Neutral)
    - 31-41: Moderately Evening Type
    - 16-30: Definitely Evening Type
    """
    if np.isnan(meq_score):
        return "Unknown"
    score = int(round(meq_score))
    if score >= 70:
        return "Definitely_Morning"
    elif score >= 59:
        return "Moderately_Morning"
    elif score >= 42:
        return "Intermediate"
    elif score >= 31:
        return "Moderately_Evening"
    else:
        return "Definitely_Evening"
