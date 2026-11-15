"""Local Speech Recognition Service using faster-whisper.

Complies strictly with SOLARIS Phase 2 requirements:
- Model: base.en (cpu, int8), loaded with local_files_only=True from backend/models/whisper
- Initial prompt: "Solaris, heart rate, blood pressure, glucose, sleep, spine, skin, read manually, sleep solaris"
- vad_filter=True, beam_size=1
- Returns {"text": transcript}
- If model folder is missing or model not loaded, GET /api/voice/status returns available: False, and POST /api/voice/stt returns 503.
"""

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/api/voice", tags=["voice"])

WHISPER_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "whisper")
INITIAL_PROMPT = "Solaris, heart rate, blood pressure, glucose, sleep, spine, skin, read manually, sleep solaris"

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
