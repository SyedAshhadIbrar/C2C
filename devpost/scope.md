---
doc: scope
status: approved
---

# Chaos to Clarity

A web app that turns messy meeting notes into a reliable, editable action plan, without making up anything the notes don't say.

## The Unique Kernel
It values being reliable over looking polished. Confirmed tasks are kept separate from unclear information, and missing deadlines, owners, or decisions are marked "Not specified" and flagged for clarification instead of guessed. Ambiguity is shown openly so the user can resolve it, instead of assumptions quietly being treated as facts. Every task shows the **original source phrase** from the notes that supports it, so anyone can check it against the notes.

## Who It's For
A developer or project lead on a small software team who has just come out of a project-planning meeting. The notes are informal and scattered: features, bug fixes, who's doing what, upcoming dates, plus vague commitments ("let's finish this soon") and unresolved dependencies. Today they'd reread the whole conversation to work out what has to happen next.

## The Core Loop
Paste the messy notes → click **Organize Notes** → see task cards with owners, deadlines, blockers, and open questions → fix anything that's wrong → export a Markdown checklist. They come back after every meeting.

## Inspiration & Identity
It should feel satisfying, like turning a cluttered desk into an organized workspace. Notes "transform" into a clean workspace: individual task cards, blockers highlighted, open questions separated from confirmed decisions, and missing information clearly marked.

## Why This Matters to the Learner
"People often leave meetings with lots of information but no clear plan." They want a portfolio-quality demo with "one excellent end-to-end experience rather than lots of features", and they want to learn how AI-generated structured data works and how to validate it reliably.

## What "Working" Looks Like
Paste realistic dev-team planning notes that contain: tasks with clear owners and deadlines, a bug blocked by another task, an unanswered question, and "let's finish this soon." Click **Organize Notes** and get task cards, owners, deadlines, blockers, and open questions. Edit one task, then export a Markdown checklist.

**The key moment:** the vague commitment becomes a task showing its source phrase ("let's finish this soon") next to a clearly marked **"Deadline not specified"** status and a prompt to clarify it. Tasks without an owner stay unassigned.

It's successful if a judge can see the original notes, match each task to its source phrase, understand the organized results, verify that nothing missing was made up, and download a usable checklist.

## The POC Boundary
- Paste notes → one AI extraction into tasks (with owner and deadline only when explicitly stated), blockers/dependencies, and open questions
- Each task shows the source phrase from the notes that supports it
- Missing information shown as "Deadline not specified" / unassigned and flagged with a prompt to clarify, never guessed
- Edit extracted tasks
- Export as a Markdown checklist
- One realistic example plus an ambiguity test case
- Runs locally, with no login and no deployment

## Later
Explicitly excluded from the PoC; revisit after the core workflow works:
- Saved history
- User accounts / login
- External integrations
- Collaboration
- Deployment (optional for the hackathon)

## Explicitly Cut
- Multiple example scenarios and extra features: the learner chose one excellent end-to-end experience over breadth
