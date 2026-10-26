import logging
import os
from pathlib import Path

from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from .schemas import Extraction

log = logging.getLogger(__name__)

SAMPLE_PATH = Path(__file__).with_name("sample_response.json")
DEFAULT_MODEL = "gemini-3.1-flash-lite"

SYSTEM_PROMPT = """You turn messy meeting notes into a JSON action plan. Follow these rules exactly:
- Extract only what the notes state. Never invent tasks, owners, deadlines, or answers.
- "source_phrase": copy the supporting text from the notes VERBATIM, character for character, as one contiguous passage. Do not fix typos, reword, shorten, or merge separate lines.
- "owner": a person's name only if the notes explicitly assign the task to them; otherwise null.
- "deadline": only if the notes explicitly state one; copy its wording exactly as written (e.g. "by Friday", "next week"). Never convert to a calendar date. Otherwise null.
- "deadline_ambiguous": true only if a deadline is stated but its wording is genuinely unclear.
- "id": short unique ids like "t1", "t2". "blocked_by": ids of tasks this task waits on. "blocker_note": a blocker that is not one of the tasks, else null.
- Tasks vs. open questions: a commitment to do something is a TASK even when its timing is vague. For example, "dark mode: let's finish this soon" is a task with "deadline": null and "owner": null, not an open question. Do not invent an owner, deadline, or extra commitment for it.
- "open_questions": only genuinely unresolved questions or undecided decisions (e.g. "do we support X?", "parked or not? not decided"), phrased as questions. A task whose deadline or owner is missing is not an open question. Never answer them.
Example. Vague timing does not turn an actionable commitment into an open question.
Notes: "dark mode: let's finish this soon"
Correct output: {"tasks": [{"id": "t1", "title": "Finish dark mode", "owner": null, "deadline": null, "deadline_ambiguous": false, "source_phrase": "dark mode: let's finish this soon", "blocked_by": [], "blocker_note": null}], "open_questions": []}
Wrong: an open question such as "When will dark mode be finished?"

Return JSON only."""


GENERAL_HINT = "Check the error details, then retry."
CONFIG_HINT = "Check GEMINI_API_KEY and GEMINI_MODEL in backend/.env, then retry."
TEMPORARY_HINT = "The AI provider is busy or rate-limited. Wait a moment, then retry."
OUTPUT_HINT = "The AI returned unusable output. Retry; if it keeps happening, check the error details."


class ExtractionError(Exception):
    """The AI call failed, or returned unusable output twice."""

    def __init__(self, message: str, hint: str = GENERAL_HINT):
        super().__init__(message)
        self.hint = hint


def hint_for(e: Exception) -> str:
    """Pick a hint only when the HTTP status identifies the cause reliably."""
    code = e.code if isinstance(e, errors.APIError) else None
    if code in (400, 401, 403, 404):  # bad/missing key, no permission, unknown model
        return CONFIG_HINT
    if code == 429 or (code is not None and code >= 500):  # rate limit or provider overload/outage
        return TEMPORARY_HINT
    return GENERAL_HINT


def is_sample_mode() -> bool:
    return not os.getenv("GEMINI_API_KEY", "").strip()


def _call_gemini(client, notes: str) -> str:
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "").strip() or DEFAULT_MODEL,
        contents=notes,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_json_schema=Extraction.model_json_schema(),
            temperature=0,
        ),
    )
    return response.text or ""


def extract(notes: str, client=None) -> tuple[Extraction, str]:
    """Return the schema-checked extraction and the mode it came from.

    Retries exactly once, and only for malformed JSON or a schema mismatch.
    Grounding problems are not checked here and never cause a retry.
    """
    if is_sample_mode():
        return Extraction.model_validate_json(SAMPLE_PATH.read_text(encoding="utf-8")), "sample"

    client = client or genai.Client(api_key=os.environ["GEMINI_API_KEY"])  # key stays server-side
    for attempt in (1, 2):
        try:
            text = _call_gemini(client, notes)
        except Exception as e:  # network, auth, quota, unknown model: not retried
            raise ExtractionError(f"Gemini request failed: {type(e).__name__}: {e}", hint_for(e)) from e
        try:
            return Extraction.model_validate_json(text), "live"
        except ValidationError as e:  # covers malformed JSON too
            log.warning("Gemini reply failed schema check (attempt %d): %s", attempt, e)
            last = e
    raise ExtractionError(f"Gemini returned invalid output twice: {last.error_count()} schema error(s)", OUTPUT_HINT) from last
