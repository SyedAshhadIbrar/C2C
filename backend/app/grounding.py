"""Grounding check: is each extracted task supported by the notes?

Kept separate from the Pydantic schema check (schemas.py). Normalization is used
only for comparing; displayed and exported values keep their original wording.
"""

import re

from .schemas import CheckedTask, ExtractedTask

_QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"'})

SOURCE_NOT_FOUND = "Needs verification: source phrase not found in notes"
OWNER_NOT_FOUND = "Needs verification: owner not found in source phrase"
DEADLINE_NOT_FOUND = "Needs verification: deadline not found in source phrase"


def normalize(text: str) -> str:
    """Lowercase, curly quotes -> straight, collapse whitespace. Nothing else."""
    return re.sub(r"\s+", " ", text.lower().translate(_QUOTES)).strip()


def check_task(task: ExtractedTask, notes_norm: str, known_ids: set[str]) -> CheckedTask:
    warnings: list[str] = []
    phrase = normalize(task.source_phrase)
    if phrase not in notes_norm:
        warnings.append(SOURCE_NOT_FOUND)
    if task.owner is not None and normalize(task.owner) not in phrase:
        warnings.append(OWNER_NOT_FOUND)
    if task.deadline is not None and normalize(task.deadline) not in phrase:
        warnings.append(DEADLINE_NOT_FOUND)

    blocked_by = [i for i in task.blocked_by if i in known_ids and i != task.id]
    for unknown in set(task.blocked_by) - set(blocked_by):
        warnings.append(f"Needs verification: depends on unknown task '{unknown}'")

    return CheckedTask(**task.model_dump(exclude={"blocked_by"}), blocked_by=blocked_by, warnings=warnings)


def check_tasks(tasks: list[ExtractedTask], notes: str) -> list[CheckedTask]:
    """Never removes a task; failures only add warnings."""
    notes_norm = normalize(notes)
    known_ids = {t.id for t in tasks}
    return [check_task(t, notes_norm, known_ids) for t in tasks]
