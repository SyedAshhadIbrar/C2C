import { describe, expect, it } from 'vitest'
import { SELF_DEPENDENCY_LABEL, blockerRows, dependenciesOf, updateQuestion } from './plan'
import type { Question, Task } from './types'

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id, title: `Task ${id}`, owner: null, ownerOrigin: 'ai', deadline: null, deadlineOrigin: 'ai',
    deadlineAmbiguous: false, sourcePhrase: `phrase ${id}`, blockedBy: [], blockerNote: null,
    origin: 'ai', warnings: [], ...patch,
  }
}

describe('dependenciesOf', () => {
  it('names known dependencies by task title', () => {
    const tasks = [task('t1', { title: 'Finish the auth API' }), task('t2', { blockedBy: ['t1'] })]
    expect(dependenciesOf(tasks[1], tasks)).toEqual([{ label: 'Finish the auth API', known: true }])
  })

  it('keeps a genuinely unknown id visible as an unknown task', () => {
    const tasks = [task('t1', { blockedBy: ['t9'] })]
    expect(dependenciesOf(tasks[0], tasks)).toEqual([{ label: 'Unknown task "t9"', known: false }])
  })

  it('labels a self-dependency as such, not as an unknown task', () => {
    const tasks = [task('t1', { blockedBy: ['t1'] })]
    expect(dependenciesOf(tasks[0], tasks)).toEqual([{ label: SELF_DEPENDENCY_LABEL, known: false }])
    expect(SELF_DEPENDENCY_LABEL).toBe('Self-dependency: this task depends on itself')
  })

  it('keeps mixed dependencies in order with distinct labels', () => {
    const tasks = [task('t1', { title: 'Finish the auth API' }), task('t2', { blockedBy: ['t9', 't1', 't2'] })]
    expect(dependenciesOf(tasks[1], tasks).map((d) => [d.label, d.known])).toEqual([
      ['Unknown task "t9"', false],
      ['Finish the auth API', true],
      [SELF_DEPENDENCY_LABEL, false],
    ])
  })

  it('gives the card and the Blockers section the same dependencies', () => {
    const tasks = [task('t1'), task('t2', { blockedBy: ['t1', 't2', 't9'] })]
    expect(blockerRows(tasks)[0].dependencies).toEqual(dependenciesOf(tasks[1], tasks))
  })

  it('adds a free-text blocker note after task dependencies', () => {
    const tasks = [task('t1'), task('t2', { blockedBy: ['t1'], blockerNote: 'Needs final copy from marketing' })]
    expect(dependenciesOf(tasks[1], tasks).map((d) => d.label)).toEqual(['Task t1', 'Needs final copy from marketing'])
  })
})

describe('blockerRows', () => {
  it('lists only blocked tasks, in task order', () => {
    const tasks = [task('t1'), task('t2', { blockedBy: ['t1'] }), task('t3'), task('t4', { blockerNote: 'waiting on design' })]
    expect(blockerRows(tasks).map((r) => r.task.id)).toEqual(['t2', 't4'])
  })

  it('is empty when nothing is blocked', () => {
    expect(blockerRows([task('t1'), task('t2')])).toEqual([])
  })

  it('does not drop a task whose only dependency is unresolved', () => {
    const rows = blockerRows([task('t1', { blockedBy: ['t9'] })])
    expect(rows).toHaveLength(1)
    expect(rows[0].dependencies[0].known).toBe(false)
  })
})

describe('updateQuestion', () => {
  const qs: Question[] = [
    { id: 'q1', text: 'Do we support SSO?', resolved: false },
    { id: 'q2', text: 'Parked until after the pilot?', resolved: false },
  ]

  it('resolves one question without touching the others', () => {
    const next = updateQuestion(qs, 'q1', { resolved: true })
    expect(next[0]).toEqual({ id: 'q1', text: 'Do we support SSO?', resolved: true })
    expect(next[1]).toBe(qs[1])
  })

  it('rewords an open question and keeps it open', () => {
    const next = updateQuestion(qs, 'q1', { text: 'Do we support SSO for the pilot?' })
    expect(next[0]).toEqual({ id: 'q1', text: 'Do we support SSO for the pilot?', resolved: false })
    expect(next[1]).toBe(qs[1])
  })

  it('does not mutate the original list', () => {
    updateQuestion(qs, 'q1', { resolved: true })
    expect(qs[0].resolved).toBe(false)
  })

  it('reopens a resolved question with its text intact', () => {
    const resolved = updateQuestion(qs, 'q1', { resolved: true })
    const reopened = updateQuestion(resolved, 'q1', { resolved: false })
    expect(reopened[0]).toEqual({ id: 'q1', text: 'Do we support SSO?', resolved: false })
    expect(reopened[1]).toBe(qs[1])
  })

  it('trims surrounding whitespace when saving wording', () => {
    expect(updateQuestion(qs, 'q1', { text: '   Do we support SSO for the pilot?  \n' })[0].text).toBe('Do we support SSO for the pilot?')
  })

  it.each(['', '   ', '\n\t '])('keeps the existing text when the new wording is blank (%j)', (blank) => {
    const next = updateQuestion(qs, 'q1', { text: blank })
    expect(next[0]).toEqual(qs[0])
    expect(next[1]).toBe(qs[1])
  })

  it('ignores wording edits to a resolved question', () => {
    const resolved = updateQuestion(qs, 'q1', { resolved: true })
    const next = updateQuestion(resolved, 'q1', { text: 'Changed while resolved' })
    expect(next[0]).toEqual({ id: 'q1', text: 'Do we support SSO?', resolved: true })
  })

  it('still allows resolving or reopening alongside a blank text edit', () => {
    const next = updateQuestion(qs, 'q1', { text: '  ', resolved: true })
    expect(next[0]).toEqual({ id: 'q1', text: 'Do we support SSO?', resolved: true })
  })
})
