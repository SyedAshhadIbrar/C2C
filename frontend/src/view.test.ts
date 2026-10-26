import { describe, expect, it } from 'vitest'
import { toMarkdown } from './exportMarkdown'
import type { Plan, Task } from './types'
import { clarityStats, completeness, deadlineGroups, findInNotes, initial, matchesSearch } from './view'

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id, title: `Task ${id}`, titleOrigin: 'ai', owner: null, ownerOrigin: 'ai', deadline: null, deadlineOrigin: 'ai',
    deadlineAmbiguous: false, sourcePhrase: `phrase ${id}`, blockedBy: [], blockerNote: null,
    origin: 'ai', warnings: [], ...patch,
  }
}

describe('clarityStats', () => {
  it('computes owner and deadline percentages and open questions', () => {
    const plan: Plan = {
      mode: 'live',
      tasks: [task('t1', { owner: 'Ali' }), task('t2', { owner: 'Haider', deadline: 'by Friday' }), task('t3'), task('t4')],
      questions: [{ id: 'q1', text: 'a?', resolved: false }, { id: 'q2', text: 'b?', resolved: true }],
    }
    expect(clarityStats(plan)).toEqual({ ownerPct: 50, deadlinePct: 25, openQuestions: 1 })
  })

  it('returns null percentages when there are no tasks (no fake 0% or 100%)', () => {
    expect(clarityStats({ mode: 'live', tasks: [], questions: [] })).toEqual({ ownerPct: null, deadlinePct: null, openQuestions: 0 })
  })
})

describe('completeness', () => {
  it('counts owner, deadline, and a source phrase found in the notes', () => {
    expect(completeness(task('t1', { owner: 'A', deadline: 'by Friday' }))).toBe(3)
    expect(completeness(task('t1', { warnings: ['Needs verification: source phrase not found in notes'] }))).toBe(0)
    expect(completeness(task('u1', { origin: 'user', owner: 'A' }))).toBe(1) // user source is not checked
  })
})

describe('deadlineGroups', () => {
  it('groups by exact wording in first-appearance order and never converts dates', () => {
    const tasks = [
      task('t1', { deadline: 'by Friday' }), task('t2'), task('t3', { deadline: 'by next Wednesday' }),
      task('t4', { deadline: 'by Friday' }), task('t5'),
    ]
    const { dated, undated } = deadlineGroups(tasks)
    expect(dated.map((g) => [g.wording, g.tasks.map((t) => t.id)])).toEqual([
      ['by Friday', ['t1', 't4']],
      ['by next Wednesday', ['t3']],
    ])
    expect(undated.map((t) => t.id)).toEqual(['t2', 't5'])
  })
})

describe('matchesSearch', () => {
  const t = task('t1', { title: 'Evaluate model', sourcePhrase: 'haider: evaluate the model on the holdout set', owner: 'Haider' })

  it('matches title, source phrase, or owner, case-insensitively', () => {
    expect(matchesSearch(t, 'EVALUATE')).toBe(true)
    expect(matchesSearch(t, 'holdout')).toBe(true)
    expect(matchesSearch(t, 'haid')).toBe(true)
    expect(matchesSearch(t, 'dataset')).toBe(false)
  })

  it('shows everything for an empty query', () => {
    expect(matchesSearch(t, '   ')).toBe(true)
  })

  it('does not affect the plan or the export', () => {
    const plan: Plan = { mode: 'live', tasks: [t, task('t2')], questions: [] }
    const before = toMarkdown(plan)
    plan.tasks.filter((x) => matchesSearch(x, 'holdout'))
    expect(plan.tasks).toHaveLength(2)
    expect(toMarkdown(plan)).toBe(before)
  })
})

describe('findInNotes', () => {
  const notes = 'standup\nali: I’ll review the   dataset quality, some labels look off\nhaider: evaluate (v2) by friday'

  it('finds the phrase ignoring case, whitespace runs, and quote style', () => {
    const r = findInNotes(notes, "ALI: I'll review the dataset quality")!
    expect(notes.slice(r.start, r.end)).toBe('ali: I’ll review the   dataset quality')
  })

  it('treats regex characters literally', () => {
    const r = findInNotes(notes, 'evaluate (v2)')!
    expect(notes.slice(r.start, r.end)).toBe('evaluate (v2)')
  })

  it('returns null for a paraphrase or an empty phrase (no highlight)', () => {
    expect(findInNotes(notes, 'ali will review the dataset')).toBeNull()
    expect(findInNotes(notes, '  ')).toBeNull()
  })
})

describe('initial', () => {
  it('uses the first letter of the owner name', () => {
    expect(initial(' haider')).toBe('H')
  })
})
