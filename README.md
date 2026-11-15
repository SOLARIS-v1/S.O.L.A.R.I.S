# SOLARIS — Astronaut Health Intelligence System

SOLARIS is an autonomous, fully local astronaut health intelligence platform designed for long-duration deep space missions (Lunar Gateway, Mars Transit, Surface Habitats) where Earth-ground communication delay ranges from minutes up to 22 minutes.

SOLARIS is decision support, not an automated diagnostic device. It operates 100% offline with zero cloud calls, zero CDNs, and zero invented numbers.

---

## Quickstart

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22)
- **Python**: 3.10+ (tested on Python 3.14)

---

### 2. Backend (FastAPI & Local Voice AI)

```bash
# 1. Install backend requirements
pip install -r backend/requirements.txt

# 2. Download the Whisper STT model once for 100% local speech recognition
python -c "from faster_whisper import WhisperModel; WhisperModel('base.en', download_root='backend/models/whisper')"

# 3. Start the FastAPI backend server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

- When the Whisper model folder `backend/models/whisper` is present, `GET /api/voice/status` returns `available: true` and `POST /api/voice/stt` provides local transcription.
- If the model folder is absent, `GET /api/voice/status` returns `available: false` and the frontend gracefully drops to typed mode without crashing.

---

### 3. Frontend (React 18 + Vite + Tailwind CSS)

```bash
# 1. Install frontend dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Open `http://localhost:5173` in any modern web browser.

---

### 4. Running Tests

```bash
# Run backend pytest suite (voice STT endpoints, mock fallbacks, database)
python -m pytest backend/tests/test_voice.py

# Run frontend TypeScript static check
npx tsc -p tsconfig.app.json --noEmit

# Run fast linter (oxlint)
npx oxlint
```

---

## 100% Offline Capability

- **Zero Cloud Calls**: No external APIs, CDNs, or telemetry reporting.
- **Offline Resilience**: If the backend is offline, the interface displays an "Offline demo data" badge and continues functioning with local state.
- **Fully Local Voice**: Voice recognition runs entirely on-device via local faster-whisper (CPU int8). Tap the orb or press `Space` to wake; speak your command; ends utterance after ~1.2s silence. Say "sleep solaris" to stop speech and release microphone streams.
- **Decision Support**: No combined 0 to 100 health score. Telemetry is evaluated per-system (cardio, recovery, metabolic, structural) relative to astronaut baseline (median/MAD over >= 5 readings).
