import os
import glob
import pandas as pd
import numpy as np

def preprocess_mmash(raw_dir=None, output_dir=None):
    if raw_dir is None:
        raw_dir = os.path.join("solaris_ml", "datasets", "raw", "mmash", "multilevel-monitoring-of-activity-and-sleep-in-healthy-people-1.0.0", "MMASH_extracted", "DataPaper")
    if output_dir is None:
        output_dir = os.path.join("solaris_ml", "datasets", "processed", "mmash")
    os.makedirs(output_dir, exist_ok=True)
    
    users = sorted([d for d in os.listdir(raw_dir) if os.path.isdir(os.path.join(raw_dir, d))])
    print(f"Preprocessing MMASH for {len(users)} participants...")
    
    cohort_records = []
    all_sleep_records = []
    all_questionnaires = []
    
    for u in users:
        u_dir = os.path.join(raw_dir, u)
        record = {"user_id": u}
        
        # 1. Demographics
        uinfo_p = os.path.join(u_dir, "user_info.csv")
        if os.path.exists(uinfo_p):
            df_ui = pd.read_csv(uinfo_p)
            record["gender"] = df_ui["Gender"].values[0] if "Gender" in df_ui else "Unknown"
            record["weight_kg"] = float(df_ui["Weight"].values[0]) if "Weight" in df_ui else np.nan
            record["height_cm"] = float(df_ui["Height"].values[0]) if "Height" in df_ui else np.nan
            record["age_yr"] = float(df_ui["Age"].values[0]) if "Age" in df_ui else np.nan
            if record["height_cm"] > 0:
                record["bmi"] = round(record["weight_kg"] / ((record["height_cm"] / 100.0) ** 2), 2)
            else:
                record["bmi"] = np.nan
                
        # 2. Sleep Metrics
        sleep_p = os.path.join(u_dir, "sleep.csv")
        if os.path.exists(sleep_p):
            df_sl = pd.read_csv(sleep_p)
            df_sl["user_id"] = u
            all_sleep_records.append(df_sl)
            
            # Primary night summary (take first full night)
            if len(df_sl) > 0:
                first_night = df_sl.iloc[0]
                record["sleep_efficiency"] = float(first_night.get("Efficiency", np.nan))
                record["total_sleep_time_min"] = float(first_night.get("Total Sleep Time (TST)", np.nan))
                record["time_in_bed_min"] = float(first_night.get("Total Minutes in Bed", np.nan))
                record["waso_min"] = float(first_night.get("Wake After Sleep Onset (WASO)", np.nan))
                record["sleep_latency_min"] = float(first_night.get("Latency", np.nan))
                record["awakenings_count"] = float(first_night.get("Number of Awakenings", np.nan))
                record["sleep_fragmentation_idx"] = float(first_night.get("Sleep Fragmentation Index", np.nan))
                
        # 3. Saliva Hormones (Cortisol & Melatonin)
        saliva_p = os.path.join(u_dir, "saliva.csv")
        if os.path.exists(saliva_p):
            df_sal = pd.read_csv(saliva_p)
            bed_row = df_sal[df_sal["SAMPLES"].str.contains("sleep", case=False, na=False)]
            wake_row = df_sal[df_sal["SAMPLES"].str.contains("wake", case=False, na=False)]
            
            c_bed = float(bed_row["Cortisol NORM"].values[0]) if len(bed_row) > 0 else np.nan
            c_wake = float(wake_row["Cortisol NORM"].values[0]) if len(wake_row) > 0 else np.nan
            m_bed = float(bed_row["Melatonin NORM"].values[0]) if len(bed_row) > 0 else np.nan
            m_wake = float(wake_row["Melatonin NORM"].values[0]) if len(wake_row) > 0 else np.nan
            
            record["cortisol_bedtime"] = c_bed
            record["cortisol_wakeup"] = c_wake
            record["cortisol_car_delta"] = round(c_wake - c_bed, 6) if not (np.isnan(c_wake) or np.isnan(c_bed)) else np.nan
            record["melatonin_bedtime"] = m_bed
            record["melatonin_wakeup"] = m_wake
            
        # 4. Psychological Questionnaires
        quest_p = os.path.join(u_dir, "questionnaire.csv")
        if os.path.exists(quest_p):
            df_q = pd.read_csv(quest_p)
            df_q["user_id"] = u
            all_questionnaires.append(df_q)
            if len(df_q) > 0:
                q = df_q.iloc[0]
                record["meq_circadian_score"] = float(q.get("MEQ", np.nan))
                record["stai_state_anxiety"] = float(q.get("STAI1", np.nan))
                record["stai_trait_anxiety"] = float(q.get("STAI2", np.nan))
                record["pittsburgh_sleep_quality"] = float(q.get("Pittsburgh", np.nan))
                record["daily_stress_rating"] = float(q.get("Daily_stress", np.nan))
                
                # PANAS mean positive and negative affect
                pos_cols = [c for c in q.index if "panas_pos" in c]
                neg_cols = [c for c in q.index if "panas_neg" in c]
                record["panas_pos_mean"] = float(pd.to_numeric(q[pos_cols], errors="coerce").mean()) if pos_cols else np.nan
                record["panas_neg_mean"] = float(pd.to_numeric(q[neg_cols], errors="coerce").mean()) if neg_cols else np.nan

        cohort_records.append(record)

    cohort_df = pd.DataFrame(cohort_records)
    cohort_path = os.path.join(output_dir, "mmash_cohort_features.csv")
    cohort_df.to_csv(cohort_path, index=False)
    print(f"MMASH cohort table saved: {cohort_df.shape} -> {cohort_path}")
    
    if all_sleep_records:
        all_sleep_df = pd.concat(all_sleep_records, ignore_index=True)
        all_sleep_df.to_csv(os.path.join(output_dir, "mmash_all_sleep_records.csv"), index=False)
        
    if all_questionnaires:
        all_q_df = pd.concat(all_questionnaires, ignore_index=True)
        all_q_df.to_csv(os.path.join(output_dir, "mmash_all_questionnaires.csv"), index=False)

    return cohort_df

if __name__ == "__main__":
    preprocess_mmash()
