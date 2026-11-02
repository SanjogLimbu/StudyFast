from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from main import app
from models import Flashcard, User
from database import get_db
from routers.auth import get_current_user

##

def test_tts_reads_native_script_without_romanization(monkeypatch, tmp_path):
    db = MagicMock()
    db.scalar.return_value = Flashcard(id=1, front="What does [[猫|neko]] mean?", back="Cat")

    app.dependency_overrides[get_current_user] = lambda: User(id=1)
    app.dependency_overrides[get_db] = lambda: db

    # Fake the voice and the audio folder so the test doesn't call ElevenLabs or write to uploads.
    generate_voice = MagicMock(return_value=b"audio")
    monkeypatch.setattr("routers.flashcards.generate_voice", generate_voice)
    monkeypatch.setattr("routers.flashcards.TTS_PATH", tmp_path)
    client = TestClient(app)

    response = client.get("/flashcards/1/tts/front")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    generate_voice.assert_called_once_with("What does 猫 mean?")
