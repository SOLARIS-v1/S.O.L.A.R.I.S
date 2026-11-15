import numpy as np
import pandas as pd
from scipy.signal import find_peaks, welch
from scipy.stats import skew, kurtosis

def pan_tompkins_qrs_detector(ecg, fs=200.0):
    """
    Standard clinical Pan-Tompkins QRS detection algorithm:
    1. Bandpass filter (already applied or 5-15 Hz derivative)
    2. Five-point derivative filter: y[n] = (1/8T) * (-x[n-2] - 2x[n-1] + 2x[n+1] + x[n+2])
    3. Squaring function: y[n] = (x[n])^2
    4. Moving-window integrator: window width ~ 150 ms (0.15 * fs samples)
    5. Dual adaptive threshold peak detection.
    """
    ecg = np.asarray(ecg)
    N = len(ecg)
    if N < int(fs * 2):
        return np.array([], dtype=int)
    
    # 2. Derivative filter
    diff = np.zeros(N)
    for i in range(2, N - 2):
        diff[i] = (-ecg[i - 2] - 2 * ecg[i - 1] + 2 * ecg[i + 1] + ecg[i + 2]) * (fs / 8.0)
        
    # 3. Squaring
    squared = diff ** 2
    
    # 4. Moving-window integration
    win_size = int(0.15 * fs) # ~150 ms
    integrated = np.convolve(squared, np.ones(win_size) / win_size, mode='same')
    
    # 5. Adaptive peak finding
    min_distance = int(0.3 * fs) # Refractory period: minimum 300 ms between beats (~200 bpm max)
    threshold = 0.35 * np.mean(integrated) + 0.15 * np.std(integrated)
    
    peaks, _ = find_peaks(integrated, distance=min_distance, height=threshold)
    
    # Refine peaks by finding the maximum in the raw ECG around each integrated peak (+/- 50 ms)
    refined_peaks = []
    search_radius = int(0.06 * fs)
    for p in peaks:
        start = max(0, p - search_radius)
        end = min(N, p + search_radius + 1)
        r_peak = start + np.argmax(ecg[start:end])
        refined_peaks.append(r_peak)
        
    refined_peaks = np.unique(refined_peaks)
    return refined_peaks

def extract_hrv_features(r_peaks, fs=200.0):
    """
    Extracts time-domain and frequency-domain HRV parameters from detected R-peaks.
    """
    if len(r_peaks) < 4:
        return {
            "mean_rr_ms": np.nan, "mean_hr_bpm": np.nan, "sdnn_ms": np.nan,
            "rmssd_ms": np.nan, "pnn50_pct": np.nan, "vlf_power": np.nan,
            "lf_power": np.nan, "hf_power": np.nan, "lf_hf_ratio": np.nan,
            "total_power": np.nan, "valid_beats": len(r_peaks)
        }
        
    # RR intervals in milliseconds
    rr_intervals = (np.diff(r_peaks) / fs) * 1000.0
    
    # Physiological filtering: physiologically plausible RR is 300 ms (200 bpm) to 2000 ms (30 bpm)
    valid_mask = (rr_intervals >= 300.0) & (rr_intervals <= 2000.0)
    rr_clean = rr_intervals[valid_mask]
    
    if len(rr_clean) < 4:
        return {
            "mean_rr_ms": np.nan, "mean_hr_bpm": np.nan, "sdnn_ms": np.nan,
            "rmssd_ms": np.nan, "pnn50_pct": np.nan, "vlf_power": np.nan,
            "lf_power": np.nan, "hf_power": np.nan, "lf_hf_ratio": np.nan,
            "total_power": np.nan, "valid_beats": len(rr_clean)
        }
        
    # Time-Domain
    mean_rr = float(np.mean(rr_clean))
    mean_hr = float(60000.0 / mean_rr) if mean_rr > 0 else np.nan
    sdnn = float(np.std(rr_clean, ddof=1))
    
    successive_diffs = np.diff(rr_clean)
    rmssd = float(np.sqrt(np.mean(successive_diffs ** 2))) if len(successive_diffs) > 0 else np.nan
    pnn50 = float(np.sum(np.abs(successive_diffs) > 50.0) / len(successive_diffs) * 100.0) if len(successive_diffs) > 0 else np.nan
    
    # Frequency-Domain via Welch PSD on linearly interpolated RR time-series (resampled to 4 Hz)
    vlf_power, lf_power, hf_power, lf_hf_ratio, total_power = np.nan, np.nan, np.nan, np.nan, np.nan
    try:
        t_cum = np.cumsum(rr_clean) / 1000.0
        duration = t_cum[-1] - t_cum[0]
        if duration >= 30.0: # At least 30 seconds required for short-term spectral estimation
            fs_interp = 4.0 # 4 Hz interpolation
            t_interp = np.arange(t_cum[0], t_cum[-1], 1.0 / fs_interp)
            rr_interp = np.interp(t_interp, t_cum, rr_clean)
            
            # Detrend
            rr_detrended = rr_interp - np.mean(rr_interp)
            nperseg = min(len(rr_detrended), int(256 * fs_interp / 4))
            freqs, psd = welch(rr_detrended, fs=fs_interp, nperseg=nperseg)
            
            # Bands: VLF: 0.0033-0.04 Hz, LF: 0.04-0.15 Hz, HF: 0.15-0.4 Hz
            vlf_mask = (freqs >= 0.0033) & (freqs < 0.04)
            lf_mask = (freqs >= 0.04) & (freqs < 0.15)
            hf_mask = (freqs >= 0.15) & (freqs <= 0.40)
            
            vlf_power = float(np.trapezoid(psd[vlf_mask], freqs[vlf_mask])) if np.any(vlf_mask) else 0.0
            lf_power = float(np.trapezoid(psd[lf_mask], freqs[lf_mask])) if np.any(lf_mask) else 0.0
            hf_power = float(np.trapezoid(psd[hf_mask], freqs[hf_mask])) if np.any(hf_mask) else 0.0
            total_power = vlf_power + lf_power + hf_power
            lf_hf_ratio = float(lf_power / hf_power) if hf_power > 1e-6 else np.nan
    except Exception:
        pass
        
    return {
        "mean_rr_ms": round(mean_rr, 2),
        "mean_hr_bpm": round(mean_hr, 2),
        "sdnn_ms": round(sdnn, 2),
        "rmssd_ms": round(rmssd, 2),
        "pnn50_pct": round(pnn50, 2),
        "vlf_power": round(vlf_power, 2) if not np.isnan(vlf_power) else np.nan,
        "lf_power": round(lf_power, 2) if not np.isnan(lf_power) else np.nan,
        "hf_power": round(hf_power, 2) if not np.isnan(hf_power) else np.nan,
        "lf_hf_ratio": round(lf_hf_ratio, 3) if not np.isnan(lf_hf_ratio) else np.nan,
        "total_power": round(total_power, 2) if not np.isnan(total_power) else np.nan,
        "valid_beats": int(len(rr_clean))
    }

