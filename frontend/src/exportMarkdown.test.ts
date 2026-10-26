import { describe, expect, it } from 'vitest'
import { escapeMd, toMarkdown } from './exportMarkdown'
import { addTask, deleteTask, editTask, updateQuestion } from './plan'
import type { Plan, Question, Task } from './types'

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id, title: `Task ${id}`, titleOrigin: 'ai', owner: null, ownerOrigin: 'ai', deadline: null, deadlineOrigin: 'ai',
    deadlineAmbiguous: false, sourcePhrase: `phrase ${id}`, blockedBy: [], blockerNote: null,
    origin: 'ai', warnings: [], ...patch,
  }
}

const plan = (tasks: Task[], questions: Question[] = [], extra: Partial<Plan> = {}): Plan => ({ tasks, questions, mode: 'live', ...extra })
const lines = (md: string) => md.split('\n')

/** Build the spec example by applying real Slice 5 edits to AI output, as the UI would. */
function specExamplePlan(): Plan {
  let tasks = [
    task('t1', { title: 'Finish the auth API (token refresh)', owner: 'Mia', deadline: 'by Friday', sourcePhrase: 'Mia will finish the auth API by Friday' }),
    task('t5', { title: 'Finish dark mode', sourcePhrase: "dark mode: let's finish this soon" }),
    task('t2', { title: 'Fix the Android login bug', owner: 'Raj', blockedBy: ['t1'], sourcePhrase: "Raj can't fix the login bug until the auth API is merged" }),
  ]
  tasks = editTask(tasks, 't5', { deadline: 'by Friday' })
  tasks = deleteTask(tasks, 't1')
  tasks = addTask(tasks, { title: 'Book the demo room', owner: 'Sam', sourcePhrase: 'we need a room for the demo' }, 'u1')
  let questions: Question[] = [
    { id: 'q1', text: 'Do we support SSO for the enterprise pilot?', resolved: false },
    { id: 'q2', text: 'Is the push redesign parked until after the pilot?', resolved: false },
  ]
  questions = updateQuestion(questions, 'q1', { resolved: true })
  return { tasks, questions, mode: 'sample' }
}

// Copied verbatim from devpost/spec.md > Frontend: Markdown Export.
const SPEC_EXAMPLE = `# Action Plan

_Sample mode: generated from a saved sample response, not a live AI call._

## Tasks (3)

- [ ] Finish dark mode
  - Owner: Unassigned
  - Deadline: by Friday (User-provided)
  - Source (from your notes): "dark mode: let's finish this soon"
- [ ] Fix the Android login bug
  - Owner: Raj
  - Deadline: Deadline not specified (clarify)
  - Source (from your notes): "Raj can't fix the login bug until the auth API is merged"
  - Blocked by: ⚠ Unknown task "t1"
- [ ] Book the demo room (User-added)
  - Owner: Sam
  - Deadline: Deadline not specified (clarify)
  - Source (entered by you, not checked against the notes): "we need a room for the demo"

## Blockers & Dependencies

- Fix the Android login bug ← ⚠ Unknown task "t1"

## Open Questions

- [x] Do we support SSO for the enterprise pilot? (Resolved)
- [ ] Is the push redesign parked until after the pilot?
`

describe('toMarkdown: documented format', () => {
  it('matches the spec example exactly (edited, deleted, added tasks; resolved question; sample mode)', () => {
    expect(toMarkdown(specExamplePlan())).toBe(SPEC_EXAMPLE)
  })

  it('is deterministic and never mutates the plan', () => {
    const p = specExamplePlan()
    const before = JSON.stringify(p)
    const first = toMarkdown(Object.freeze(p) as Plan)
    expect(toMarkdown(p)).toBe(first)
    expect(JSON.stringify(p)).toBe(before)
  })

  it('omits the sample-mode line in live mode', () => {
    expect(toMarkdown(plan([task('t1')]))).not.toContain('Sample mode')
  })
})

describe('toMarkdown: labels and badges', () => {
  it('writes the User-edited title badge and User-provided owner', () => {
    const tasks = editTask([task('t1', { owner: 'Mia', sourcePhrase: 'Mia does it' })], 't1', { title: 'Renamed', owner: 'Raj' })
    const md = toMarkdown(plan(tasks))
    expect(md).toContain('- [ ] Renamed (User-edited)\n  - Owner: Raj (User-provided)')
  })

  it('keeps AI values unbadged', () => {
    const md = toMarkdown(plan([task('t1', { owner: 'Mia', deadline: 'by Friday' })]))
    expect(md).toContain('  - Owner: Mia\n  - Deadline: by Friday\n')
  })

  it('marks an ambiguous deadline as unclear', () => {
    const md = toMarkdown(plan([task('t6', { deadline: 'by end of sprint', deadlineAmbiguous: true })]))
    expect(md).toContain('  - Deadline: by end of sprint (wording unclear, clarify)')
  })

  it('writes every warning and the unverified-source label', () => {
    const w = ['Needs verification: source phrase not found in notes', 'Needs verification: owner not found in source phrase']
    const md = toMarkdown(plan([task('t1', { owner: 'Zoe', warnings: w, sourcePhrase: 'never said' })]))
    expect(md).toContain('  - ⚠ Needs verification: source phrase not found in notes\n  - ⚠ Needs verification: owner not found in source phrase\n')
    expect(md).toContain('  - Source (quoted by AI, not found in your notes): "never said"')
  })

  it('omits the source line when there is no source phrase', () => {
    const tasks = addTask([], { title: 'No source' }, 'u1')
    expect(toMarkdown(plan(tasks))).not.toContain('Source')
  })
})

