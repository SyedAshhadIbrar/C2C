---
doc: spec
status: approved
---

# Chaos to Clarity — Technical Spec

## How This Works, In Plain Language
Chaos to Clarity has two small programs that run on your laptop:

- **The frontend** (React + TypeScript) is the screen: notes on the left, results on the right. It holds the current plan in memory while you edit it, and it builds the Markdown export. Reloading the page clears everything; nothing is saved.
- **The backend** (FastAPI, Python) has one job. It takes your notes, asks Google Gemini to pull out tasks and open questions as JSON, **checks that answer twice**, and sends the checked result back. It's the only place that knows your API key.

The two checks are the heart of the app:

1. **Schema check (Pydantic):** "Is this the right *shape*?" Gemini is asked for JSON matching our schema, but its answer is still treated as untrusted. Pydantic models describe exactly what a task must look like. If the answer doesn't fit, the backend asks once more, then reports an error. Nothing half-checked reaches the screen.
2. **Grounding check (our matching rules):** "Is it *supported by the notes*?" Every task's source phrase must appear in the notes as one continuous passage, ignoring only capitalization, extra spaces, and quote style. Owners and deadlines must appear inside that task's source phrase. Anything that fails is still shown, with a verification warning.

If no API key is set, the backend runs in **sample mode**. It returns a saved, realistic AI response for the demo notes instead of calling the AI, and the screen shows a "Sample mode" badge. Both checks still run, so the reliability features are real even before the key works.

Why this shape: one endpoint, no database, no login. That's the smallest setup that keeps the key off the browser and puts validation where it's easy to test.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Open:** the browser loads the frontend from the Vite dev server. The right panel shows `EmptyState`.
2. **Paste + Organize Notes:** if the box is empty, the frontend shows "Paste notes first" and makes no request. Otherwise it `POST`s `{ notes }` to `/api/organize` and the right panel shows a loading state.
3. **Backend extraction:** `extract.py` sends the notes plus the extraction prompt to Gemini in JSON mode with our schema (or loads `sample_response.json` in sample mode).
4. **Schema check:** `schemas.py` parses the reply into `Extraction`. If the JSON is malformed or fails the schema, there's one automatic retry; if that fails too, the backend returns HTTP 502 → the frontend shows an error with a **Retry** button, and the notes stay put.
5. **Grounding check:** `grounding.py` checks each task's source phrase against the notes, and the owner and deadline against the source phrase. It attaches `warnings` ("Needs verification"). No retry happens here.
6. **Results:** the frontend turns the response into its in-memory plan and renders `TaskCard`s, `BlockersSection`, and `OpenQuestions`. If there are zero tasks, it shows "No actionable tasks found," with open questions still listed.
7. **Edit:** card edits change in-memory state only. Edited owners and deadlines are marked `user`. Delete asks for inline confirmation. **Add task** creates a `user`-origin card.
8. **Export:** `exportMarkdown.ts` turns the current state into Markdown and the browser downloads `action-plan.md`.

## Stack
- **Frontend:** React 19 + TypeScript, scaffolded with Vite. *Learner's choice: familiar tools.* Docs: https://react.dev, https://vite.dev/guide/
- **Styling:** plain CSS with color variables (no UI library). This keeps the look calm and custom without adding a dependency.
- **Backend:** Python + FastAPI + Uvicorn. *Learner's choice: familiar.* Docs: https://fastapi.tiangolo.com
- **Validation:** Pydantic v2 (comes with FastAPI). Docs: https://docs.pydantic.dev
- **AI client:** the official Google Gen AI SDK (`google-genai`, 2.33.0) calling Gemini, default model `gemini-3.1-flash-lite`. *Learner switched from Qwen to Gemini during the build (see `checklist.md > Revisions`).* Docs: https://ai.google.dev/gemini-api/docs, https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- **Config:** `python-dotenv` reads `backend/.env`.
- **Tests:** `pytest` (backend grounding and schema), `vitest` (export). Docs: https://docs.pytest.org, https://vitest.dev

**Python version:** use **Python 3.12 or 3.13** for the backend (not the installed 3.15). Built with **3.12** via `uv venv --python 3.12`, because 3.13 is blocked from running on this machine (see `checklist.md > Revisions`).

**Check early in the build (unverified):**
- Gemini details were checked against Google's docs and confirmed with a live smoke test during Slice 3.

## Where It Runs and How Someone Tries It
Runs locally only, with no deployment (`scope.md > Later`). It needs Node 18+ (24 installed), Python 3.12 (via `uv`), and optionally a Gemini API key.

```
# terminal 1 — backend
cd backend
uv venv --python 3.12
uv pip install -r requirements.txt
copy .env.example .env      # add GEMINI_API_KEY, or leave it blank for sample mode
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# terminal 2 — frontend
cd frontend
npm install
npm run dev                 # open http://localhost:5173
```
Vite proxies `/api` to `localhost:8000`, so no CORS setup is needed.

