import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_voice_status():
    response = client.get("/api/voice/status")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data
    assert data["engine"] == "faster-whisper"
    assert "base.en" in data["model"]


def test_voice_stt_missing_model_or_503():
    # When local model folder is empty/missing, stt must return 503
    status_resp = client.get("/api/voice/status")
    is_available = status_resp.json()["available"]

    wav_dummy = b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    response = client.post(
        "/api/voice/stt",
        files={"file": ("test.wav", wav_dummy, "audio/wav")}
    )

    if not is_available:
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()
    else:
        assert response.status_code == 200
        assert "text" in response.json()
