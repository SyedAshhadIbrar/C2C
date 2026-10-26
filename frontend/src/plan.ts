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