**Demo recording:** paste `demo/notes.txt` → Organize Notes → point out the "finish this soon" card → add a date to it → resolve a question → delete or add a task → export and open `action-plan.md`. Use `demo/ambiguity-test.txt` to show warnings. For the submission: a short video plus a public GitHub repo (see `6-ship`).

## Look and Feel
From `prd.md > Look and Feel`, as CSS variables in `styles.css`:
- `--bg: #f7f5f0` (warm off-white) · `--card: #ffffff` · `--ink: #2a2b2e` (charcoal) · `--muted: #6a6d72` · `--line: #e2ddd3`
- `--accent: #3f8a7e` (muted teal/sage): primary button, focus rings, verified/source accents
- `--warn: #a8640c` / `--warn-bg: #fdf1dc` (amber): "Deadline not specified," "Unassigned," verification warnings
- `--err: #b03a2e` / `--err-bg: #fbe9e7`: error messages only
- **Type:** "Inter" (Google Fonts) falling back to `system-ui`. Title 600 weight; labels 12px uppercase-ish small caps; body 15px.
- **Layout:** two columns (`grid-template-columns: minmax(320px, 2fr) 3fr`), 24px gaps, 12px card radius, 1px borders, no heavy shadows. Stacks to one column under 800px.
- **Source phrase:** an italic quote block with a teal left border. The verification warning sits in that same spot in amber.
- **Labels:** small pills: `Unassigned`, `Deadline not specified`, `User-added`, `user-provided`, `Needs verification`.
- **Motion:** cards fade and slide up 4px, staggered about 30ms, about 200ms total. Respects `prefers-reduced-motion`.
- **Avoid:** gradients, glassmorphism, extra colors.

## Components

### Backend: Organize Endpoint (`app/main.py`)
`POST /api/organize`, body `{ "notes": string }`.
- Empty or whitespace-only notes → 400 (the frontend also blocks this).
- Calls the AI Extraction Service → the schema check (in `extract.py`) → the Grounding Check, and returns `OrganizeResponse`.
- AI or schema failure after the retry → 502 `{ "detail": "..." }`.

`GET /api/health` → `{ "mode": "live" | "sample" }`.
PRD ref: `prd.md > Organizing Notes`, `prd.md > States and Boundaries`.

### Backend: AI Extraction Service (`app/extract.py`)
- Calls `client.models.generate_content(model=GEMINI_MODEL or "gemini-3.1-flash-lite", contents=notes, config=GenerateContentConfig(system_instruction=..., response_mime_type="application/json", response_json_schema=Extraction.model_json_schema(), temperature=0))`. The client is `genai.Client(api_key=GEMINI_API_KEY)`, created server-side only; tests inject a fake client.
- **The prompt rules (`SYSTEM_PROMPT`, sent as the system instruction) mirror the product rules:** extract only what's stated; `owner`/`deadline` are `null` unless explicitly stated; relative deadlines are copied **exactly as written** and never converted; set `deadline_ambiguous: true` if a stated deadline is genuinely unclear; `source_phrase` is copied verbatim from the notes; unanswered questions are listed and never answered.
- **Tasks vs. open questions:** an actionable commitment stays a **task** even when its timing is vague, with `deadline: null` (shown as "Deadline not specified") and no invented owner, date, or extra commitment. **Open questions** are only genuinely unresolved questions or undecided decisions, never tasks that are missing an owner or deadline.
- **Few-shot example in the prompt** (added after a live run classified dark mode as a question):
  - Notes: `dark mode: let's finish this soon`
  - Correct output: `{"tasks": [{"id": "t1", "title": "Finish dark mode", "owner": null, "deadline": null, "deadline_ambiguous": false, "source_phrase": "dark mode: let's finish this soon", "blocked_by": [], "blocker_note": null}], "open_questions": []}`
  - Wrong: an open question such as "When will dark mode be finished?"
  - `tests/test_extract.py` checks that this example itself passes the schema and the grounding check.
