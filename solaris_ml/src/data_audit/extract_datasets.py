import os
import shutil
import zipfile

def extract_all():
    base_dir = os.path.abspath(".")
    raw_dir = os.path.join(base_dir, "solaris_ml", "datasets", "raw")
    os.makedirs(raw_dir, exist_ok=True)
    
    # 1. Autonomic Aging WFDB files
    aa_dir = os.path.join(raw_dir, "autonomic_aging")
    os.makedirs(aa_dir, exist_ok=True)
    print("Copying Autonomic Aging WFDB files...")
    for f in os.listdir(base_dir):
        if (f.endswith(".hea") or f.endswith(".dat")) and not f.startswith("."):
            dest = os.path.join(aa_dir, f)
            shutil.copy2(os.path.join(base_dir, f), dest)
            print(f"  Copied {f} -> {dest}")
            
    # 2. SOMA Research Dataset
    soma_dir = os.path.join(raw_dir, "soma")
    os.makedirs(soma_dir, exist_ok=True)
    soma_file = os.path.join(base_dir, "SOMA_Research_Dataset.xlsx")
    if os.path.exists(soma_file):
        shutil.copy2(soma_file, os.path.join(soma_dir, "SOMA_Research_Dataset.xlsx"))
        print(f"Copied SOMA_Research_Dataset.xlsx to {soma_dir}")

    # 3. OSD-570 (download (1).zip)
    osd570_zip = os.path.join(base_dir, "download (1).zip")
    osd570_dir = os.path.join(raw_dir, "osd_570")
    if os.path.exists(osd570_zip):
        print("Extracting download (1).zip to osd_570...")
        os.makedirs(osd570_dir, exist_ok=True)
        with zipfile.ZipFile(osd570_zip, 'r') as zf:
            zf.extractall(osd570_dir)
        # Check for nested zips (e.g. metadata ISA)
        for root, _, files in os.walk(osd570_dir):
            for f in files:
                if f.endswith(".zip"):
                    zip_path = os.path.join(root, f)
                    out_sub = os.path.join(root, f[:-4])
                    print(f"  Extracting nested zip {f} to {out_sub}...")
                    os.makedirs(out_sub, exist_ok=True)
                    with zipfile.ZipFile(zip_path, 'r') as nzf:
                        nzf.extractall(out_sub)

    # 4. OSD-571 (download (2).zip)
    osd571_zip = os.path.join(base_dir, "download (2).zip")
    osd571_dir = os.path.join(raw_dir, "osd_571")
    if os.path.exists(osd571_zip):
        print("Extracting download (2).zip to osd_571...")
        os.makedirs(osd571_dir, exist_ok=True)
        with zipfile.ZipFile(osd571_zip, 'r') as zf:
            zf.extractall(osd571_dir)
        # Check for nested zips
        for root, _, files in os.walk(osd571_dir):
            for f in files:
                if f.endswith(".zip"):
                    zip_path = os.path.join(root, f)
                    out_sub = os.path.join(root, f[:-4])
                    print(f"  Extracting nested zip {f} to {out_sub}...")
                    os.makedirs(out_sub, exist_ok=True)
                    with zipfile.ZipFile(zip_path, 'r') as nzf:
                        nzf.extractall(out_sub)

    # 5. MMASH (mmash-1.0.0.zip)
    mmash_zip = os.path.join(base_dir, "mmash-1.0.0.zip")
    mmash_dir = os.path.join(raw_dir, "mmash")
    if os.path.exists(mmash_zip):
        print("Extracting mmash-1.0.0.zip to mmash...")
        os.makedirs(mmash_dir, exist_ok=True)
        with zipfile.ZipFile(mmash_zip, 'r') as zf:
            zf.extractall(mmash_dir)
        # Extract MMASH.zip inside if present
        for root, _, files in os.walk(mmash_dir):
            for f in files:
                if f == "MMASH.zip":
                    zip_path = os.path.join(root, f)
                    out_sub = os.path.join(root, "MMASH_extracted")
                    print(f"  Extracting nested MMASH.zip to {out_sub}...")
                    os.makedirs(out_sub, exist_ok=True)
                    with zipfile.ZipFile(zip_path, 'r') as nzf:
                        nzf.extractall(out_sub)

    print("All extractions completed.")

if __name__ == "__main__":
    extract_all()