def extract_bp_features(bp_signal, fs=200.0):
    """
    Extracts continuous blood pressure parameters from NIBP arterial waveform:
    Systolic Blood Pressure (SBP), Diastolic Blood Pressure (DBP),
    Mean Arterial Pressure (MAP), and Pulse Pressure (PP).
    """
    bp_sig = np.asarray(bp_signal)
    if len(bp_sig) < int(fs * 2):
        return {"sbp_mean": np.nan, "dbp_mean": np.nan, "map_mean": np.nan, "pp_mean": np.nan}
        
    # Find systolic peaks and diastolic valleys
    min_dist = int(0.35 * fs) # minimum distance between heart beats
    systolic_peaks, _ = find_peaks(bp_sig, distance=min_dist, prominence=10.0)
    diastolic_valleys, _ = find_peaks(-bp_sig, distance=min_dist, prominence=10.0)
    
    if len(systolic_peaks) < 2 or len(diastolic_valleys) < 2:
        # Fallback to empirical 95th and 5th percentiles if waveform is noisy
        sbp = float(np.percentile(bp_sig, 95))
        dbp = float(np.percentile(bp_sig, 5))
    else:
        sbp = float(np.mean(bp_sig[systolic_peaks]))
        dbp = float(np.mean(bp_sig[diastolic_valleys]))
        
    # Constrain to physiological limits
    sbp = float(np.clip(sbp, 50.0, 220.0))
    dbp = float(np.clip(dbp, 30.0, 140.0))
    if sbp <= dbp:
        sbp = dbp + 30.0
        
    map_val = float(dbp + (1.0 / 3.0) * (sbp - dbp))
    pp_val = float(sbp - dbp)
    
    return {
        "sbp_mean": round(sbp, 1),
        "dbp_mean": round(dbp, 1),
        "map_mean": round(map_val, 1),
        "pp_mean": round(pp_val, 1)
    }

def compute_signal_quality_index(ecg, fs=200.0):
    """
    Calculates Signal Quality Index (SQI):
    - Skewness SQI (sSQI)
    - Kurtosis SQI (kSQI)
    - Relative power in QRS frequency band (5-15 Hz) vs total spectrum (pSQI)
    Returns: overall quality category ("acceptable" or "unusable") and numerical score (0 to 1).
    """
    ecg = np.asarray(ecg)
    if len(ecg) < int(fs * 2) or np.std(ecg) < 1e-6:
        return {"sqi_score": 0.0, "quality": "unusable"}
        
    s_val = abs(float(skew(ecg, nan_policy='omit')))
    k_val = float(kurtosis(ecg, nan_policy='omit'))
    
    # Power spectral density
    freqs, psd = welch(ecg, fs=fs, nperseg=min(len(ecg), int(256 * fs / 200)))
    total_power = np.trapezoid(psd, freqs)
    
    qrs_mask = (freqs >= 5.0) & (freqs <= 15.0)
    qrs_power = np.trapezoid(psd[qrs_mask], freqs[qrs_mask]) if np.any(qrs_mask) else 0.0
    p_sqi = qrs_power / (total_power + 1e-12)
    
    # Composite SQI (Clinical heuristic: kurtosis > 5, good QRS band energy)
    kurtosis_norm = min(1.0, max(0.0, (k_val - 2.0) / 10.0))
    psqi_norm = min(1.0, max(0.0, p_sqi * 2.5))
    sqi_composite = 0.6 * psqi_norm + 0.4 * kurtosis_norm
    
    quality = "acceptable" if (sqi_composite >= 0.40 and np.std(ecg) > 0.02) else "unusable"
    
    return {
        "sqi_score": round(float(sqi_composite), 3),
        "quality": quality,
        "kurtosis": round(k_val, 2),
        "skewness": round(s_val, 2),
        "qrs_power_ratio": round(float(p_sqi), 3)
    }