- **JSON output:** Gemini is configured with `response_mime_type="application/json"` and `response_json_schema=Extraction.model_json_schema()`, so it's asked for JSON in our exact shape. The prompt doesn't need any particular keyword. The reply is still untrusted: it's always parsed and validated by Pydantic (below), then grounding-checked.
- Validates with `Extraction.model_validate_json(...)`. **Retry rule:** exactly **one** automatic retry, only when the reply is malformed JSON or fails the Pydantic schema check. If the retry also fails, it raises, which becomes a 502. **Grounding failures never trigger a retry.** They stay in the result as visible "Needs verification" warnings.
- **Sample mode:** if `GEMINI_API_KEY` is empty, it skips the call, loads `app/sample_response.json`, and sets `mode = "sample"`. The sample still goes through the schema check and the grounding check.
- API errors (network, auth, quota, 503 overload) are **not** retried; they raise `ExtractionError` with the original exception attached, logged in the backend terminal and returned as a 502 whose `detail` shows the actual cause plus a hint.
- **Error hints** (`hint_for` in `extract.py`), specific only when the Gemini HTTP status identifies the cause:
  - 400/401/403/404 (bad or missing key, no permission, unknown model) → "Check GEMINI_API_KEY and GEMINI_MODEL in backend/.env, then retry."
  - 429 or 5xx (rate limit, overload) → "The AI provider is busy or rate-limited. Wait a moment, then retry."
  - Invalid output twice → "The AI returned unusable output. Retry; if it keeps happening, check the error details."
  - Anything else → "Check the error details, then retry."
  - The key's value is never included in a message.
PRD ref: `prd.md > Organizing Notes`.

### Backend: Schemas (`app/schemas.py`) — Schema Check
Pydantic models (see **Data Model**). They reject missing fields, wrong types, and empty titles or source phrases. Unknown extra fields are ignored.
PRD ref: `prd.md > Task Cards`.

### Backend: Grounding Check (`app/grounding.py`)
Kept separate from the schema check, as the learner decided.

**Normalization** (applied to both sides before comparing):
1. Lowercase.
2. Curly quotes → straight: `‘ ’` → `'`, `“ ”` → `"`.
3. Collapse every run of whitespace (spaces, tabs, newlines) into one space, and trim the ends.

Nothing else is normalized: no punctuation stripping, no stemming, no fuzzy or similarity scoring.

**Rules:**
- **Source phrase verified** ⇔ `normalize(source_phrase)` is a substring of `normalize(notes)`, meaning one contiguous passage. Paraphrases and altered wording fail.
- **Owner verified** ⇔ the owner is null, or `normalize(owner)` is a substring of `normalize(source_phrase)`.
- **Deadline verified** ⇔ the deadline is null, or `normalize(deadline)` is a substring of `normalize(source_phrase)`. The deadline is kept **exactly as worded in the notes**, including relative dates like "by Friday" or "next week". It's never reworded or converted to a calendar date, either before or after the check. Normalization is used only for comparing, never for display or export.
- **Known limitation (accepted by the learner):** these are plain normalized substring checks, with no word boundaries and no special handling of words like "by". A shortened value that still appears inside the text counts as verified. For example, with the source phrase "Mia will finish the auth API by Friday", the deadlines `Friday` and `Fri` and the owner `Mi` all verify, while `end of week`, `this Friday`, or a converted date fail. The verified value is still shown exactly as returned and never expanded or converted. Tests in `tests/test_grounding.py` document this.
- Each failure adds a warning string to `task.warnings`, e.g. `"Source phrase not found in notes"`, `"Owner not found in source phrase"`, `"Deadline not found in source phrase"`. Failing tasks are **never removed**.

PRD ref: `prd.md > Verification Warnings`.

### Frontend: App Shell (`src/App.tsx`)
Holds all state (`useState`): `notes`, `status` (`idle | loading | error | done`), `plan`, `mode`. Renders a two-column grid with `NotesPanel` and `ResultsPanel`.
PRD ref: `prd.md > Screens and Layout`.

### Frontend: NotesPanel (`src/components/NotesPanel.tsx`)
The textarea and the **Organize Notes** button (disabled while loading). Shows the "Paste notes first" message for empty input.
PRD ref: `prd.md > Organizing Notes`.

### Frontend: ResultsPanel (`src/components/ResultsPanel.tsx`)
Switches on status: `EmptyState` (idle) · loading · error with **Retry** · results. Results show the toolbar (**Add task**, **Export**, plus a "Sample mode" badge when relevant), the task cards, `BlockersSection`, and `OpenQuestions`. With zero tasks it shows "No actionable tasks found."
PRD ref: `prd.md > States and Boundaries`.

### Frontend: TaskCard (`src/components/TaskCard.tsx`)
Shows, in order: title (+ provenance badges) → owner (or `Unassigned` pill) → deadline (or `Deadline not specified` pill + "Clarify the deadline" prompt; an ambiguous deadline also gets the prompt) → verification warnings → source phrase → blocked status (see `Frontend: BlockersSection` for the dependency chips) → **Edit** / **Delete** buttons.

