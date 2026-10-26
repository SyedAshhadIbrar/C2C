import { sourceKind } from './plan'
import type { Plan, Task } from './types'

// Read-only view helpers for the redesigned screen. None of them change the plan.

export interface ClarityStats {
  ownerPct: number | null // null when there are no tasks
  deadlinePct: number | null
  openQuestions: number
}

export function clarityStats(plan: Plan): ClarityStats {
  const n = plan.tasks.length
  const pct = (count: number) => (n ? Math.round((count / n) * 100) : null)
  return {
    ownerPct: pct(plan.tasks.filter((t) => t.owner).length),
    deadlinePct: pct(plan.tasks.filter((t) => t.deadline).length),
    openQuestions: plan.questions.filter((q) => !q.resolved).length,
  }
}

/** 0–3 per task: has an owner, has a deadline, source phrase found in the notes. */
export function completeness(task: Task): number {
  return (task.owner ? 1 : 0) + (task.deadline ? 1 : 0) + (sourceKind(task) === 'notes' ? 1 : 0)
}

export interface DeadlineGroup {
  wording: string // exact wording as stored, never converted to a date
  tasks: Task[]
}

/** Tasks grouped by their exact deadline wording (first-appearance order), plus undated tasks. */
export function deadlineGroups(tasks: Task[]): { dated: DeadlineGroup[]; undated: Task[] } {
  const dated = new Map<string, Task[]>()
  const undated: Task[] = []
  for (const t of tasks) {
    if (t.deadline === null) undated.push(t)
    else dated.set(t.deadline, [...(dated.get(t.deadline) ?? []), t])
  }
  return { dated: [...dated].map(([wording, tasks]) => ({ wording, tasks })), undated }
}

/** Client-side filter on title, source phrase, or owner. Only decides what is shown. */
export function matchesSearch(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [task.title, task.sourcePhrase, task.owner].some((v) => v?.toLowerCase().includes(q))
}

/**
 * Where a source phrase sits in the original notes, using the grounding rules
 * (ignore case, runs of whitespace, straight vs curly quotes). Null when absent.
 */
export function findInNotes(notes: string, phrase: string): { start: number; end: number } | null {
  const trimmed = phrase.trim()
  if (!trimmed) return null
  const pattern = [...trimmed.replace(/\s+/g, ' ')]
    .map((c) => {
      if (c === ' ') return '\\s+'
      if ("'‘’".includes(c)) return "['‘’]"
      if ('"“”'.includes(c)) return '["“”]'
      return c.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&')
    })
    .join('')
  const m = new RegExp(pattern, 'i').exec(notes)
  return m ? { start: m.index, end: m.index + m[0].length } : null
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}
