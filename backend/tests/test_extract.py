"""Fake-client tests: no real API key or network needed."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import extract as extract_mod
from app.extract import SAMPLE_PATH, ExtractionError, extract
from app.main import app

VALID = SAMPLE_PATH.read_text(encoding="utf-8")
DEMO_NOTES = (Path(__file__).parents[2] / "demo" / "notes.txt").read_text(encoding="utf-8")


class FakeResponse:
    def __init__(self, text):
        self.text = text


class FakeModels:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def generate_content(self, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return FakeResponse(reply)


class FakeClient:
    def __init__(self, *replies):
        self.models = FakeModels(replies)


@pytest.fixture
def live_env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key-for-tests")
    monkeypatch.delenv("GEMINI_MODEL", raising=False)


def test_valid_reply_returns_live_with_one_call(live_env):
    client = FakeClient(VALID)
    extraction, mode = extract("notes", client)
    assert mode == "live" and len(extraction.tasks) == 7
    assert len(client.models.calls) == 1


def test_request_uses_json_mode_schema_and_default_model(live_env):
    client = FakeClient(VALID)
    extract("my notes", client)
    call = client.models.calls[0]
    assert call["model"] == "gemini-3.1-flash-lite"
    assert call["contents"] == "my notes"
    assert call["config"].response_mime_type == "application/json"
    assert call["config"].response_json_schema["title"] == "Extraction"
    assert call["config"].temperature == 0


def test_model_override_from_env(live_env, monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL", "gemini-other")
    client = FakeClient(VALID)
    extract("n", client)
    assert client.models.calls[0]["model"] == "gemini-other"


def test_malformed_json_retried_once_then_succeeds(live_env):
    client = FakeClient('{"tasks": [', VALID)
    _, mode = extract("n", client)
    assert mode == "live" and len(client.models.calls) == 2


def test_schema_invalid_retried_once_then_succeeds(live_env):
    bad = json.loads(VALID)
    del bad["tasks"][0]["source_phrase"]
    client = FakeClient(json.dumps(bad), VALID)
    extract("n", client)
    assert len(client.models.calls) == 2


def test_two_bad_replies_raise_after_exactly_two_calls(live_env):
    client = FakeClient("not json", '{"tasks": "nope"}')
    with pytest.raises(ExtractionError, match="invalid output twice"):
        extract("n", client)
    assert len(client.models.calls) == 2


def test_api_error_is_not_retried_and_keeps_cause(live_env):
    boom = RuntimeError("401 API key not valid")
    client = FakeClient(boom, VALID)
    with pytest.raises(ExtractionError, match="401 API key not valid") as info:
        extract("n", client)
    assert info.value.__cause__ is boom
    assert len(client.models.calls) == 1


def test_no_key_uses_sample_and_never_calls_client(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = FakeClient()  # would fail if called
    _, mode = extract("n", client)
    assert mode == "sample" and client.models.calls == []


# --- vague commitments are tasks, not open questions ---
# A fake client can't test the model's judgment; these pin down the prompt rule we
# send and how the app handles the correct classification end to end.

def test_prompt_classifies_vague_commitment_as_task(live_env):
    client = FakeClient(VALID)
    extract("n", client)
    prompt = client.models.calls[0]["config"].system_instruction
    assert "let's finish this soon" in prompt
    assert '"deadline": null' in prompt and "not an open question" in prompt


def test_prompt_few_shot_example_is_a_valid_grounded_task():
    # The example inside the prompt must itself pass our schema and grounding rules.
    from app.extract import SYSTEM_PROMPT
    from app.grounding import check_tasks
    from app.schemas import Extraction

    line = next(l for l in SYSTEM_PROMPT.splitlines() if l.startswith("Correct output: "))
    example = Extraction.model_validate_json(line.removeprefix("Correct output: "))
    assert example.open_questions == []
    [t] = example.tasks
    assert (t.title, t.owner, t.deadline) == ("Finish dark mode", None, None)
    assert check_tasks(example.tasks, "dark mode: let's finish this soon")[0].warnings == []


def test_vague_commitment_task_shown_unassigned_without_deadline(live_env, monkeypatch):
    monkeypatch.setattr(extract_mod.genai, "Client", lambda api_key: FakeClient(VALID))
    data = TestClient(app).post("/api/organize", json={"notes": DEMO_NOTES}).json()
    dark = next(t for t in data["tasks"] if "let's finish this soon" in t["source_phrase"])
    assert dark["deadline"] is None and dark["owner"] is None  # UI: Deadline not specified / Unassigned
    assert dark["warnings"] == []  # source phrase grounded in the notes
    assert not any("dark mode" in q["text"].lower() for q in data["open_questions"])


# --- through the endpoint ---

def test_grounding_failure_does_not_retry(live_env, monkeypatch):
    client = FakeClient(VALID)
    monkeypatch.setattr(extract_mod.genai, "Client", lambda api_key: client)
    res = TestClient(app).post("/api/organize", json={"notes": "notes that quote none of the sample"})
    assert res.status_code == 200
    assert res.json()["mode"] == "live"
    assert all(t["warnings"] for t in res.json()["tasks"])  # every task flagged, none hidden
    assert len(client.models.calls) == 1


def test_live_demo_notes_verified(live_env, monkeypatch):
    monkeypatch.setattr(extract_mod.genai, "Client", lambda api_key: FakeClient(VALID))
    tasks = TestClient(app).post("/api/organize", json={"notes": DEMO_NOTES}).json()["tasks"]
    assert len(tasks) == 7 and all(t["warnings"] == [] for t in tasks)


# --- error hints: specific only when the HTTP status identifies the cause ---

from google.genai import errors as genai_errors  # noqa: E402

from app.extract import CONFIG_HINT, GENERAL_HINT, OUTPUT_HINT, TEMPORARY_HINT  # noqa: E402


def api_error(cls, code, status):
    return cls(code, {"error": {"code": code, "message": f"{status} (fake)", "status": status}})


@pytest.mark.parametrize("err, hint", [
    (api_error(genai_errors.ServerError, 503, "UNAVAILABLE"), TEMPORARY_HINT),
    (api_error(genai_errors.ClientError, 429, "RESOURCE_EXHAUSTED"), TEMPORARY_HINT),
    (api_error(genai_errors.ClientError, 400, "INVALID_ARGUMENT"), CONFIG_HINT),
    (api_error(genai_errors.ClientError, 404, "NOT_FOUND"), CONFIG_HINT),
    (ConnectionError("network down"), GENERAL_HINT),
])
def test_provider_error_hint_and_no_retry(live_env, err, hint):
    client = FakeClient(err, VALID)
    with pytest.raises(ExtractionError) as info:
        extract("n", client)
    assert info.value.hint == hint
    assert len(client.models.calls) == 1  # provider errors are never retried


def test_invalid_output_twice_gets_output_hint(live_env):
    with pytest.raises(ExtractionError) as info:
        extract("n", FakeClient("x", "y"))
    assert info.value.hint == OUTPUT_HINT


def test_503_detail_shows_cause_without_config_advice(live_env, monkeypatch):
    err = api_error(genai_errors.ServerError, 503, "UNAVAILABLE")
    monkeypatch.setattr(extract_mod.genai, "Client", lambda api_key: FakeClient(err))
    detail = TestClient(app).post("/api/organize", json={"notes": "n"}).json()["detail"]
    assert "503" in detail and TEMPORARY_HINT in detail
    assert "GEMINI_API_KEY" not in detail
    assert "fake-key-for-tests" not in detail  # key never echoed


def test_endpoint_returns_502_with_reason_after_two_bad_replies(live_env, monkeypatch):
    monkeypatch.setattr(extract_mod.genai, "Client", lambda api_key: FakeClient("x", "y"))
    res = TestClient(app).post("/api/organize", json={"notes": "n"})
    assert res.status_code == 502
    assert "invalid output twice" in res.json()["detail"]