**Editing (Slice 5).** **Edit** turns the card's title, owner, and deadline into inputs on the card (same page), with **Save** / **Cancel**. Rules (`editTask` in `src/plan.ts`, an immutable update; other tasks are untouched):
- **Title** is trimmed and required: a blank or whitespace-only title shows "Title is required." and isn't saved. A changed title is marked `titleOrigin: "user"` → **User-edited** badge.
- **Owner / deadline** are trimmed. A changed, non-empty value is marked `ownerOrigin` / `deadlineOrigin: "user"` → **User-provided** badge next to it. A deadline is kept exactly as typed (never converted), and setting one clears `deadlineAmbiguous`, so the clarify prompt goes away.
- **Clearing** an owner or deadline sets it to `null`, so **Unassigned** / **Deadline not specified** (and the clarify prompt) come back. Nothing is filled in automatically.
- Saving an unchanged value changes nothing, so it keeps no badge and stays AI-extracted.
- **Warnings:** changing the owner removes only that task's "owner not found in source phrase" warning, and changing the deadline only the "deadline not found in source phrase" one. The user's value replaces the AI claim, but it is **not** described as verified. The **source phrase never changes**, so its "From your notes" quote and any "source phrase not found" warning stay exactly as grounded. Title edits don't touch warnings.
- `id`, source phrase, and dependencies can't be edited (dependency editing is deferred).

**Deleting.** **Delete** shows an inline "Delete this task? Yes / No" (no browser dialog, no undo). **Yes** removes only that task (`deleteTask`). Other tasks keep their `blockedBy` references to it, so they show the existing `⚠ Unknown task "<id>"` chip on the card and in the Blockers section instead of the reference silently disappearing.

**Adding.** **+ Add task** in the results toolbar opens a dashed "New task" card at the end of the list with title (required, trimmed), owner, deadline, and source phrase (all optional; empty → `null`). `addTask` appends a task with `origin: "user"` → **User-added** badge, no dependencies, and **no grounding check** (`warnings: []`). A source phrase you enter is labeled "Source you entered — not checked against the notes", never "From your notes". On a User-added task, the separate User-provided / User-edited badges are omitted because the whole task is the user's.

**Ids for added tasks** (`nextUserTaskId`): `u1`, `u2`, … from a session counter that only counts up and skips any id still used by a task or referenced in any `blockedBy`. A deleted task's dangling reference therefore can never silently attach to a new task.

**Badges:** `User-added` (created by you), `User-edited` (title changed by you), `User-provided` (owner/deadline entered or changed by you). All are automatic; there are no free-form tags (learner decision, Slice 5).
PRD ref: `prd.md > Task Cards`, `prd.md > Editing Tasks`, `prd.md > Deleting Tasks`, `prd.md > Adding Tasks`.

### Frontend: BlockersSection (`src/components/BlockersSection.tsx`)
Lists every task with `blockedBy` entries or a `blockerNote`: "<task> ← <what it waits on>". Shows "Nothing is blocked." when empty. Display-only (dependency editing is deferred).

**Dependency display rules** (`dependenciesOf` in `src/plan.ts`, shared by this section and the task card so they always match), in the order the AI listed them:
- **Known id** → the other task's title, as a plain chip.
- **Unknown id** (no task with that id) → amber chip `⚠ Unknown task "<id>"`.
- **Self-dependency** (a task listing its own id) → amber chip `⚠ Self-dependency: this task depends on itself`.
- **Free-text blocker** (`blockerNote`) → plain chip after the task dependencies.

Unknown and self references are **preserved and flagged, never silently removed**: the backend keeps them in `blocked_by` and adds a "Needs verification" warning (`depends on unknown task '<id>'` / `depends on itself ('<id>')`), and the UI shows the amber chip. They never hide a task: the task list isn't filtered by dependencies, and a task whose only dependency is unknown still gets a row here.
PRD ref: `prd.md > Blockers & Dependencies Section`.

### Frontend: OpenQuestions (`src/components/OpenQuestions.tsx`)
Each question has editable wording plus a **Resolve / Reopen** toggle; the heading counts unresolved questions. Resolved questions are struck through, marked "Resolved", and their wording field is disabled (reopen to edit).
Edit rules (`updateQuestion` in `src/plan.ts`, always an immutable update that leaves other questions untouched):
- Wording is saved when the field loses focus or Enter is pressed, trimmed of surrounding whitespace.
- Blank or whitespace-only wording is not saved; the existing text is kept and shown again.
- Wording edits to a resolved question are ignored.
- Edits live only in the current session (`prd.md > States and Boundaries`); re-running Organize Notes replaces them.
PRD ref: `prd.md > Open Questions Section`.

### Frontend: Markdown Export (`src/exportMarkdown.ts`)
Slice 6. A pure function `toMarkdown(plan: Plan) → string` plus `downloadMarkdown(text)`, which creates a Blob (`text/markdown;charset=utf-8`), clicks a temporary link to save `action-plan.md`, and revokes the URL. An **Export Markdown** button in the results toolbar, shown whenever results are on screen (including zero tasks), exports the **current saved plan state**. Values typed into an Edit or Add form that's still open are not saved yet, so they aren't exported.

