---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn (learner asked to have each slice explained and to test it themselves before the next)

## Slices

- [x] **1. Paste notes, click Organize Notes, and see task cards (sample mode)**
  Becomes usable: Both apps run locally. Pasting `demo/notes.txt` and clicking Organize Notes shows task cards with title, owner or "Unassigned", deadline exactly as worded or "Deadline not specified" + clarify prompt, source phrase, and blocked status, next to the notes. Empty notes show "Paste notes first." A "Sample mode" badge shows that no AI call was made.
  Why now: Proves the whole path end to end (React → FastAPI → Pydantic → screen) before any AI risk enters. Bootstrapping and the Look and Feel styles live here, so every later slice has somewhere to land.
  PRD ref: `prd.md > The Core Journey` (steps 1–3), `prd.md > Screens and Layout`, `prd.md > Organizing Notes`, `prd.md > Task Cards`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > File Structure`, `spec.md > Data Model`, `spec.md > Backend: Organize Endpoint`, `spec.md > Backend: Schemas (`app/schemas.py`) — Schema Check`, `spec.md > Frontend: App Shell (`src/App.tsx`)`, `spec.md > Frontend: NotesPanel (`src/components/NotesPanel.tsx`)`, `spec.md > Frontend: ResultsPanel (`src/components/ResultsPanel.tsx`)`, `spec.md > Frontend: TaskCard (`src/components/TaskCard.tsx`)`, `spec.md > Look and Feel`
  Build: Create the `backend/` Python 3.13 environment (`uv`), with `requirements.txt` and `.env.example`; FastAPI `/api/organize` and `/api/health`; Pydantic models; sample mode loading `sample_response.json`. Write `demo/notes.txt` (a realistic dev-team planning meeting with owners and dates, a blocked bug, an unanswered question, and "let's finish this soon"). Scaffold the Vite react-ts `frontend/` with the `/api` proxy, `types.ts`, `api.ts`, `App.tsx`, `NotesPanel`, `ResultsPanel` (EmptyState, loading, results), read-only `TaskCard`, and `styles.css` color variables. Add `README.md` run steps.
  Verify (mechanical): `pytest backend/tests/test_schemas.py` passes (the sample validates; missing fields and empty titles are rejected). With both servers running, `curl -X POST localhost:5173/api/organize` with the demo notes returns `mode: "sample"` and tasks. An empty body returns 400. `npm run build` type-checks cleanly. The rendered page shows the cards, the empty state, and the "Paste notes first" message (checked in the browser).
  Learner check: Start both servers (README), open http://localhost:5173, paste `demo/notes.txt`, click Organize Notes, and look at the "let's finish this soon" card. Then clear the box and click again. Does the layout feel like the calm workspace you described?
  Commit: `Add notes-to-task-cards flow with sample mode and schema check`

- [x] **2. Unsupported extractions show "Needs verification" warnings**
  Becomes usable: Every task is checked against the notes using your matching rules. A source phrase that isn't a contiguous match (after ignoring case, extra spaces, and quote style), or an owner/deadline that isn't inside its source phrase, shows an amber "Needs verification" warning on the card. The task is never hidden.
  Why now: This is the unique kernel and your learning goal. It goes in as soon as there's a screen to show it on, before any live AI output exists to trust.
  PRD ref: `prd.md > Verification Warnings`, `prd.md > Task Cards`
  Spec ref: `spec.md > Backend: Grounding Check (`app/grounding.py`)`, `spec.md > Data Model`
  Build: `grounding.py` (`normalize` + the three rules + warnings; unknown `blocked_by` ids dropped with a warning), wired into `/api/organize` after the schema check. Warning display on `TaskCard`. `tests/test_grounding.py` covering case, whitespace, and curly quotes (pass) and paraphrase, missing word, reordering, and owner/deadline outside the phrase (fail). `demo/ambiguity-test.txt`, plus a sample-mode path that demonstrates warnings (for example, a second fixture or notes that differ from the sample).
  Verify (mechanical): `pytest backend/tests` passes. A `curl` with notes whose wording differs from the sample's source phrases returns tasks with the expected warnings, and with the original notes it returns no grounding warnings. The card renders the warning in the browser.
  Learner check: Organize the demo notes, then change a word inside one quoted phrase in the left box and organize again. The card for that phrase should show "Needs verification", and the task should still be there.
  Commit: `Add grounding check and verification warnings`

- [x] **3. Live Gemini extraction with one retry and an error state**
  Becomes usable: With `GEMINI_API_KEY` set in `backend/.env`, Organize Notes calls Gemini for real. Malformed or off-schema JSON gets exactly one automatic retry. If that fails too, or the network/key/model fails, the screen shows a red error with a **Retry** button, and the notes stay. Grounding failures never retry. Without a key, sample mode continues.
  Why now: The live AI's real output is the riskiest unverified assumption. It's tested now, before the editing and export work is built on top.
  PRD ref: `prd.md > Organizing Notes`, `prd.md > States and Boundaries` (AI failure)
  Spec ref: `spec.md > Backend: AI Extraction Service (`app/extract.py`)`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: In `extract.py`: the official `google-genai` client (server-side key), `GEMINI_MODEL` with default `gemini-3.1-flash-lite`, the system prompt with the extraction rules, JSON output with our schema, temperature 0, one retry for malformed JSON/`ValidationError` only, and `ExtractionError` → 502 with the real reason logged. The `ResultsPanel` error state with Retry.
  Verify (mechanical): A pytest with a fake client proves bad JSON → retry → success, two bad replies → error, and that a grounding failure makes one call only. Without a key, `curl` still returns `mode: "sample"`. With a key, one smoke-test `curl` returns `mode: "live"` with valid tasks (or the reported error is traced to the key/region). Forcing a bad base URL shows the error and Retry in the browser.
  Learner check: Put your key in `backend/.env` and restart the backend, organize the demo notes, and compare the live cards to the notes. If the key isn't ready yet, stop the backend and click Organize Notes to see the error and Retry.
  Commit: `Add live Gemini extraction with single retry and error state`

- [x] **4. Blockers & Dependencies and Open Questions sections**
  Becomes usable: Below the cards, a Blockers & Dependencies list shows "task ← blocked by" for every blocked task, and Open Questions lists unanswered questions with editable wording and a Resolve toggle. Notes with no tasks show "No actionable tasks found," with any questions still listed.
  Why now: These complete the "see the plan" half of the journey, so the edit and export slices work on the full plan shape.
  PRD ref: `prd.md > Blockers & Dependencies Section`, `prd.md > Open Questions Section`, `prd.md > States and Boundaries` (no actionable tasks)
  Spec ref: `spec.md > Frontend: BlockersSection (`src/components/BlockersSection.tsx`)`, `spec.md > Frontend: OpenQuestions (`src/components/OpenQuestions.tsx`)`, `spec.md > Frontend: ResultsPanel (`src/components/ResultsPanel.tsx`)`
  Build: `BlockersSection` (display-only), `OpenQuestions` (edit + resolve in React state), the zero-tasks message in `ResultsPanel`.
  Verify (mechanical): `npm run build` passes. In the browser: the blocked bug appears in the section, a question can be reworded and resolved (struck through), and a no-task response (sample or live casual chat) shows the message plus questions.
  Learner check: Organize the demo notes, find the blocked bug in both places, then resolve one open question and reword another.
  Commit: `Add blockers and open questions sections`

- [x] **5. Edit, delete, and add tasks with user-provided labels**
  Becomes usable: **Edit** on a card makes its title, owner, and deadline editable on the card (Save / Cancel; a blank title is rejected). Adding a deadline to "Deadline not specified" removes the amber flag and clarify prompt and shows **User-provided**, and the source phrase stays. A changed title shows **User-edited**. Clearing an owner or deadline brings back Unassigned / Deadline not specified. Editing an owner or deadline clears only that field's warning. **Delete** asks for inline confirmation; references to a deleted task stay visible as `⚠ Unknown task "<id>"`. **+ Add task** creates a **User-added** card (`u1`, `u2`, … never reused) with an optional, clearly unverified source phrase.
  Why now: Editing depends on the full card and plan shape from slices 1–4, and it must exist before export so the export reflects edits.
  PRD ref: `prd.md > Editing Tasks`, `prd.md > Deleting Tasks`, `prd.md > Adding Tasks`
  Spec ref: `spec.md > Frontend: TaskCard (`src/components/TaskCard.tsx`)`, `spec.md > Data Model`
  Build: `editTask` / `deleteTask` / `addTask` / `nextUserTaskId` / `titleError` in `src/plan.ts`; `titleOrigin` on `Task`; Edit mode, inline delete confirmation, and provenance badges on `TaskCard` (shared `TaskForm`); the + Add task button and form in `ResultsPanel`; handlers and the id counter in `App.tsx`; tests in `plan.test.ts`.
  Verify (mechanical): `npm test` (vitest) and `pytest` pass, and `npm run build` passes. In the browser: adding a date to the "finish this soon" card removes the flag and shows User-provided while keeping the source phrase; clearing the owner brings back Unassigned; a blank title is blocked; the delete confirmation removes a card and a dependent task then shows `⚠ Unknown task`; Add task shows the User-added pill.
  Learner check: Give the "let's finish this soon" task a deadline and an owner, delete one task, and add one the AI missed.
  Commit: `Add inline task editing, delete confirmation, and add task`

- [x] **6. Export the edited plan as Markdown**
  Becomes usable: **Export Markdown** downloads `action-plan.md` with the plan exactly as it currently exists:
  - edited, user-added, and (absent) deleted tasks
  - owner, deadline, source, warnings, and what each task is blocked by
  - the Blockers & Dependencies section, including `⚠ Unknown task` and `⚠ Self-dependency`
  - Open Questions with their resolved state
  - every label and badge (Unassigned, Deadline not specified, User-added, User-edited, User-provided, Needs verification)

  It adds and changes nothing.
  Why now: Export is the end of the journey and reads the plan that Slices 1–5 shaped. It finishes the demo before the optional Slice 7.
  PRD ref: `prd.md > Exporting the Checklist`
  Spec ref: `spec.md > Frontend: Markdown Export (`src/exportMarkdown.ts`)`
  Build: `src/exportMarkdown.ts` (pure `toMarkdown(plan)` reusing `dependenciesOf` / `blockerRows`, Markdown escaping, and `downloadMarkdown`); the **Export Markdown** button in the `ResultsPanel` toolbar; `src/exportMarkdown.test.ts`.
  Verify (mechanical):
  - `npm test` (vitest) passes, covering:
    - each label and badge
    - each source label
    - warnings
    - unknown and self dependencies after a delete
    - resolved questions as `[x]`
    - edited, added, and deleted tasks reflected
    - empty sections
    - the sample-mode line
    - escaping of `* _ [ ] < > \` and newlines
    - that the plan isn't mutated
    - that nothing is written that isn't in the plan
  - `pytest` passes, and `npm run build` passes.
  - In the browser: export after edits, open the file, and compare it with the screen.
  Learner check: Edit a task, add one, delete one, resolve a question, click **Export Markdown**, and open `action-plan.md`. Does it match the screen exactly, and is it something you'd actually use?
  Commit: `feat: add Markdown export of the edited plan`

- [ ] **7. (Optional stretch) Contextual extraction with flagged, evidence-backed inference, plus evaluation**
  Becomes usable:
  - Messy multi-sentence notes yield implied tasks, owners resolved through pronouns or context, cross-sentence dependencies, and typed deadlines (explicit, relative, conditional, vague), each inferred item with an evidence quote and an **Inferred — confirm** badge.
  - Ambiguous owners stay Unassigned or flagged.
  - Decisions and Problems appear in their own minimal sections; Open Questions stays separate, and problems aren't blockers automatically.
  - A fixed 10-case evaluation reports per-area metrics and hard safety gates.
  Why now: Only after Slice 6 is approved. It's a stretch beyond the PoC boundary, chosen by the learner, and can stop at any point without affecting Slices 1–6.
  PRD ref: `prd.md > Contextual Extraction (Slice 7, optional stretch)`
  Spec ref: `spec.md > Planned: Contextual Extraction and Evaluation (Slice 7, optional)`
  Build:
  - Optional schema fields and `decisions` / `problems`, prompt rules plus examples that aren't taken from the evaluation, and grounding of evidence with an `inferences` flag list.
  - UI badge, evidence quote, deadline-kind chip, and the Decisions and Problems sections; export extended to cover them.
  - `backend/eval/` cases, scorer, `--live` / `--replay` runner, and report; scorer tests.
  - Detailed slicing to be planned and approved when Slice 7 starts.
  Verify (mechanical):
  - All earlier tests pass unchanged, plus new grounding, schema, scorer, and export tests.
  - The evaluation hard gates are 0: fabricated values, unflagged inferences, dropped references.
  - Per-area metrics are reported against the initial targets, which are targets to validate, not pass/fail claims of proven accuracy.
  - The demo still shows the dark-mode task, and sample mode still works.
  Learner check: Paste the pronoun-heavy and ambiguous-"he" evaluation notes. Do inferred items show their evidence and "Inferred — confirm", and does the ambiguous one stay unassigned? Read `report.md`: which areas meet the initial targets?
  Commit: decided at Slice 7 planning (one commit per sub-slice).

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2 (cards + verification warnings visible; feedback can still shape live extraction, editing, and export). Learner tested Slice 2 and refined the grounding rules: kept strict substring matching and documented its limits.
- [x] Final end-to-end check (learner-requested): organize the demo notes → verification warnings visible → edit a task (deadline/owner) → export Markdown matches the screen → error/Retry case (backend stopped or bad key) recovers without losing the notes. Learner ran it as part of the 6-section review below: all passed.
- [x] Final kick-the-tires exploration and feedback completed. Learner ran the 6-section end-to-end review after Slice 6: (1) sample mode, (2) live Gemini + error/Retry, (3) grounding warnings and missing owner/deadline, (4) dependencies, blockers, and open questions, (5) edit/add/delete, (6) Markdown export after edits. **All six passed, no issues found.**

## Final Review

Result: 6/6 review sections passed; no fixes or refinements requested, so no revision tasks were needed. Slices 1–6 committed and pushed (`5359103` … `81a26c0`).

- [x] Final review complete — feedback resolved and learner confirms ready to ship (learner confirmed: "it's ready to ship")

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- Backend uses Python 3.12 instead of 3.13: on this machine, `uv`'s Python 3.13 build is blocked from running by Windows (exit 0xc0e90002, consistent with Smart App Control). 3.12 is within the spec's allowed 3.12/3.13 range.
- Frontend uses React 19 instead of React 18: the current Vite react-ts template ships React 19, and nothing in the spec depends on 18.
- The "Blocked" pill uses a neutral outline instead of a colored fill, because `spec.md > Look and Feel` reserves red for errors.
- Re-applied the approved spec corrections (deadline wording, retry rule, Python version) to `spec.md`: an earlier write had updated only `spec.html`. Found during slice 1.
- Documented the limitation of grounding's strict substring matching: `Friday`/`Fri` verify inside "by Friday" and `Mi` inside "Mia". Found while verifying Slice 2 against the learner's expectations. The learner chose to keep the approved spec's plain substring rule (no whole-word or lead-in-word rules) and record the limitation; see `spec.md > Backend: Grounding Check`.
- Switched the AI provider from Qwen (Alibaba Cloud Model Studio) to Google Gemini via the official `google-genai` SDK, at the learner's request before Slice 3. `GEMINI_API_KEY`/`GEMINI_MODEL` replace the DashScope/Qwen variables; the schema check, single-retry rule, sample mode, and grounding check are unchanged. Gemini takes a JSON schema directly, but the reply is still validated by Pydantic.
- Unresolved dependency ids are now kept and shown with a warning, instead of being dropped: the learner asked for unknown `blocked_by` ids to stay visible (Slice 4). `grounding.py` no longer removes them; the spec's data model was updated.
- Added vitest in Slice 4 instead of Slice 6, to give the Slice 4 section logic (`src/plan.ts`) regression tests.
- Task editing uses an **Edit** button that turns the card's fields into inputs (Save / Cancel), instead of always-visible inline inputs: it keeps the calm card layout and avoids accidental edits. Still on the card, same page (Slice 5).
- Added a **User-edited** badge for changed titles (`titleOrigin` on `Task`), and badges are written as `User-added` / `User-edited` / `User-provided`. The learner chose automatic provenance badges only, no free-form tags (Slice 5).
- A user-entered source phrase on an added task is labeled "Source you entered — not checked against the notes", so a user value is never presented as verified against the notes (learner requirement, Slice 5).
- User-added task ids are `u1`, `u2`, … from a never-decreasing counter that also skips ids still referenced by dependencies, so a deleted task's dangling reference can't attach to a new task (Slice 5).
- Slice 6 expanded in planning to export the plan *exactly as it currently exists*, including Slice 5's badges (User-added, User-edited, User-provided), honest source labels, and the Slice 4 unknown/self dependency references. The export format is now pinned in `spec.md > Frontend: Markdown Export` (before Slice 6).
- PRD non-goal changed before Slice 6, at the learner's request: **evidence-backed, explicitly flagged** inference is allowed (implied tasks, pronoun or contextual owners); unsupported or unflagged inference is still forbidden. It takes effect only in the optional Slice 7.
- Added an optional **Slice 7** (contextual extraction, Decisions and Problems sections, and a fixed 10-case evaluation with hard safety gates and initial per-area targets), split out of the requested Slice 6 expansion to keep the PoC shippable first. Starts only after Slice 6 is approved.
- Redesigned the frontend after Slice 6 from the learner's reference (desktop `Main.dc.html` and the mobile PDF): black and white with orange `#FF5A1F` and lime `#D9F95C`, Instrument Sans, and a three-column layout (notes + clarity | tasks | deadlines) with tablet and mobile layouts. `ResultsPanel` / `TaskCard` / `EmptyState` were replaced by `Header`, `ClarityStats`, `TasksPanel`, `TaskRow`, `TaskForm`, `DeadlinesRail`, `HelpDialog`, and `Toast`, plus the read-only helpers in `view.ts`. Behavior, API contract, backend, export format, and the task model are unchanged. Reference elements that conflict with the product rules were not adopted (guessed or calendar dates, priority, completion checkboxes, History, Board view, "Ask: <name>"). Added search (filters the screen only), a Help panel, Copy Markdown with a toast that reports the real clipboard result, and the selected task's source highlighted in the notes.
