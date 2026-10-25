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

- [ ] **2. Unsupported extractions show "Needs verification" warnings**
  Becomes usable: Every task is checked against the notes using your matching rules. A source phrase that isn't a contiguous match (after ignoring case, extra spaces, and quote style), or an owner/deadline that isn't inside its source phrase, shows an amber "Needs verification" warning on the card. The task is never hidden.
  Why now: This is the unique kernel and your learning goal. It goes in as soon as there's a screen to show it on, before any live AI output exists to trust.
  PRD ref: `prd.md > Verification Warnings`, `prd.md > Task Cards`
  Spec ref: `spec.md > Backend: Grounding Check (`app/grounding.py`)`, `spec.md > Data Model`
  Build: `grounding.py` (`normalize` + the three rules + warnings; unknown `blocked_by` ids dropped with a warning), wired into `/api/organize` after the schema check. Warning display on `TaskCard`. `tests/test_grounding.py` covering case, whitespace, and curly quotes (pass) and paraphrase, missing word, reordering, and owner/deadline outside the phrase (fail). `demo/ambiguity-test.txt`, plus a sample-mode path that demonstrates warnings (for example, a second fixture or notes that differ from the sample).
  Verify (mechanical): `pytest backend/tests` passes. A `curl` with notes whose wording differs from the sample's source phrases returns tasks with the expected warnings, and with the original notes it returns no grounding warnings. The card renders the warning in the browser.
  Learner check: Organize the demo notes, then change a word inside one quoted phrase in the left box and organize again. The card for that phrase should show "Needs verification", and the task should still be there.
  Commit: `Add grounding check and verification warnings`

- [ ] **3. Live Qwen extraction with one retry and an error state**
  Becomes usable: With `DASHSCOPE_API_KEY` set in `backend/.env`, Organize Notes calls Qwen for real. Malformed or off-schema JSON gets exactly one automatic retry. If that fails too, or the network/key fails, the screen shows a red error with a **Retry** button, and the notes stay. Grounding failures never retry. Without a key, sample mode continues.
  Why now: Qwen's base URL, model name, and JSON-mode behavior are the riskiest unverified assumptions. They're tested now, before the editing and export work is built on top.
  PRD ref: `prd.md > Organizing Notes`, `prd.md > States and Boundaries` (AI failure)
  Spec ref: `spec.md > Backend: Qwen Extraction Service (`app/extract.py`)`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: In `extract.py`: the `openai` client with `QWEN_BASE_URL`/`QWEN_MODEL` defaults, the system prompt with the extraction rules, `json_object` mode, temperature 0, one retry for `JSONDecodeError`/`ValidationError` only, and 502 on a second failure (real reason logged). The `ResultsPanel` error state with Retry.
  Verify (mechanical): A pytest with a fake client proves bad JSON → retry → success, two bad replies → error, and that a grounding failure makes one call only. Without a key, `curl` still returns `mode: "sample"`. With a key, one smoke-test `curl` returns `mode: "live"` with valid tasks (or the reported error is traced to the key/region). Forcing a bad base URL shows the error and Retry in the browser.
  Learner check: Put your key in `backend/.env` and restart the backend, organize the demo notes, and compare the live cards to the notes. If the key isn't ready yet, stop the backend and click Organize Notes to see the error and Retry.
  Commit: `Add live Qwen extraction with single retry and error state`

- [ ] **4. Blockers & Dependencies and Open Questions sections**
  Becomes usable: Below the cards, a Blockers & Dependencies list shows "task ← blocked by" for every blocked task, and Open Questions lists unanswered questions with editable wording and a Resolve toggle. Notes with no tasks show "No actionable tasks found," with any questions still listed.
  Why now: These complete the "see the plan" half of the journey, so the edit and export slices work on the full plan shape.
  PRD ref: `prd.md > Blockers & Dependencies Section`, `prd.md > Open Questions Section`, `prd.md > States and Boundaries` (no actionable tasks)
  Spec ref: `spec.md > Frontend: BlockersSection (`src/components/BlockersSection.tsx`)`, `spec.md > Frontend: OpenQuestions (`src/components/OpenQuestions.tsx`)`, `spec.md > Frontend: ResultsPanel (`src/components/ResultsPanel.tsx`)`
  Build: `BlockersSection` (display-only), `OpenQuestions` (edit + resolve in React state), the zero-tasks message in `ResultsPanel`.
  Verify (mechanical): `npm run build` passes. In the browser: the blocked bug appears in the section, a question can be reworded and resolved (struck through), and a no-task response (sample or live casual chat) shows the message plus questions.
  Learner check: Organize the demo notes, find the blocked bug in both places, then resolve one open question and reword another.
  Commit: `Add blockers and open questions sections`

- [ ] **5. Edit, delete, and add tasks with user-provided labels**
  Becomes usable: Title, owner, and deadline are editable inline. Adding a deadline to "Deadline not specified" removes the amber flag and clarify prompt and shows "user-provided", and the source phrase stays. Editing an owner or deadline clears that field's warning. Delete asks for inline confirmation. **Add task** creates a "User-added" card with an optional source phrase.
  Why now: Editing depends on the full card and plan shape from slices 1–4, and it must exist before export so the export reflects edits.
  PRD ref: `prd.md > Editing Tasks`, `prd.md > Deleting Tasks`, `prd.md > Adding Tasks`
  Spec ref: `spec.md > Frontend: TaskCard (`src/components/TaskCard.tsx`)`, `spec.md > Data Model`
  Build: Inline inputs and origin tracking on `TaskCard`, update/delete/add handlers in `App.tsx`, the inline "Delete this task? Yes / No", and the Add task button in the results toolbar.
  Verify (mechanical): `npm run build` passes. In the browser: adding a date to the "finish this soon" card removes the flag and shows user-provided while keeping the source phrase; the delete confirmation removes a card; Add task shows the User-added pill.
  Learner check: Give the "let's finish this soon" task a deadline and an owner, delete one task, and add one the AI missed.
  Commit: `Add inline task editing, delete confirmation, and add task`

- [ ] **6. Export the edited plan as Markdown**
  Becomes usable: **Export** downloads `action-plan.md`: a task checklist with owner, deadline, and source phrase, then Blockers & Dependencies, then Open Questions, with every label and warning. It reflects the current edits and adds nothing else.
  Why now: Export is the end of the journey and reads the plan that slices 1–5 shaped.
  PRD ref: `prd.md > Exporting the Checklist`
  Spec ref: `spec.md > Frontend: Markdown Export (`src/exportMarkdown.ts`)`
  Build: The pure `toMarkdown(plan)` plus a Blob download, the Export button, and `exportMarkdown.test.ts` (vitest).
  Verify (mechanical): `npx vitest run` passes: labels (Unassigned, Deadline not specified, User-added, user-provided, warnings), sections, resolved questions as `[x]`, and edits reflected. `npm run build` passes. Clicking Export in the browser produces the file.
  Learner check: Edit a task, click Export, and open `action-plan.md`. Does it match the screen, and is it something you'd actually use?
  Commit: `Add Markdown export of the edited plan`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (cards + verification warnings visible; feedback can still shape live extraction, editing, and export)
- [ ] Final end-to-end check (learner-requested): organize the demo notes → verification warnings visible → edit a task (deadline/owner) → export Markdown matches the screen → error/Retry case (backend stopped or bad key) recovers without losing the notes
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

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