**Format** (example uses the demo plan after Slice 5 edits):
```
# Action Plan

_Sample mode: generated from a saved sample response, not a live AI call._

## Tasks (3)

- [ ] Finish dark mode
  - Owner: Unassigned
  - Deadline: by Friday (User-provided)
  - Source (from your notes): "dark mode: let's finish this soon"
- [ ] Fix the Android login bug
  - Owner: Raj
  - Deadline: Deadline not specified (clarify)
  - Source (from your notes): "Raj can't fix the login bug until the auth API is merged"
  - Blocked by: ⚠ Unknown task "t1"
- [ ] Book the demo room (User-added)
  - Owner: Sam
  - Deadline: Deadline not specified (clarify)
  - Source (entered by you, not checked against the notes): "we need a room for the demo"

## Blockers & Dependencies

- Fix the Android login bug ← ⚠ Unknown task "t1"

## Open Questions

- [x] Do we support SSO for the enterprise pilot? (Resolved)
- [ ] Is the push redesign parked until after the pilot?
```

**Rules:**
- **Order:** tasks, blockers, and questions in on-screen order. Every task line uses `- [ ]`, since the app has no "done" state.
- **Title line:** `- [ ] <title>`, plus `(User-added)` or `(User-edited)` when the card shows that badge.
- **Owner:** the value, plus `(User-provided)` if the card shows that badge, otherwise `Unassigned`.
- **Deadline:**
  - the exact wording, plus `(User-provided)` if the card shows that badge
  - `Deadline not specified (clarify)` when empty
  - `<wording> (wording unclear, clarify)` when `deadlineAmbiguous`
- **Warnings:** one line per warning, in card order: `⚠ Needs verification: <reason>`.
- **Source labels** match the card:
  - `Source (from your notes)`
  - `Source (quoted by AI, not found in your notes)`
  - `Source (entered by you, not checked against the notes)`
  - The line is omitted when there's no source phrase.
- **Blocked by:** uses `dependenciesOf`, the same as the card and the Blockers section: known titles, `⚠ Unknown task "<id>"`, `⚠ Self-dependency: this task depends on itself`, and the blocker note, joined with `; `.
- **Blockers & Dependencies:** uses `blockerRows`. If there are none, it says `Nothing is blocked.`
- **Open Questions:** `- [ ] <text>` when open, `- [x] <text> (Resolved)` when resolved. If there are none, it says `No open questions.`
- **No tasks:** shows `No actionable tasks found in these notes.` under the Tasks heading.
- **Mode line:** only in sample mode, so a sample export is never mistaken for live output.
- **Text safety:**
  - Every user- or AI-provided string is put on one line (newlines and runs of whitespace collapsed to one space).
  - Markdown control characters ``\ ` * _ [ ] < >`` are escaped with a backslash, so text can't break the checklist structure or inject links or HTML.
  - Source-phrase quotes keep their wording; only escaping is applied.
- **Shared with the card:** badges come from `badgesOf(task)` and source labels from `sourceKind(task)` in `src/plan.ts`. `TaskCard` uses the same two functions, so the screen and the file can't disagree.
- **Forward-compatible with Slice 7** (optional fields already declared on `Task` and `Plan`, but not populated by the API until Slice 7):
  - A task with `inferences` gets `(Inferred — confirm)` on its title line.
  - It gets one line per inference: `⚠ Inferred <task|owner|deadline|dependency> (Inferred — confirm). Evidence: "<quote>"`. A missing quote is written as `Evidence: none provided`, never left out.
  - A `deadlineType` is written after the deadline, e.g. `after QA signs off (conditional)`.
  - `## Decisions` and `## Problems` are written only when those lists exist (each item with its source label and warnings; `None.` when empty).
  - With no Slice 7 metadata, the output is exactly the format above.
  - **Known gap until Slice 7's UI exists:** the screen does **not** display inference metadata, deadline types, Decisions, or Problems yet. If that metadata were present, the exported file would contain information that isn't visible on screen, so the file would **not** match the UI in that case. Today nothing produces this metadata (`api.ts` doesn't map it and the backend doesn't return it), so the file and the screen match. Slice 7 must add the matching UI before any of this metadata is populated.
- **Never writes anything that isn't in the plan:** no dates, timestamps, counts beyond what's on screen, inferred values, or reordering. `toMarkdown` doesn't modify the plan.

PRD ref: `prd.md > Exporting the Checklist`.

## Planned: Contextual Extraction and Evaluation (Slice 7, optional)
Not built yet. Starts only after Slice 6 is approved; each part can be stopped without affecting Slices 1–6. PRD ref: `prd.md > Contextual Extraction (Slice 7, optional stretch)`.

