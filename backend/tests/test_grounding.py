from app.grounding import (
    DEADLINE_NOT_FOUND,
    OWNER_NOT_FOUND,
    SOURCE_NOT_FOUND,
    check_tasks,
    normalize,
)
from app.schemas import ExtractedTask

NOTES = """Sprint planning
- Mia will finish the auth API by Friday.   token refresh left
- dark mode: let’s finish this soon
- Raj can't fix the login bug until the auth API is merged
"""


def task(source_phrase, owner=None, deadline=None, id="t1", blocked_by=()):
    return ExtractedTask(id=id, title="x", owner=owner, deadline=deadline,
                         source_phrase=source_phrase, blocked_by=list(blocked_by))


def warnings_for(t, notes=NOTES):
    return check_tasks([t], notes)[0].warnings


# --- normalize: only case, whitespace, quotes ---

def test_normalize_rules():
    assert normalize("  Let’s\n\tFINISH  “this” ") == "let's finish \"this\""


def test_normalize_keeps_punctuation():
    assert normalize("by Friday.") != normalize("by Friday")


# --- source phrase: positives ---

def test_exact_phrase_verified():
    assert warnings_for(task("Mia will finish the auth API by Friday")) == []


def test_case_whitespace_and_quotes_ignored():
    # notes use a curly apostrophe; Qwen returns straight, different case, extra spaces
    assert warnings_for(task("DARK MODE:   let's finish this soon")) == []


def test_phrase_spanning_collapsed_whitespace_verified():
    assert warnings_for(task("by Friday. token refresh left")) == []


# --- source phrase: negatives (no fuzzy matching) ---

def test_paraphrase_flagged():
    assert SOURCE_NOT_FOUND in warnings_for(task("Mia will complete the auth API by Friday"))


def test_missing_word_flagged():
    assert SOURCE_NOT_FOUND in warnings_for(task("Mia will finish auth API by Friday"))


def test_reordered_words_flagged():
    assert SOURCE_NOT_FOUND in warnings_for(task("by Friday Mia will finish the auth API"))


def test_typo_fix_flagged():
    assert SOURCE_NOT_FOUND in warnings_for(task("dark mode: lets finish this soon"))


# --- owner and deadline: checked against the task's own source phrase ---

def test_owner_and_relative_deadline_verified_exactly():
    t = check_tasks([task("Mia will finish the auth API by Friday", owner="Mia", deadline="by Friday")], NOTES)[0]
    assert t.warnings == []
    assert t.deadline == "by Friday"  # wording kept exactly, never converted to a date


def test_deadline_case_difference_still_verified_and_wording_kept():
    t = check_tasks([task("Mia will finish the auth API by Friday", deadline="By friday")], NOTES)[0]
    assert t.warnings == []
    assert t.deadline == "By friday"


def test_converted_date_flagged():
    w = warnings_for(task("Mia will finish the auth API by Friday", deadline="2026-10-30"))
    assert w == [DEADLINE_NOT_FOUND]


def test_reworded_relative_deadline_flagged():
    assert warnings_for(task("Mia will finish the auth API by Friday", deadline="end of week")) == [DEADLINE_NOT_FOUND]


def test_deadline_elsewhere_in_notes_but_not_in_phrase_flagged():
    # "by Friday" is in the notes, but not in this task's source phrase
    w = warnings_for(task("dark mode: let's finish this soon", deadline="by Friday"))
    assert w == [DEADLINE_NOT_FOUND]


def test_invented_owner_flagged():
    assert warnings_for(task("dark mode: let's finish this soon", owner="Priya")) == [OWNER_NOT_FOUND]


def test_missing_owner_and_deadline_are_not_warnings():
    # null stays null and is shown as Unassigned / Deadline not specified by the UI
    t = check_tasks([task("dark mode: let's finish this soon")], NOTES)[0]
    assert t.warnings == [] and t.owner is None and t.deadline is None


# --- tasks are never removed ---

def test_unsupported_tasks_are_kept():
    tasks = [task("Mia will finish the auth API by Friday", id="t1"),
             task("something never said", owner="Zoe", deadline="tomorrow", id="t2")]
    checked = check_tasks(tasks, NOTES)
    assert [t.id for t in checked] == ["t1", "t2"]
    assert checked[1].warnings == [SOURCE_NOT_FOUND, OWNER_NOT_FOUND, DEADLINE_NOT_FOUND]


def test_unknown_dependency_dropped_with_warning():
    t = check_tasks([task("Mia will finish the auth API by Friday", blocked_by=["t9"])], NOTES)[0]
    assert t.blocked_by == []
    assert any("t9" in w for w in t.warnings)
