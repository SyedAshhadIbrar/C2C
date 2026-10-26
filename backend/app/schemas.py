from typing import Literal

from pydantic import BaseModel, Field


class ExtractedTask(BaseModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    owner: str | None = None
    # Exact wording from the notes ("by Friday"); never reworded or converted to a date.
    deadline: str | None = None
    deadline_ambiguous: bool = False
    source_phrase: str = Field(min_length=1)
    blocked_by: list[str] = []
    blocker_note: str | None = None


class OpenQuestion(BaseModel):
    text: str = Field(min_length=1)


class Extraction(BaseModel):
    """The shape the AI must return. Unknown extra fields are ignored."""

    tasks: list[ExtractedTask]
    open_questions: list[OpenQuestion]


class CheckedTask(ExtractedTask):
    warnings: list[str] = []


class OrganizeRequest(BaseModel):
    notes: str


class OrganizeResponse(BaseModel):
    mode: Literal["live", "sample"]
    tasks: list[CheckedTask]
    open_questions: list[OpenQuestion]