### Schema additions (backward compatible)
All new fields are **optional with defaults**, so `sample_response.json`, the current API response, and the current frontend keep working unchanged:
- `ExtractedTask`:
  - `inferred: bool = False` and `inference_note: str | None`, for an implied task.
  - `owner_basis: "explicit" | "pronoun" | "context" | None` and `owner_evidence: str | None`.
  - `deadline_type: "explicit_date" | "relative" | "conditional" | "vague" | None` and `deadline_evidence: str | None`.
  - `dependency_evidence: str | None`.
- `Extraction`:
  - `decisions: list[{text, source_phrase}] = []`
  - `problems: list[{text, source_phrase}] = []`
- **Rule:** an inferred field without its evidence is a **schema-valid but flagged** reply. Grounding adds "Needs verification: inferred <field> has no evidence"; it doesn't reject the reply.

### Prompt
- Adds rules for each category, deadline kind, and evidence requirement: **evidence quote or null; never guess between two people**.
- Adds two or three short worked examples written for the prompt. They're **never copied from the evaluation cases**, to avoid tuning the prompt to the test.
- Provider, model setting, JSON-schema output, and the single-retry rule are unchanged.

### Grounding additions (`grounding.py`)
- **Explicit values:** today's checks, unchanged.
- **Owner:** an owner with basis `pronoun` or `context` must appear in its `owner_evidence`, and that evidence must appear in the notes (same normalization). It always gets the flag "Inferred — confirm" (an `inferences` list on the checked task, separate from `warnings`). It never counts as verified.
- **Deadline and dependency:** the same for `deadline_evidence` and `dependency_evidence`.
- **Implied task** (`inferred: true`): its source phrase is grounded as usual, and it's always flagged "Inferred — confirm".
- **Decisions and problems:** source phrases grounded; failures add a warning, and the item is never removed.
- **References:** unknown or self references keep today's behavior (kept and flagged).

### Interface
- **Cards:**
  - an amber **Inferred — confirm** badge, with the evidence quote labeled "Evidence (inferred, please confirm)"
  - a small deadline-kind chip (`conditional`, `relative`, `explicit date`)
  - for `vague`: "Deadline not specified"
- **Decisions** and **Problems:** two compact lists below Open Questions, each with its source quote. Problems are never added to Blockers automatically.
- **Export:** gains `## Decisions`, `## Problems`, and `(Inferred — confirm)` plus the evidence lines.

### Evaluation (`backend/eval/`)
**Layout:**
- `cases/NN-name.json`: notes plus expected results.
- `run.py` with two modes:
  - `--live` calls Gemini, **3 runs per case** at temperature 0, and saves raw replies to `eval/results/` (git-ignored).
  - `--replay <file>` re-scores saved replies with no key.
- `report.md`: generated.
- `tests/test_eval_scoring.py` tests the scorer with recorded replies, so no API key is needed.

**Fixed cases (10, made-up notes):**
1. the demo notes (regression)
2. pronoun-heavy notes
3. two people plus an ambiguous "he" (must stay unassigned or flagged)
4. a dependency across sentences
5. explicit, relative, and conditional deadlines
6. vague intentions vs. commitments
7. decisions vs. questions
8. problem reports with no action
9. a contradictory update
10. small talk only (no tasks)

**Expected-result format:**
- tasks with `match` (text that must appear in the predicted source phrase, normalized), `owner`, `owner_basis`, `deadline`, `deadline_type`, `blocked_by` (by expected task key), and `inferred`
- `open_questions` / `decisions` / `problems`, each matched by required text
- `must_stay_unassigned`: task keys whose owner must be null or flagged

**Matching:** expected-to-predicted, one-to-one, using normalized substring containment. No fuzzy matching.

**Metrics, reported separately per area:**

| Area | Metric | Initial target (to validate, not proven) |
|---|---|---|
| Task detection | precision / recall | ≥ 0.85 / ≥ 0.85 |
| Assignment | owner accuracy on matched tasks; ambiguous cases unassigned or flagged | ≥ 0.90; 100% |
| Deadline interpretation | exact wording match; `deadline_type` accuracy | ≥ 0.90; ≥ 0.85 |
| Dependency resolution | dependency precision / recall | ≥ 0.80 / ≥ 0.80 |
| Category classification | accuracy over task / question / decision / problem | ≥ 0.85 |
| Grounding | source phrases and evidence found in notes | ≥ 95% |
| Validity | replies valid within one retry | 100% |

**Hard safety gates (must be 0; a failure blocks Slice 7 approval):**
- **Fabricated values:** an owner or deadline that's neither inside its source or evidence quote nor flagged as inferred.
- **Unflagged inferences:** an inferred value without the "Inferred — confirm" flag or without evidence.
- **Dropped references:** an unresolved reference silently removed.

