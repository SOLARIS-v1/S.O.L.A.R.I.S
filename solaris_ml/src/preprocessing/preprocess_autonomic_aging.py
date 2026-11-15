import os
import wfdb
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt

def butter_bandpass(lowcut, highcut, fs, order=3):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    return b, a

def butter_lowpass(cutoff, fs, order=3):
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = butter(order, normal_cutoff, btype='low', analog=False)
    return b, a

def filter_ecg(ecg_signal, fs=1000.0, lowcut=0.5, highcut=40.0):
    b, a = butter_bandpass(lowcut, highcut, fs, order=3)
    filtered = filtfilt(b, a, ecg_signal)
    return filtered

def filter_bp(bp_signal, fs=1000.0, cutoff=15.0):
    b, a = butter_lowpass(cutoff, fs, order=3)
    filtered = filtfilt(b, a, bp_signal)
    return filtered

def process_all_autonomic_aging(raw_dir=None, output_dir=None):
    if raw_dir is None:
        raw_dir = os.path.join("solaris_ml", "datasets", "raw", "autonomic_aging")
    if output_dir is None:
        output_dir = os.path.join("solaris_ml", "datasets", "processed", "autonomic_aging")
    os.makedirs(output_dir, exist_ok=True)
    
    records = ["0001", "0002", "0003", "0004"]
    manifest = []
    
    print("Processing Autonomic Aging records...")
    for rec in records:
        rec_path = os.path.join(raw_dir, rec)
        try:
            record = wfdb.rdrecord(rec_path)
            fs = float(record.fs)
            sig = record.p_signal
            sig_names = record.sig_name
            sig_len = record.sig_len
            
            # Find channel indices
            ecg1_idx = sig_names.index("ECG1") if "ECG1" in sig_names else 0
            ecg2_idx = sig_names.index("ECG2") if "ECG2" in sig_names else 1
            nibp_idx = sig_names.index("NIBP") if "NIBP" in sig_names else 2
            
            raw_ecg = sig[:, ecg1_idx]
            raw_bp = sig[:, nibp_idx]
            
            # Filter signals
            clean_ecg = filter_ecg(raw_ecg, fs=fs)
            clean_bp = filter_bp(raw_bp, fs=fs)
            
            # Save downsampled / chunked summary for fast analysis (100 Hz downsample or 30s epoch summary)
            downsample_factor = 5 # 1000 Hz -> 200 Hz for storage efficiency
            clean_ecg_ds = clean_ecg[::downsample_factor]
            clean_bp_ds = clean_bp[::downsample_factor]
            time_ds = np.arange(len(clean_ecg_ds)) / (fs / downsample_factor)
            
            # Save compressed npz for memory-efficient loading
            out_file = os.path.join(output_dir, f"{rec}_filtered_200hz.npz")
            np.savez_compressed(
                out_file,
                time_s=np.round(time_ds, 3),
                ecg_filtered_mv=np.round(clean_ecg_ds, 4),
                bp_filtered_mmhg=np.round(clean_bp_ds, 2),
                fs=fs / downsample_factor
            )
            
            manifest.append({
                "record": rec,
                "original_samples": sig_len,
                "downsampled_samples": len(clean_ecg_ds),
                "fs_orig": fs,
                "fs_downsampled": fs / downsample_factor,
                "duration_s": round(sig_len / fs, 2),
                "output_file": out_file
            })
            print(f"  Processed record {rec}: {sig_len} samples -> saved {out_file}")
            
        except Exception as e:
            print(f"  Error processing {rec}: {e}")
            
    manifest_df = pd.DataFrame(manifest)
    manifest_df.to_csv(os.path.join(output_dir, "autonomic_aging_manifest.csv"), index=False)
    print("Autonomic Aging preprocessing complete.")
    return manifest_df

if __name__ == "__main__":
    process_all_autonomic_aging()
