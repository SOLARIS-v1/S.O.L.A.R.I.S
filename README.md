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
# Run backend pytest suite (voice STT, ML research pipeline, database)
python -m pytest backend/tests

# Run frontend voice command registry test suite (60+ utterances)
npx jiti src/voice/__tests__/commandRegistry.test.ts

# Run frontend TypeScript static check
npx tsc -p tsconfig.app.json --noEmit

# Run fast linter (oxlint)
npx oxlint

# Run production build
npm run build
```

---

## Voice Commands Reference

SOLARIS supports whole-website voice control. Commands can be spoken or typed:

| Category | Sample Utterances | Action |
| :--- | :--- | :--- |
| **Navigation** | `"go to stage"`, `"open monitoring"`, `"show body"`, `"start check-in"`, `"open measure"`, `"eye test"`, `"exercise"`, `"open analytics"`, `"medical review"`, `"environment"` | Navigates directly to the requested screen with verbal confirmation. |
| **3D Body Explorer** | `"show my heart"`, `"inspect lungs"`, `"ocular view"`, `"show my spine"`, `"inspect back"`, `"show my skin"`, `"inspect bones"`, `"show brain"` | Centers and zooms 3D anatomical model, selects hotspot, and narrates current reading. |
| **Camera & Layers** | `"rotate left"`, `"rotate right"`, `"zoom in"`, `"zoom out"`, `"reset view"`, `"skin view"`, `"x-ray view"`, `"vessels view"` | Adjusts 3D orbit controls and anatomical layer rendering. |
| **Timeline Scrubber** | `"go back 7 days"`, `"go back 14 days"`, `"go to sol 120"`, `"next finding"`, `"previous finding"`, `"reset to today"`, `"play timeline"` | Scrubs mission historical telemetry and syncs data to selected Sol. |
| **Analytics** | `"show 7 days"`, `"show 14 days"`, `"show 30 days"`, `"compare sleep and heart rate"` | Adjusts longitudinal trend intervals or computes cross-system correlation. |
| **Drawers & Modals** | `"open tasks"`, `"open environment"`, `"open simulator"`, `"open settings"`, `"close drawer"` | Slides open operational side drawers or closes active overlay. |
| **Vitals Dictation** | `"my blood pressure is 120 over 80"`, `"my core temp is 37.1"`, `"my glucose is 92"` | Parses readings, fills measurement fields, and prompts verbal confirmation before saving. |
| **Check-in Responses**| `"mild"`, `"moderate"`, `"severe"`, `"yes"`, `"no"`, `"lower back pain"`, `"next"`, `"previous"`, `"submit"` | Answers assessment questions and advances wizard steps verbally. |
| **Generic UI Click** | `"click <label>"`, `"press <label>"` (e.g. `"click Submit"`, `"press Pause"`) | Locates visible interactive DOM element, highlights with visual ring, and activates. Destructive actions request spoken confirmation. |
| **Scrolling & View** | `"scroll up"`, `"scroll down"`, `"scroll to top"`, `"scroll to bottom"` | Smoothly scrolls viewport. |
| **Safety & Control** | `"sleep solaris"`, `"stop listening"` (sleeps and frees mic); `"wake solaris"` (activates); `"stop talking"`, `"be quiet"` (silences TTS); `"repeat"` (re-reads last response) | Safety-guarded voice state transitions. `"how was my sleep"` will never sleep the assistant. |

---

## 100% Offline Capability

- **Zero Cloud Calls**: No external APIs, CDNs, or telemetry reporting.
- **Fully Local Voice**: Voice recognition runs entirely on-device via local `faster-whisper` (`base.en`, CPU int8). Tap the orb or press `Space` to wake; speak your command; ends utterance after ~1.2s silence. Say `"sleep solaris"` to stop speech and release microphone streams.
- **Decision Support**: Solaris provides clinical decision support synthesis relative to astronaut baseline (median/MAD over readings) without combined synthetic scores.
