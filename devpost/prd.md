---
doc: prd
status: approved
---

# Chaos to Clarity — Product Requirements

A one-screen web app for a developer or project lead on a small software team. It turns messy planning-meeting notes into an editable, verifiable action plan and never makes up owners, deadlines, or decisions.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. The user opens the app and sees one screen: a notes box on the left, and on the right an empty state explaining what will appear there.
2. They paste messy meeting notes and click **Organize Notes**.
3. The right side fills with task cards. Each card shows a title, owner, deadline, source phrase, and any blocked status. Below the cards are **Blockers & Dependencies** and **Open Questions** sections. The original notes stay visible on the left.
4. The user checks each card against its source phrase. Missing information is clearly labeled, never guessed.
5. They fix what's wrong: edit a title, owner, or deadline; resolve or reword a question; delete a wrong task; add one the AI missed.
6. They click export and download a Markdown checklist of the **current, edited** plan.

Success: a judge can match each task to its source phrase, see that nothing missing was made up, and download a usable checklist.

## Screens and Layout
One screen (redesigned after Slice 6 from the learner's reference: desktop `Main.dc.html` and the mobile PDF "Mobile — organized plan"):
- **Header:** the C→C mark and "Chaos to Clarity", the **Sample mode · no AI call** badge when relevant, **Search tasks** (filters what's shown by title, source phrase, or owner; it never changes the plan or the export), **Export**, **Copy Markdown**, and a **Help (?)** panel explaining every label.
- **Left column:**
  - **Your notes**: a text box, then after Organize a read-only view where the selected task's source phrase is highlighted (only when it's really in the notes). Includes **Edit notes**, a character count, **Try sample notes**, and **Organize notes →**.
  - **Clarity**: % of tasks with an owner, % with a deadline, open questions, and a per-task completeness bar (owner + deadline + source found in notes).
- **Middle column:**
  - **Tasks for this meeting**, with **+ Add task** and count chips (#tasks / #questions / #blockers) that jump to each section.
  - One row per task: title, source quote, owner initial or **Unassigned**, deadline as written or **No date**, and **⋯** (Edit / Delete). Below each row: provenance, warnings, and Blocked-by chips. Edit and Add use an inline panel.
  - Then **Open questions** (Resolve / Reopen, a collapsible "Resolved (N)") and **Blockers**.
- **Right column: Deadlines.** Tasks grouped by their **exact deadline wording** ("by Friday"), plus **No date (N)** with **Set dates →**, which opens editing for the first undated task. Never calendar dates or guesses.
- **Responsive:** three columns from 1200px; two columns with Deadlines below from 768px; one column on mobile (menu button with search, Export, Copy, Help; 3-up stats; sideways-scrolling deadlines; stacked task rows).

Nothing navigates away from this screen.

## Look and Feel
Source of truth: the learner's reference designs (desktop HTML and mobile PDF), adopted after Slice 6. They replace the earlier warm off-white and teal direction.
- **Colors:** black and white (`#0B0B0B` ink on `#FFFFFF`, greys `#3A3A3A` / `#737373` / `#E9E9E9` / `#F1F1F1`), **orange `#FF5A1F`** for missing information and attention (Unassigned, No date, Needs verification, unknown dependencies, errors), and **lime `#D9F95C`** for highlights (deadlines as written, the selected task's source highlighted in the notes, open-question count).
- **Typography:** Instrument Sans (Google Fonts), 24px/600 section titles, 17px subsection titles, 14px body, 13px meta.
- **Layout:** full-height white page with 1px `#E9E9E9` dividers, 32px padding, 8px radius, compact 52px task rows, small chips.
- **Motion:** rows fade in quickly; loading uses skeleton rows; all motion respects reduced-motion.
- **Trust labels stay visible:** Needs verification, Quote not found in notes, Unassigned, No date (deadline not specified), User-added, User-edited, User-provided owner/deadline, Unknown task, and Sample mode.
- **Not adopted from the reference** (conflicts with the product rules or out of scope): guessed or calendar-converted dates ("Oct 27 · guessed"), priority, completion checkboxes, History, Board view, and "Ask: <name>" on questions.

## Features and Behavior

### Organizing Notes
Source: `scope.md > The POC Boundary`.
- Clicking **Organize Notes** sends the notes for one AI extraction. It produces tasks, blockers/dependencies, and open questions.
- While it runs, the user can see that work is in progress.
- [ ] Pasting the demo notes and clicking Organize Notes shows task cards, a Blockers & Dependencies section, and an Open Questions section, with the notes still visible on the left.

### Task Cards
Each card shows, in this order:
1. **Task title:** a clear, concise action.
2. **Owner:** the name only if explicitly stated; otherwise **"Unassigned."**
3. **Deadline:** the deadline only if explicitly stated; otherwise **"Deadline not specified"** with a prompt to clarify. Relative deadlines ("by Friday," "next week") count as stated and are shown **exactly as written**, never converted to calendar dates (the meeting date and timezone are unknown). Wording that's genuinely ambiguous is flagged for clarification, not guessed.
4. **Source phrase:** the exact original wording from the notes that supports the task.
5. **Dependencies/blockers:** shown when the task depends on another, with a clear blocked status.

- [ ] Every AI-extracted card shows a source phrase.
- [ ] "Let's finish this soon" becomes a task showing that phrase, "Deadline not specified" in amber, and a clarify prompt.
- [ ] A task with no named owner shows "Unassigned."
- [ ] A task due "by Friday" shows the deadline "by Friday" exactly, with no calendar date.
- [ ] The blocked bug's card shows a blocked status naming what it depends on.

### Verification Warnings
Source: `scope.md > The Unique Kernel`.
- If the AI returns a task whose source phrase doesn't appear in the notes, or a deadline that isn't in its source text, the task is **still shown, with a visible warning** so the user can verify it. Nothing is silently hidden or silently trusted.
- [ ] A task with an unsupported source phrase or deadline shows a verification warning label.

### Blockers & Dependencies Section
- Lists every blocker/dependency found, below the task cards, so unresolved issues are easy to spot.
- [ ] The demo's blocked bug appears in this section as well as on its card.

### Open Questions Section
- Lists unanswered questions and unclear decisions, keeping what is unknown rather than inventing answers.
- The user can edit a question's wording or mark it resolved. The app never fills in an answer.
- [ ] The demo's unanswered question appears here with no made-up answer.
- [ ] Marking a question resolved visibly changes its state.

### Editing Tasks
- Title, owner, and deadline are editable directly on the card, without leaving the page.
- Entering a deadline on a "Deadline not specified" task removes the amber flag and the clarify prompt. The date is marked **user-provided**, not AI-extracted, and the original source phrase stays visible.
- Assigning an owner to an "Unassigned" task works the same way: the value is marked user-provided.
- [ ] After adding a date to the "finish this soon" task, the flag disappears, the date shows as user-provided, and the source phrase is still there.

### Deleting Tasks
- Each card can be deleted after a simple confirmation. There is no undo.
- [ ] Deleting asks for confirmation, then removes the card.

### Adding Tasks
- An **Add task** button creates a new card, clearly labeled **"User-added."** The user can enter a source phrase if one exists, but doesn't have to.
- [ ] A manually added task shows the "User-added" label.

### Exporting the Checklist
Source: `scope.md > What "Working" Looks Like`. Built in **Slice 6**.
- **Export Markdown** downloads `action-plan.md` containing the plan **exactly as it currently exists on screen**, after all saved edits. That means:
  - AI-extracted tasks as edited, tasks you added, and **no** deleted tasks.
  - Each task as a checklist item (`- [ ]`) with owner, deadline, source phrase, verification warnings, and what it's blocked by.
  - **Blockers & Dependencies**, including `⚠ Unknown task "<id>"` and `⚠ Self-dependency` references, which are kept, never dropped.
  - **Open Questions** with their resolved state (`[x] … (Resolved)`).
- **Every label carries over:** "Unassigned", "Deadline not specified" (with the clarify note), the "wording unclear" note for ambiguous deadlines, the provenance badges **User-added**, **User-edited**, and **User-provided**, and every "Needs verification" warning.
- **Source labels stay honest:** "from your notes" (grounded), "quoted by AI, not found in your notes" (failed grounding), or "entered by you, not checked against the notes" (user-added).
- **Export never adds or changes facts:** no invented owners, dates, or answers, no reordering, and no edits to the plan. Only saved values are exported; an Edit form that's still open isn't included. In sample mode, the file says so in one line.
- [ ] After editing a task, the exported file reflects the edit and its badge.
- [ ] A deleted task is absent; a task that depended on it exports `⚠ Unknown task "<id>"`.
- [ ] A user-added task exports with "User-added" and its unverified-source label.
- [ ] The "finish this soon" task exports with "Unassigned" and "Deadline not specified"; a warned task exports with its warning; a resolved question exports as `[x]`.
- [ ] The file opens as readable Markdown with Tasks, Blockers & Dependencies, and Open Questions sections.

### Contextual Extraction (Slice 7, optional stretch)
Source: learner decision after Slice 5. Only started after Slice 6 is approved; it can be stopped at any point without affecting Slices 1–6.

**Goal:** better understanding of messy, multi-sentence notes: implied actions, owners referred to by pronouns or context, dependencies across sentences, different kinds of deadlines, and separating tasks, problems, decisions, and open questions. The core promise doesn't change: **nothing is presented as verified unless it is.**

**Evidence requirements (every inference):**
- An inferred task, or an inferred owner, deadline, or dependency, must carry an **evidence quote**: verbatim text from the notes that supports it.
- The evidence must pass the same grounding check as source phrases. Evidence that can't be found in the notes gets a "Needs verification" warning.
- Every inferred item shows an amber **"Inferred — confirm"** badge with its evidence quote next to it. Inferred values are **never** labeled "from your notes" or shown as verified.
- **Explicit** values follow today's rules unchanged (owner and deadline inside the task's source phrase).

**Ambiguity handling:**
- If a pronoun or context could point to more than one person (e.g. two people, then "he"), the owner stays **Unassigned**, with a "who is responsible?" clarify note. No guessing.
- **Deadline kinds:** `explicit date` ("Oct 30"), `relative` ("by Friday"), `conditional` ("after QA signs off"), and `vague` ("soon"). A vague intention has **no deadline** (shown as "Deadline not specified"). Conditional and relative wording is kept exactly as written and never converted.
- **Contradictory updates** ("Friday — actually Monday") use the latest stated value, with an "Inferred — confirm" badge and both quotes as evidence.
- **References that can't be resolved** stay visible and flagged (as in Slice 4); they're never silently dropped.

**Categories (kept separate):**
- **Tasks:** commitments to act, including vague-timing ones.
- **Open Questions:** genuinely unresolved questions or decisions. These stay separate, as today.
- **Decisions:** things the group agreed ("we'll ship without SSO"). Each has a source phrase.
- **Problems:** reported issues with no agreed action ("CI is flaky"). Each has a source phrase. A problem is **not** a blocker unless the notes say it blocks a task.

**Interface:** minimal. Two small sections, **Decisions** and **Problems**, below Open Questions, plus the "Inferred — confirm" badge and a small deadline-kind chip on cards. Export includes the new sections and badges.

**Acceptance:**
- [ ] Inferred items always show "Inferred — confirm" plus evidence; no inferred value appears as verified.
- [ ] The ambiguous-"he" case stays Unassigned or flagged.
- [ ] Problems and decisions appear in their own sections; problems never become blockers automatically.
- [ ] The existing demo, sample mode, and all earlier tests keep working unchanged (backward compatible).
- [ ] The fixed evaluation dataset passes the **hard safety gates**, and the results for the **initial targets** are reported per area (see `spec.md > Planned: Contextual Extraction and Evaluation`). The targets are starting points to validate, not claims of proven accuracy.

## States and Boundaries
- **First use / empty state:** the right side explains what will appear (tasks, blockers, open questions) after organizing.
- **Empty notes:** clicking Organize Notes with nothing pasted shows a clear message asking the user to paste notes first. No AI call is made.
- **No actionable tasks:** if the notes contain no tasks, a clear message says no actionable tasks were found. Any open questions found still appear.
- **AI failure or unusable result:** a clear error message (restrained red) with a way to retry. The pasted notes are kept.
- **Unsupported extraction:** shown with a verification warning (see Verification Warnings).
- **Persistence:** none. Everything lives in the current session. Reloading the page clears it.

## Product Decisions
- One screen, notes left and results right: users verify each task against its source without switching views.
- Blockers appear both on the card and in their own section, so unresolved issues are easy to spot.
- Missing owner/deadline → "Unassigned" / "Deadline not specified," never guessed.
- Unsupported AI output → show it with a warning rather than hiding it or rejecting everything, so the user verifies it.
- User edits are marked with automatic provenance badges, keeping extracted and user-supplied information distinct: **User-added** (task you created), **User-edited** (title you changed), **User-provided** (owner or deadline you entered or changed). No free-form tags (Slice 5 decision).
- Delete with a simple confirmation; undo deferred.
- Add task kept: users can include actions the AI missed.
- Relative deadlines are kept as written, not converted: this avoids guessing the meeting date or timezone. Genuinely ambiguous wording is flagged.
- Export reflects the edited plan as it currently exists (added, edited, and deleted tasks included as they are) and includes the full plan (tasks, blockers, open questions) with all labels, badges, and warnings, adding nothing new.
- **Evidence-backed inference is allowed, but always flagged** (decision before Slice 6): the app may infer implied tasks and resolve pronoun or contextual assignments only when the notes support it. Every inferred task or field carries an evidence quote and an "Inferred — confirm" badge; ambiguous assignments stay unassigned or flagged; inferred information is never presented as verified.
- **Work split:** Slice 6 = Markdown export, finished and verified first. Slice 7 = optional stretch for contextual extraction and evaluation, started only after Slice 6 is approved.
- **Redesign after Slice 6 (learner's reference):** adopted the black-and-white design with orange and lime. Deadlines are grouped by exact wording (no guessed or converted dates). Priority, completion checkboxes, History, Board view, and "Ask: <name>" were dropped. Search filters only what's shown. Help explains every label. Copy Markdown uses the same export as Export, with a toast that reports the real clipboard result.
- **Slice 7 sections:** Open Questions stays separate; Decisions and Problems get their own minimal sections; problem reports are not treated as blockers automatically.

## What We're Building
The single-screen workflow above: paste → Organize Notes → task cards (with source phrase, owner/deadline or explicit gaps, blocked status) plus Blockers & Dependencies and Open Questions sections → verification warnings → edit title/owner/deadline, resolve/edit questions, delete with confirmation, add task → export the edited plan as a Markdown checklist. Includes the empty, no-tasks, and error states, one realistic demo note set, and an ambiguity test.

## Deferred From the POC
- **Editing dependencies/blockers:** not needed to show reliability in the demo; extracted dependencies are display-only for now.
- **Undo for delete:** the confirmation is enough for a PoC.
- **Saved history / persistence:** the session-only plan is enough to prove the loop (`scope.md > Later`).
- **User accounts, external integrations, collaboration, deployment:** excluded from the PoC (`scope.md > Later`).

## Possible Later Enhancements
- Dependency editing and undo.
- Larger evaluation datasets and model comparisons beyond the fixed Slice 7 set.
- Saved history of past meetings, and integrations that send tasks to existing tools.

## Non-Goals
- Inventing missing owners, deadlines, or answers, or presenting an inference as fact: that would contradict the core idea. (Changed before Slice 6: **evidence-backed, flagged** inference is allowed in Slice 7; unsupported or unflagged inference is not. See `Contextual Extraction`.)
- Multiple demo scenarios: one excellent end-to-end experience instead (`scope.md > Explicitly Cut`).
- Decorative effects that compete with readability.

## Open Questions
None blocking `4-spec`. Relative dates and export contents were resolved (see Product Decisions).
