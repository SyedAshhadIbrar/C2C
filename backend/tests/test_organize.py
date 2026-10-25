from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

DEMO_NOTES = (Path(__file__).parents[2] / "demo" / "notes.txt").read_text(encoding="utf-8")


@pytest.fixture
def client(monkeypatch):
    # Sample mode must work with no API key at all.
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    return TestClient(app)


def test_health_reports_sample_mode_without_key(client):
    assert client.get("/api/health").json() == {"mode": "sample"}


def test_organize_demo_notes_in_sample_mode(client):
    res = client.post("/api/organize", json={"notes": DEMO_NOTES})
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "sample"
    assert len(data["tasks"]) == 7
    assert len(data["open_questions"]) == 2


def test_empty_notes_rejected(client):
    res = client.post("/api/organize", json={"notes": "   "})
    assert res.status_code == 400
    assert res.json()["detail"] == "Paste notes first."
