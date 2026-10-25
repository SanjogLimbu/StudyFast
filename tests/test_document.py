from fastapi.testclient import TestClient
from main import app
from services.document_processing import clean_text
from models import User
from routers.auth import get_current_user
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
    app.dependency_overrides[get_current_user] = lambda: User(id=1, uploads=1, last_upload=datetime.now(timezone.utc))
    client = TestClient(app)

    response = client.post("/documents/prompt", json={"user_prompt": "hello world"})
    app.dependency_overrides.clear()

    assert response.status_code == 429
    assert response.json() == {"detail": "You reached your daily upload limit."}


def test_prompt_upload_resets_daily_limit():
    app.dependency_overrides[get_current_user] = lambda: User(id=1, uploads=1, last_upload=datetime.now(timezone.utc) - timedelta(days=1))
    client = TestClient(app)

    response = client.post("/documents/prompt", json={"user_prompt": "hello world"})
    app.dependency_overrides.clear()

    assert response.status_code == 201


def test_prompt_help_daily_limit():
    app.dependency_overrides[get_current_user] = lambda: User(id=1, prompts=6, last_prompt=datetime.now(timezone.utc) - timedelta(days=1))
    client = TestClient(app)

    response = client.post("/documents/1/topics/1/help", json={"user_prompt": "hello world"})
    app.dependency_overrides.clear()

    assert response.status_code == 429
    assert response.json() == {"detail": "You have reached your daily question prompt limit."}


def test_prompt_help_resets_daily_limit():
    app.dependency_overrides[get_current_user] = lambda: User(id=1, prompts=0, last_prompt=datetime.now(timezone.utc) - timedelta(days=1))
    client = TestClient(app)

    response = client.post("/documents/1/topics/1/help", json={"user_prompt": "hello world"})
    app.dependency_overrides.clear()

    assert response.status_code == 201


def test_prompt_rejects_short_requests():
    app.dependency_overrides[get_current_user] = lambda: User(id=1, uploads=0, last_upload=datetime.now(timezone.utc))
    client = TestClient(app)

    response = client.post("/documents/prompt", json={"user_prompt": "x"})
    app.dependency_overrides.clear()

    assert response.status_code == 422

