import json

import pytest
from pydantic import ValidationError

from app.extract import SAMPLE_PATH
from app.schemas import Extraction


def sample() -> dict:
    return json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))


def test_sample_response_validates():
    e = Extraction.model_validate(sample())
    assert len(e.tasks) == 7
    dark_mode = next(t for t in e.tasks if t.id == "t5")
    assert dark_mode.deadline is None and dark_mode.owner is None


def test_missing_source_phrase_rejected():
    data = sample()
    del data["tasks"][0]["source_phrase"]
    with pytest.raises(ValidationError):
        Extraction.model_validate(data)


def test_empty_title_rejected():
    data = sample()
    data["tasks"][0]["title"] = ""
    with pytest.raises(ValidationError):
        Extraction.model_validate(data)


def test_wrong_type_rejected():
    data = sample()
    data["tasks"] = "not a list"
    with pytest.raises(ValidationError):
        Extraction.model_validate(data)


def test_malformed_json_rejected():
    with pytest.raises(ValidationError):
        Extraction.model_validate_json('{"tasks": [')


def test_unknown_fields_ignored():
    data = sample()
    data["tasks"][0]["confidence"] = 0.9
    assert Extraction.model_validate(data).tasks[0].title