describe('toMarkdown: dependencies', () => {
  it('writes known, unknown, self, and note dependencies in card order, in both places', () => {
    const tasks = [
      task('t1', { title: 'Finish the auth API' }),
      task('t2', { title: 'Fix login', blockedBy: ['t1', 't9', 't2'], blockerNote: 'Needs copy from marketing' }),
    ]
    const md = toMarkdown(plan(tasks))
    const chain = 'Finish the auth API; ⚠ Unknown task "t9"; ⚠ Self-dependency: this task depends on itself; Needs copy from marketing'
    expect(md).toContain(`  - Blocked by: ${chain}`)
    expect(md).toContain(`- Fix login ← ${chain}`)
  })

  it('writes empty sections explicitly', () => {
    const md = toMarkdown(plan([]))
    expect(md).toContain('## Tasks (0)\n\nNo actionable tasks found in these notes.')
    expect(md).toContain('## Blockers & Dependencies\n\nNothing is blocked.')
    expect(md).toContain('## Open Questions\n\nNo open questions.')
  })
})

describe('toMarkdown: never adds facts', () => {
  it('writes only values from the plan (no dates, guesses, or extra items)', () => {
    const md = toMarkdown(plan([task('t5', { title: 'Finish dark mode', sourcePhrase: "dark mode: let's finish this soon" })]))
    expect(md).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}/) // no timestamps or converted dates
    expect(lines(md).filter((l) => l.startsWith('- ['))).toHaveLength(1)
    expect(md).toContain('  - Owner: Unassigned\n  - Deadline: Deadline not specified (clarify)')
  })

  it('omits deleted tasks entirely', () => {
    const tasks = deleteTask([task('t1', { title: 'Gone task' }), task('t2')], 't1')
    expect(toMarkdown(plan(tasks))).not.toContain('Gone task')
  })
})

describe('escapeMd', () => {
  it('escapes Markdown control characters and collapses whitespace', () => {
    expect(escapeMd(' a *b* _c_ [d](e) <f> `g` \\h \n\t i ')).toBe('a \\*b\\* \\_c\\_ \\[d\\](e) \\<f\\> \\`g\\` \\\\h i')
  })

  it('stops user text from breaking the checklist structure', () => {
    const tasks = addTask([], { title: 'Ship it\n- [x] fake done item', owner: '[click](http://x)' }, 'u1')
    const md = toMarkdown(plan(tasks))
    expect(lines(md).filter((l) => l.startsWith('- ['))).toEqual(['- [ ] Ship it - \\[x\\] fake done item (User-added)'])
    expect(md).toContain('  - Owner: \\[click\\](http://x)')
  })
})

describe('toMarkdown: forward-compatible with Slice 7 metadata', () => {
  it('writes the Inferred badge and every inference with its evidence (or its absence)', () => {
    const t = task('t1', {
      owner: 'Mia', deadline: 'after QA signs off', deadlineType: 'conditional',
      inferences: [
        { field: 'owner', evidence: "Mia said she'll handle it", note: 'from "she"' },
        { field: 'deadline', evidence: null },
      ],
    })
    const md = toMarkdown(plan([t]))
    expect(md).toContain('- [ ] Task t1 (Inferred — confirm)')
    expect(md).toContain('  - Deadline: after QA signs off (conditional)')
    expect(md).toContain('  - ⚠ Inferred owner (Inferred — confirm). Evidence: "Mia said she\'ll handle it" (from "she")')
    expect(md).toContain('  - ⚠ Inferred deadline (Inferred — confirm). Evidence: none provided')
  })

  it('writes Decisions and Problems sections only when that metadata exists', () => {
    expect(toMarkdown(plan([]))).not.toMatch(/## Decisions|## Problems/)
    const md = toMarkdown(plan([], [], {
      decisions: [{ text: 'Ship without SSO', sourcePhrase: "we'll ship without SSO" }],
      problems: [],
    }))
    expect(md).toContain('## Decisions\n\n- Ship without SSO\n  - Source (from your notes): "we\'ll ship without SSO"')
    expect(md).toContain('## Problems\n\nNone.')
  })

  it('does not change the current format when no Slice 7 metadata is present', () => {
    expect(toMarkdown(specExamplePlan())).toBe(SPEC_EXAMPLE)
  })
})
