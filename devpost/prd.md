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
One screen, two columns:
- **Left — Notes:** the pasted notes, always visible, plus the **Organize Notes** button.
- **Right — Results:** an empty state before organizing. After organizing it shows, in order: task cards → **Blockers & Dependencies** section → **Open Questions** section. It also holds the **Add task** and export controls.

Nothing navigates away from this screen. Editing happens on the cards themselves.

## Look and Feel
- **Mood:** a clean, modern productivity app that feels calm, organized, and trustworthy. The feeling is "a cluttered desk becoming an organized workspace."
- **Colors:** warm off-white background, white task cards, dark charcoal text, muted teal/sage green as the main accent. Amber for missing information and warnings; restrained red only for errors. Few colors overall.
- **Typography:** clear, modern sans-serif with strong readability and an obvious hierarchy.
- **Layout:** a spacious two-column workspace with subtle borders, consistent spacing, and compact but readable cards that never feel crowded.
- **Motion:** the transition from notes to tasks should feel satisfying, but subtle and fast.
- **Trust labels:** source phrases are easy to find. Clear labels for "Unassigned," "Deadline not specified," "User-added," and verification warnings.
- **Avoid:** generic AI gradients, heavy glassmorphism, distracting animations, too many colors, crowded dashboards.

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
Source: `scope.md > What "Working" Looks Like`.
- Export downloads a Markdown file of the **current, edited** full action plan, not the original AI output:
  - **Tasks** as a checklist (`- [ ]`), each with owner, deadline, and source phrase.
  - **Blockers & Dependencies**, clearly identified.
  - **Open Questions** in a separate section.
  - Labels wherever they apply: "Unassigned," "Deadline not specified," "User-added," and verification warnings for details that can't be verified against the notes.
- The export adds nothing that wasn't in the notes or explicitly entered by the user.
- [ ] After editing a task, the exported file reflects the edit.
- [ ] The downloaded file opens as readable Markdown, with task checklist items, a Blockers & Dependencies section, and an Open Questions section.
- [ ] The "finish this soon" task exports with "Unassigned" and "Deadline not specified"; a user-added task exports with "User-added"; a warned task exports with its verification warning.

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
- User edits are marked user-provided/user-added, keeping extracted and user-supplied information distinct.
- Delete with a simple confirmation; undo deferred.
- Add task kept: users can include actions the AI missed.
- Relative deadlines are kept as written, not converted: this avoids guessing the meeting date or timezone. Genuinely ambiguous wording is flagged.
- Export reflects the edited plan and includes the full plan (tasks, blockers, open questions) with all labels and warnings, adding nothing new.

## What We're Building
The single-screen workflow above: paste → Organize Notes → task cards (with source phrase, owner/deadline or explicit gaps, blocked status) plus Blockers & Dependencies and Open Questions sections → verification warnings → edit title/owner/deadline, resolve/edit questions, delete with confirmation, add task → export the edited plan as a Markdown checklist. Includes the empty, no-tasks, and error states, one realistic demo note set, and an ambiguity test.

## Deferred From the POC
- **Editing dependencies/blockers:** not needed to show reliability in the demo; extracted dependencies are display-only for now.
- **Undo for delete:** the confirmation is enough for a PoC.
- **Saved history / persistence:** the session-only plan is enough to prove the loop (`scope.md > Later`).
- **User accounts, external integrations, collaboration, deployment:** excluded from the PoC (`scope.md > Later`).

## Possible Later Enhancements
- Dependency editing and undo.
- Saved history of past meetings, and integrations that send tasks to existing tools.

## Non-Goals
- Inventing or inferring missing owners, deadlines, or answers: that would contradict the core idea.
- Multiple demo scenarios: one excellent end-to-end experience instead (`scope.md > Explicitly Cut`).
- Decorative effects that compete with readability.

## Open Questions
None blocking `4-spec`. Relative dates and export contents were resolved (see Product Decisions).
