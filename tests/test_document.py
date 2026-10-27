from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from main import app
from services.document_processing import clean_text
from models import Topic, User
from database import get_db
from routers.auth import get_current_user
from routers.documents import MAX_DAILY_UPLOADS_FREE, MAX_DAILY_PROMPTS_FREE
from datetime import datetime, timedelta, timezone

##

client = TestClient(app)

##

def test_clean_text_removes_nul_and_extra_spaces():
    assert clean_text("a\x00b    c\n\n\n\nd ") == "ab c\n\nd"


def test_upload_rejects_unsupported_file_type():
    app.dependency_overrides[get_current_user] = lambda: User(id=1)
    client = TestClient(app)

    response = client.post("/documents/upload", files={"file": ("virus.exe", b"hello", "application/octet-stream")})
    app.dependency_overrides.clear()

    assert response.status_code == 400
    assert response.json() == {"detail": "File type is not supported."}


def test_prompt_upload_daily_limit():
    app.dependency_overrides[get_current_user] = lambda: User(id=1, uploads=MAX_DAILY_UPLOADS_FREE, last_upload=datetime.now(timezone.utc))
    client = TestClient(app)

    response = client.post("/documents/prompt", json={"user_prompt": "hello world"})
    app.dependency_overrides.clear()

    assert response.status_code == 429
    assert response.json() == {"detail": "You reached your daily upload limit."}


def test_prompt_upload_resets_daily_limit(monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: User(id=1, uploads=MAX_DAILY_UPLOADS_FREE, last_upload=datetime.now(timezone.utc) - timedelta(days=1))

    # Fake the database and queue so the test doesn't save a document or start an AI job.
    app.dependency_overrides[get_db] = lambda: MagicMock()
    monkeypatch.setattr("routers.documents.document_queue", MagicMock())
    client = TestClient(app)

    response = client.post("/documents/prompt", json={"user_prompt": "hello world"})
    app.dependency_overrides.clear()

    assert response.status_code == 201


def test_prompt_help_daily_limit():
    app.dependency_overrides[get_current_user] = lambda: User(id=1, prompts=MAX_DAILY_PROMPTS_FREE, last_prompt=datetime.now(timezone.utc))
    client = TestClient(app)

    response = client.post("/documents/1/topics/1/help", json={"user_prompt": "hello world"})
    app.dependency_overrides.clear()

    assert response.status_code == 429
    assert response.json() == {"detail": "You have reached your daily question prompt limit."}


def test_prompt_help_resets_daily_limit(monkeypatch):
    user = User(id=1, prompts=MAX_DAILY_PROMPTS_FREE, last_prompt=datetime.now(timezone.utc) - timedelta(days=1))
    app.dependency_overrides[get_current_user] = lambda: user

    # Fake the database and AI call so the test doesn't need a real topic or spend tokens.
    db = MagicMock()
    db.scalar.return_value = Topic(id=1, lesson="A lesson.")
    app.dependency_overrides[get_db] = lambda: db
    monkeypatch.setattr("routers.documents.generate_help_response", lambda prompt, context: {"answer": "An answer."})
    client = TestClient(app)

    response = client.post("/documents/1/topics/1/help", json={"user_prompt": "hello world"})
    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"answer": "An answer."}

    # The answered prompt is the first one counted today.
    assert user.prompts == 1
    assert user.last_prompt.date() == datetime.now(timezone.utc).date()
    db.commit.assert_called_once()


def test_prompt_rejects_short_requests():
    app.dependency_overrides[get_current_user] = lambda: User(id=1, uploads=0, last_upload=datetime.now(timezone.utc))
    client = TestClient(app)

    response = client.post("/documents/prompt", json={"user_prompt": "x"})
    app.dependency_overrides.clear()

    assert response.status_code == 422

