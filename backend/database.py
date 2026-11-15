import os
import sqlite3
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "astra_local.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Table for crew telemetry
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crew_telemetry (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            callsign TEXT NOT NULL,
            role TEXT NOT NULL,
            heart_rate_bpm REAL,
            hrv_rmssd_ms REAL,
            ectopic_jumps_hr INTEGER,
            spo2_pct REAL,
            cranial_ptt_ms REAL,
            resp_rate_brm REAL,
            skin_temp_c REAL,
            radiation_msv_day REAL,
            sleep_hours REAL,
            circadian_align_pct REAL,
            spine_pain_score REAL,
            skin_irritation_score REAL,
            last_updated TEXT
        )
    """)

    # 2. Table for check-in logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS checkin_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            crew_name TEXT NOT NULL,
            transcript TEXT NOT NULL,
            sleep_issue INTEGER NOT NULL,
            skin_issue INTEGER NOT NULL,
            spine_issue INTEGER NOT NULL,
            ml_status TEXT NOT NULL,
            astra_response TEXT NOT NULL,
            countermeasures TEXT NOT NULL
        )
    """)

    # Seed initial astronaut profiles
    now = datetime.utcnow().isoformat()
    profiles = [
        (
            "vance",
            "Commander Vance",
            "CMDR. A. VANCE",
            "Mission Commander",
            96.0,  # Elevated with ectopic jumps
            38.0,  # HRV dipped
            6,     # Ectopic jumps/hr
            98.4,
            172.0,
            14.2,
            36.6,
            0.42,
            5.4,
            74.0,
            3.5,
            1.0,
            now,
        ),
        (
            "patel",
            "Specialist Patel",
            "SPEC. R. PATEL",
            "EVA Specialist",
            64.0,  # Calm resting
            65.0,  # High HRV
            0,
            99.1,
            195.0,
            13.0,
            36.4,
            0.38,
            7.8,
            93.0,
            0.0,
            0.0,
            now,
        ),
        (
            "chen",
            "Flight Engineer Chen",
            "FLT. ENG. M. CHEN",
            "Flight Engineer / Science Officer",
            88.0,  # Elevated HR
            41.0,  # Lower HRV
            3,
            97.9,
            160.0,
            16.5,
            36.9,
            0.85,
            4.5,   # Sleep deficit
            61.0,
            6.0,   # Microgravity spine elongation pain
            2.0,
            now,
        ),
    ]

    for p in profiles:
        cursor.execute("""
            INSERT OR REPLACE INTO crew_telemetry (
                id, name, callsign, role, heart_rate_bpm, hrv_rmssd_ms, ectopic_jumps_hr,
                spo2_pct, cranial_ptt_ms, resp_rate_brm, skin_temp_c, radiation_msv_day,
                sleep_hours, circadian_align_pct, spine_pain_score, skin_irritation_score, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, p)

    conn.commit()
    conn.close()
    print("[Database] SQLite initialized and seeded successfully.")


def get_crew_telemetry(crew_id_or_name: str):
    conn = get_db()
    cursor = conn.cursor()
    query = crew_id_or_name.lower().strip()

    # Search by id or partial name match
    cursor.execute("""
        SELECT * FROM crew_telemetry 
        WHERE id = ? OR LOWER(name) LIKE ? OR LOWER(callsign) LIKE ?
    """, (query, f"%{query}%", f"%{query}%"))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def update_crew_telemetry(crew_id: str, updates: dict):
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    values = []
    for k, v in updates.items():
        fields.append(f"{k} = ?")
        values.append(v)
    values.append(datetime.utcnow().isoformat())
    values.append(crew_id)

    set_clause = ", ".join(fields) + ", last_updated = ?"
    cursor.execute(f"UPDATE crew_telemetry SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def save_checkin_log(
    crew_name: str,
    transcript: str,
    sleep_issue: bool,
    skin_issue: bool,
    spine_issue: bool,
    ml_status: str,
    astra_response: str,
    countermeasures: list,
):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO checkin_logs (
            timestamp, crew_name, transcript, sleep_issue, skin_issue, spine_issue,
            ml_status, astra_response, countermeasures
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        crew_name,
        transcript,
        1 if sleep_issue else 0,
        1 if skin_issue else 0,
        1 if spine_issue else 0,
        ml_status,
        astra_response,
        json.dumps(countermeasures),
    ))
    conn.commit()
    conn.close()


def get_checkin_logs(crew_name: str = None):
    conn = get_db()
    cursor = conn.cursor()
    if crew_name:
        cursor.execute("SELECT * FROM checkin_logs WHERE LOWER(crew_name) LIKE ? ORDER BY id DESC LIMIT 50", (f"%{crew_name.lower()}%",))
    else:
        cursor.execute("SELECT * FROM checkin_logs ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        try:
            d["countermeasures"] = json.loads(d["countermeasures"])
        except:
            d["countermeasures"] = []
        result.append(d)
    return result


# Initialize on import
init_db()
