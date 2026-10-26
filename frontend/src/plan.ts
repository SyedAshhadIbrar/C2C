import type { Question, Task } from './types'

export interface Dependency {
  label: string
  known: boolean // false = shown as a warning: an unknown id, or the task itself
}

export const SELF_DEPENDENCY_LABEL = 'Self-dependency: this task depends on itself'

/** What a task waits on: other tasks by title, unresolved ids kept and marked, then any free-text blocker. */
export function dependenciesOf(task: Task, tasks: Task[]): Dependency[] {
  const titleById = new Map(tasks.map((t) => [t.id, t.title]))
  const deps: Dependency[] = task.blockedBy.map((id) => {
    if (id === task.id) return { label: SELF_DEPENDENCY_LABEL, known: false }
    if (titleById.has(id)) return { label: titleById.get(id)!, known: true }
    return { label: `Unknown task "${id}"`, known: false }
  })
  if (task.blockerNote) deps.push({ label: task.blockerNote, known: true })
  return deps
}

export interface BlockerRow {
  task: Task
  dependencies: Dependency[]
}

/** One row per task that is blocked by something, in task order. */
export function blockerRows(tasks: Task[]): BlockerRow[] {
  return tasks
    .map((task) => ({ task, dependencies: dependenciesOf(task, tasks) }))
    .filter((row) => row.dependencies.length > 0)
}

// --- Display rules shared by TaskCard and the Markdown export, so they can't drift apart ---

export type SourceKind = 'notes' | 'unverified' | 'user'

/** Which source label a task's quote gets, or null when it has none. */
export function sourceKind(task: Task): SourceKind | null {
  if (!task.sourcePhrase) return null
  if (task.origin === 'user') return 'user'
  return task.warnings.some((w) => w.includes('source phrase not found')) ? 'unverified' : 'notes'
}

/** Provenance badges as shown on the card. A User-added task shows only that badge. */
export function badgesOf(task: Task): { title: 'User-added' | 'User-edited' | null; owner: boolean; deadline: boolean } {
  const userAdded = task.origin === 'user'
  return {
    title: userAdded ? 'User-added' : task.titleOrigin === 'user' ? 'User-edited' : null,
    owner: !userAdded && !!task.owner && task.ownerOrigin === 'user',
    deadline: !userAdded && !!task.deadline && task.deadlineOrigin === 'user',
  }
}

// --- Task editing, deleting, adding (session-only, immutable) ---

// Must match the grounding warnings from backend/app/grounding.py.
const OWNER_WARNING = 'owner not found in source phrase'
const DEADLINE_WARNING = 'deadline not found in source phrase'

export const TITLE_REQUIRED = 'Title is required.'

/** Error message for a title, or null when it is valid. */
export function titleError(title: string): string | null {
  return title.trim() ? null : TITLE_REQUIRED
}

const optional = (value: string | null | undefined) => (value ?? '').trim() || null

export interface TaskEdit {
  title?: string
  owner?: string | null
  deadline?: string | null
}

/**
 * Apply a user edit to one task. A blank title is rejected (old title kept).
 * Owner/deadline are trimmed; empty becomes null, which brings back Unassigned /
 * Deadline not specified. Only a real change marks a field as the user's and drops
 * that field's AI grounding warning; the source phrase and its warning never change.
 */
export function editTask(tasks: Task[], id: string, edit: TaskEdit): Task[] {
  return tasks.map((t) => {
    if (t.id !== id) return t
    const next = { ...t }
    if (edit.title !== undefined && !titleError(edit.title) && edit.title.trim() !== t.title) {
      next.title = edit.title.trim()
      next.titleOrigin = 'user'
    }
    if (edit.owner !== undefined && optional(edit.owner) !== t.owner) {
      next.owner = optional(edit.owner)
      next.ownerOrigin = 'user'
      next.warnings = next.warnings.filter((w) => !w.includes(OWNER_WARNING))
    }
    if (edit.deadline !== undefined && optional(edit.deadline) !== t.deadline) {
      next.deadline = optional(edit.deadline)
      next.deadlineOrigin = 'user'
      next.deadlineAmbiguous = false
      next.warnings = next.warnings.filter((w) => !w.includes(DEADLINE_WARNING))
    }
    return next
  })
}

/** Remove one task. Other tasks keep their references to it, so they show as unknown dependencies. */
export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((t) => t.id !== id)
}

/**
 * Next id for a user-added task: u1, u2, ... from a session counter that only goes up,
 * skipping any id still used by a task or referenced as a dependency, so a deleted
 * task's dangling reference can never silently point at a new task.
 */
export function nextUserTaskId(tasks: Task[], counter: number): { id: string; counter: number } {
  const taken = new Set(tasks.flatMap((t) => [t.id, ...t.blockedBy]))
  let n = counter
  do n++
  while (taken.has(`u${n}`))
  return { id: `u${n}`, counter: n }
}

export interface NewTask {
  title: string
  owner?: string
  deadline?: string
  sourcePhrase?: string
}

/** Append a User-added task. A blank title is rejected (list returned unchanged). */
export function addTask(tasks: Task[], input: NewTask, id: string): Task[] {
  if (titleError(input.title)) return tasks
  return [
    ...tasks,
    {
      id,
      title: input.title.trim(),
      titleOrigin: 'user',
      owner: optional(input.owner),
      ownerOrigin: 'user',
      deadline: optional(input.deadline),
      deadlineOrigin: 'user',
      deadlineAmbiguous: false,
      sourcePhrase: optional(input.sourcePhrase),
      blockedBy: [],
      blockerNote: null,
      origin: 'user',
      warnings: [], // user-added tasks are not grounding-checked
    },
  ]
}

/**
 * Immutable update of one question. Text edits are trimmed; a blank edit, or any
 * text edit to a resolved question, keeps the existing text.
 */
export function updateQuestion(questions: Question[], id: string, patch: Partial<Omit<Question, 'id'>>): Question[] {
  return questions.map((q) => {
    if (q.id !== id) return q
    const next = { ...patch }
    if (next.text !== undefined) {
      const text = next.text.trim()
      if (!text || q.resolved) delete next.text
      else next.text = text
    }
    return { ...q, ...next }
  })
}