**Reporting:** the report shows per-case and per-area numbers, run-to-run spread across the 3 runs, and every gate violation with its quote. With 10 cases, the results show direction; they aren't statistically strong.

### Compatibility, cost, and risks
- **Compatibility:**
  - All earlier tests must pass unchanged.
  - The demo notes must still produce the dark-mode task.
  - Sample mode keeps working; an optional second sample may demonstrate inferences.
- **Cost:**
  - About 30 Gemini calls per full evaluation run, plus retries.
  - The longer prompt adds tokens and latency to every live call.
  - Free-tier rate limits may need a short pause between evaluation calls.
  - Pricing and limits must be checked before the first live evaluation.
- **Model:** start on `gemini-3.1-flash-lite`. Comparing a larger Flash model is a `GEMINI_MODEL` change and a learner decision, because of cost.
- **Risks:**
  - Inference weakening the core idea. Mitigation: evidence-or-null, flags, never "verified".
  - The prompt being tuned to the evaluation cases. Mitigation: separate examples.
  - Run-to-run variation. Mitigation: 3 runs.
  - The substring check proves evidence exists, not that the inference is correct, which is why inferences stay flagged for the user.
  - Time: Slice 7 may exceed the hackathon budget, so it's optional.

## Data Model

**AI output, validated by Pydantic (`Extraction`):**
```python
class ExtractedTask(BaseModel):
    id: str                       # e.g. "t1", used for blocked_by references
    title: str                    # min_length=1
    owner: str | None
    deadline: str | None          # exact wording from the notes ("by Friday", "next week"); never reworded or converted to a date
    deadline_ambiguous: bool = False
    source_phrase: str            # min_length=1
    blocked_by: list[str] = []    # task ids
    blocker_note: str | None = None   # a blocker that isn't a task

class OpenQuestion(BaseModel):
    text: str

class Extraction(BaseModel):
    tasks: list[ExtractedTask]
    open_questions: list[OpenQuestion]
```
**API response (`OrganizeResponse`):** `{ mode: "live" | "sample", tasks: [ExtractedTask + warnings: list[str]], open_questions }`. Unknown or self-referencing `blocked_by` ids are **kept** and get a "Needs verification" warning; the UI shows them as `Unknown task "<id>"` (changed in Slice 4; see `checklist.md > Revisions`).

**Frontend state (`src/types.ts`):**
```ts
type Origin = "ai" | "user";
interface Task {
  id: string; title: string; titleOrigin: Origin;   // "user" = User-edited
  owner: string | null; ownerOrigin: Origin;
  deadline: string | null; deadlineOrigin: Origin; deadlineAmbiguous: boolean;
  sourcePhrase: string | null;   // null allowed only for user-added
  blockedBy: string[]; blockerNote: string | null;
  origin: Origin;                // "user" = User-added
  warnings: string[];
}
interface Question { id: string; text: string; resolved: boolean; }
interface Plan { tasks: Task[]; questions: Question[]; mode: "live" | "sample"; }
```
**Where it lives:** in React state only. It updates through card, question, edit, delete, and add handlers (`src/plan.ts`; every update is immutable). Leaving or reloading the page loses it, which is intended (`prd.md > States and Boundaries`); re-running Organize Notes replaces all edits. The user-added id counter lives in a React ref for the session. The API key lives only in `backend/.env`.

## File Structure
```
C2C/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app: /api/organize, /api/health
│   │   ├── extract.py            # Gemini call, prompt, one retry, sample mode
│   │   ├── schemas.py            # Pydantic models (schema check)
│   │   ├── grounding.py          # normalization + grounding check
│   │   └── sample_response.json  # saved AI-style output for demo/notes.txt (labeled sample)
│   ├── tests/
│   │   ├── test_grounding.py     # matching rules: case, spaces, quotes pass; paraphrase fails
│   │   └── test_schemas.py       # bad/missing fields rejected; sample passes
│   ├── requirements.txt          # fastapi, uvicorn, google-genai, python-dotenv, pytest, httpx
│   └── .env.example              # GEMINI_API_KEY=, GEMINI_MODEL=
├── frontend/                     # Vite react-ts scaffold
│   ├── src/
│   │   ├── App.tsx               # state + two-column layout
│   │   ├── api.ts                # organize(notes) fetch wrapper
│   │   ├── types.ts              # Task, Question, Plan
│   │   ├── exportMarkdown.ts     # toMarkdown + download
│   │   ├── exportMarkdown.test.ts
│   │   ├── styles.css            # color variables + layout
│   │   └── components/
│   │       ├── NotesPanel.tsx
│   │       ├── ResultsPanel.tsx
│   │       ├── EmptyState.tsx
│   │       ├── TaskCard.tsx
│   │       ├── BlockersSection.tsx
│   │       └── OpenQuestions.tsx
│   └── vite.config.ts            # proxy /api → :8000
├── demo/
│   ├── notes.txt                 # realistic dev-team planning notes (the demo)
│   └── ambiguity-test.txt        # notes designed to trigger warnings/flags
├── devpost/                      # planning docs
├── .gitignore                    # already ignores .env, learner profile
└── README.md                     # what it is + run steps
```

