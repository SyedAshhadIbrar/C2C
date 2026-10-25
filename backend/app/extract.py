import os
from pathlib import Path

from .schemas import Extraction

SAMPLE_PATH = Path(__file__).with_name("sample_response.json")


def is_sample_mode() -> bool:
    return not os.getenv("DASHSCOPE_API_KEY", "").strip()


def extract(notes: str) -> tuple[Extraction, str]:
    """Return the validated extraction and the mode it came from."""
    # Live Qwen call arrives in slice 3; until then every request uses the labeled sample.
    return Extraction.model_validate_json(SAMPLE_PATH.read_text(encoding="utf-8")), "sample"
