import { describe, expect, it } from 'vitest'
import {
  SELF_DEPENDENCY_LABEL, TITLE_REQUIRED, addTask, blockerRows, deleteTask, dependenciesOf, editTask, nextUserTaskId, titleError, updateQuestion,
} from './plan'
import type { Question, Task } from './types'

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id, title: `Task ${id}`, titleOrigin: 'ai', owner: null, ownerOrigin: 'ai', deadline: null, deadlineOrigin: 'ai',
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

// --- Slice 5: editing, deleting, adding tasks ---

const OWNER_W = 'Needs verification: owner not found in source phrase'
const DEADLINE_W = 'Needs verification: deadline not found in source phrase'
const SOURCE_W = 'Needs verification: source phrase not found in notes'

describe('editTask', () => {
  const darkMode = task('t5', { title: 'Finish dark mode', sourcePhrase: "dark mode: let's finish this soon" })
  const tasks = [task('t1'), darkMode]

  it('sets a missing deadline as User-provided, clears the clarify state, keeps the source phrase', () => {
    const [, t] = editTask([task('t1'), { ...darkMode, deadlineAmbiguous: true }], 't5', { deadline: '  by Friday ' })
    expect(t).toMatchObject({ deadline: 'by Friday', deadlineOrigin: 'user', deadlineAmbiguous: false, sourcePhrase: "dark mode: let's finish this soon" })
  })

  it('sets a missing owner as User-provided', () => {
    expect(editTask(tasks, 't5', { owner: 'Priya' })[1]).toMatchObject({ owner: 'Priya', ownerOrigin: 'user' })
  })

  it('marks a changed title as User-edited and trims it', () => {
    expect(editTask(tasks, 't5', { title: '  Ship dark mode ' })[1]).toMatchObject({ title: 'Ship dark mode', titleOrigin: 'user' })
  })

  it.each(['', '   ', '\n\t'])('rejects a blank title (%j) and keeps the old one', (blank) => {
    expect(editTask(tasks, 't5', { title: blank })[1]).toEqual(darkMode)
  })

  it('clearing owner or deadline sets it back to null (Unassigned / Deadline not specified)', () => {
    const set = editTask(tasks, 't5', { owner: 'Priya', deadline: 'by Friday' })
    const cleared = editTask(set, 't5', { owner: '  ', deadline: '' })[1]
    expect(cleared.owner).toBeNull()
    expect(cleared.deadline).toBeNull()
  })

  it('leaves unchanged values as AI-extracted (no badge for a no-op save)', () => {
    const t = task('t1', { title: 'Finish the auth API', owner: 'Mia', deadline: 'by Friday' })
    expect(editTask([t], 't1', { title: 'Finish the auth API', owner: 'Mia', deadline: 'by Friday' })[0]).toEqual(t)
  })

  it("drops only the edited field's grounding warning and keeps the source-phrase warning", () => {
    const warned = task('t1', { owner: 'Zoe', deadline: 'tomorrow', warnings: [SOURCE_W, OWNER_W, DEADLINE_W] })
    expect(editTask([warned], 't1', { owner: 'Mia' })[0].warnings).toEqual([SOURCE_W, DEADLINE_W])
    expect(editTask([warned], 't1', { deadline: 'by Friday' })[0].warnings).toEqual([SOURCE_W, OWNER_W])
    expect(editTask([warned], 't1', { title: 'New title' })[0].warnings).toEqual([SOURCE_W, OWNER_W, DEADLINE_W])
  })

  it('never changes id, source phrase, or dependencies, and does not mutate', () => {
    const t = task('t2', { blockedBy: ['t1'] })
    const next = editTask([t], 't2', { title: 'X', owner: 'Raj', deadline: 'next week' })[0]
    expect(next).toMatchObject({ id: 't2', sourcePhrase: 'phrase t2', blockedBy: ['t1'] })
    expect(t.title).toBe('Task t2')
  })

  it('leaves other tasks untouched (same objects)', () => {
    expect(editTask(tasks, 't5', { owner: 'Priya' })[0]).toBe(tasks[0])
  })
})

describe('deleteTask', () => {
  it('removes only that task', () => {
    const tasks = [task('t1'), task('t2'), task('t3')]
    expect(deleteTask(tasks, 't2').map((t) => t.id)).toEqual(['t1', 't3'])
    expect(tasks).toHaveLength(3)
  })

  it('keeps dangling references so they show as unknown dependencies in card and section', () => {
    const tasks = [task('t1', { title: 'Finish the auth API' }), task('t2', { blockedBy: ['t1'] })]
    const after = deleteTask(tasks, 't1')
    expect(after[0].blockedBy).toEqual(['t1'])
    expect(dependenciesOf(after[0], after)).toEqual([{ label: 'Unknown task "t1"', known: false }])
    expect(blockerRows(after)[0].dependencies).toEqual(dependenciesOf(after[0], after))
  })
})

describe('addTask', () => {
  it('adds a User-added task with trimmed optional fields marked as the user\'s', () => {
    const [, t] = addTask([task('t1')], { title: ' Book the demo room ', owner: ' Sam ', deadline: 'by Monday', sourcePhrase: '' }, 'u1')
    expect(t).toEqual({
      id: 'u1', title: 'Book the demo room', titleOrigin: 'user', owner: 'Sam', ownerOrigin: 'user',
      deadline: 'by Monday', deadlineOrigin: 'user', deadlineAmbiguous: false, sourcePhrase: null,
      blockedBy: [], blockerNote: null, origin: 'user', warnings: [],
    })
  })

  it('leaves unknown owner and deadline null instead of inventing them', () => {
    expect(addTask([], { title: 'Investigate flaky test' }, 'u1')[0]).toMatchObject({ owner: null, deadline: null })
  })

  it.each(['', '   '])('rejects a blank title (%j)', (blank) => {
    const tasks = [task('t1')]
    expect(addTask(tasks, { title: blank }, 'u1')).toBe(tasks)
  })
})

describe('nextUserTaskId', () => {
  it('counts up from the session counter', () => {
    expect(nextUserTaskId([], 0)).toEqual({ id: 'u1', counter: 1 })
    expect(nextUserTaskId([], 1)).toEqual({ id: 'u2', counter: 2 })
  })

  it('never reuses an id that is still referenced, even after its task was deleted', () => {
    const tasks = [task('t2', { blockedBy: ['u1'] })] // u1 was deleted; t2 still points at it
    expect(nextUserTaskId(tasks, 0).id).toBe('u2')
  })

  it('skips ids still used by tasks', () => {
    expect(nextUserTaskId([task('u1'), task('u2')], 0).id).toBe('u3')
  })
})

describe('titleError', () => {
  it('requires a non-blank title', () => {
    expect(titleError('  ')).toBe(TITLE_REQUIRED)
    expect(titleError('Fix login')).toBeNull()
  })
})