## External Services and Dependencies
**Google Gemini API** (official Google Gen AI SDK, `google-genai`)
- Model: `GEMINI_MODEL` from `backend/.env`, default `gemini-3.1-flash-lite`.
- Call: `client.models.generate_content(model, contents=notes, config=GenerateContentConfig(system_instruction, response_mime_type="application/json", response_json_schema=Extraction.model_json_schema(), temperature=0))`.
- Response: `response.text` is a JSON string, validated by Pydantic into `Extraction`. The schema request makes valid output likely, but the reply is still validated: the schema check and the grounding check are what the app trusts.
- Auth: the `GEMINI_API_KEY` env var, read by the backend only.
- Cost and rate limits: free-tier limits apply and can change; check https://ai.google.dev/gemini-api/docs/rate-limits. A live smoke test hit a temporary `503 UNAVAILABLE` ("high demand") once; the error UI with Retry handles it.
- Docs: https://ai.google.dev/gemini-api/docs · https://ai.google.dev/gemini-api/docs/structured-output · https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite

**Key setup (non-blocking):** create a key at https://aistudio.google.com/apikey and put it into `backend/.env` as `GEMINI_API_KEY`. Never paste it in chat or commit it. Until then, sample mode works.

## Important Failure Modes
- **Gemini returns malformed or off-schema JSON** → one automatic retry → if it fails again, an error message with **Retry**; the notes are kept.
- **Network error, bad key, quota, or model overload (503)** → no automatic retry → 502 → the error UI shows the actual cause plus a matching hint (configuration vs. temporary vs. general; see `Backend: AI Extraction Service`) and a **Retry** button. The notes are kept.
- **Gemini paraphrases a source phrase or invents a deadline** → **no retry**; a `Needs verification` warning on the card, and the task stays visible.
- **No key set** → sample mode with a visible badge. Pasting non-demo notes in sample mode produces warnings, which is honest behavior.

## What Was Simplified and Why
- **Sample mode** instead of requiring a working key from the start. It removes the key as a blocker; grounding still runs, so the core idea isn't faked. Live mode is the real demo once the key works.
- **One endpoint, no database:** session-only state, per `prd.md > States and Boundaries`.
- **Whole-response failure** instead of rescuing partial results (learner's choice). It's simpler and never shows half-checked data. A fuller version would validate per item and keep the good ones.
- **Exact-substring grounding** with three normalizations instead of fuzzy matching (learner's choice). It's explainable and testable. Fuzzy matching would need thresholds and would blur "close enough" into "made up."
- **Display-only dependencies, no undo** (deferred in the PRD).

## Decisions and Open Issues
**Learner decisions:**
- React + TypeScript frontend and FastAPI backend: familiar tools, so the effort goes into validation.
- Google Gemini via the official `google-genai` SDK (switched from Qwen during Slice 3); the key lives in `backend/.env`, never in the frontend; the rest of the app must not be blocked on the key.
- Grounding matching rules: ignore capitalization, repeated whitespace, and straight/curly quotes; otherwise require a contiguous match; no paraphrases; unmatched → warning, not hidden; kept separate from the Pydantic schema check.
- Owners and deadlines are grounded against their task's source phrase (agreed recommendation).
- Malformed JSON or a schema failure gets one automatic retry, then fails the whole response (agreed recommendation; tradeoff: a single bad task discards a good response). Grounding failures never retry; they show as warnings (learner clarification).
- Deadlines are kept exactly as worded in the notes, including relative dates, and checked against the source phrase without conversion (learner clarification).

**Derived implementation details (agent):** Vite proxy; plain CSS; sample mode as the no-key path (proposed and agreed in principle); inline delete confirmation; edited owner/deadline clears that field's warning; user-added tasks aren't grounding-checked; `deadline_ambiguous` field for "genuinely ambiguous" stated deadlines.

**Learning unknown — how strict should "verified" be?** This came out of the learner's goal of validating AI output. It was clarified by learning that Qwen offers JSON mode but no schema enforcement, and by the learner defining exact-contiguous matching with three normalizations. **To check during the build:** `test_grounding.py` proves that case, whitespace, and curly-quote variants pass, and that a paraphrase, a missing word, or a reordered phrase fails. Then a live run on `demo/ambiguity-test.txt` shows how often real Qwen output trips the check.

**Open:** none blocking. Gemini model, JSON-schema output, and key setup were confirmed by a live smoke test in Slice 3. No open questions remain from `prd.md`.
