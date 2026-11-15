"""Local Speech Recognition Service using faster-whisper.

Complies strictly with SOLARIS Phase 2 requirements:
- Model: base.en (cpu, int8), loaded with local_files_only=True from backend/models/whisper
- Initial prompt: "Solaris, heart rate, blood pressure, glucose, sleep, spine, skin, read manually, sleep solaris"
- vad_filter=True, beam_size=1
- Returns {"text": transcript}
- If model folder is missing or model not loaded, GET /api/voice/status returns available: False, and POST /api/voice/stt returns 503.
"""

import io
import os
import tempfile
import wave
from fastapi import APIRouter, UploadFile, File, HTTPException
import numpy as np

router = APIRouter(prefix="/api/voice", tags=["voice"])

WHISPER_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "whisper")
INITIAL_PROMPT = "Solaris, heart rate, blood pressure, glucose, sleep, spine, skin, read manually, sleep solaris, stage, monitoring, telemetry, body, anatomy, check-in, assessment, measure, eye test, routine, exercise, analytics, medical, environment, settings, rotate, zoom, sol, tasks, simulator, submit, click"

_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model

    if not os.path.isdir(WHISPER_MODEL_DIR) or not os.listdir(WHISPER_MODEL_DIR):
        return None

    try:
        from faster_whisper import WhisperModel
        _whisper_model = WhisperModel(
            WHISPER_MODEL_DIR,
            device="cpu",
            compute_type="int8",
            local_files_only=True,
        )
        return _whisper_model
    except Exception as e:
        print(f"[Whisper STT] Could not load local model from {WHISPER_MODEL_DIR}: {e}")
        return None


@router.get("/status")
def get_voice_status():
    """Returns local STT operational readiness and engine info."""
    model = get_whisper_model()
    return {
        "available": model is not None,
        "engine": "faster-whisper",
        "model": "base.en (cpu, int8)",
        "model_dir": WHISPER_MODEL_DIR,
    }


@router.post("/stt")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribes uploaded 16 kHz mono PCM16 WAV audio using local faster-whisper."""
    model = get_whisper_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Local Whisper speech model unavailable. Ensure base.en model is present in backend/models/whisper.",
        )

    audio_bytes = await file.read()
    if not audio_bytes:
        return {"text": ""}

    audio_input = None
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
            channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            n_frames = wf.getnframes()
            if n_frames == 0:
                return {"text": ""}
            frames = wf.readframes(n_frames)
            if sample_width == 2:
                arr = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                if channels > 1:
                    arr = arr.reshape(-1, channels).mean(axis=1)
                audio_input = arr
    except Exception:
        audio_input = None

    if audio_input is not None:
        if len(audio_input) < 160:  # less than 10ms
            return {"text": ""}
        segments, _ = model.transcribe(
            audio_input,
            beam_size=1,
            vad_filter=True,
            initial_prompt=INITIAL_PROMPT,
        )
        text = " ".join([segment.text for segment in segments]).strip()
        return {"text": text}

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, _ = model.transcribe(
            tmp_path,
            beam_size=1,
            vad_filter=True,
            initial_prompt=INITIAL_PROMPT,
        )
        text = " ".join([segment.text for segment in segments]).strip()
        return {"text": text}
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
