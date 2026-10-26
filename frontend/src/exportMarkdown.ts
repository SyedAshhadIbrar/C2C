import { badgesOf, blockerRows, dependenciesOf, sourceKind, type Dependency } from './plan'
import type { Inference, NoteItem, Plan, Task } from './types'

// Format and rules: devpost/spec.md > Frontend: Markdown Export. Pure and deterministic:
// reads the plan as it is on screen and never modifies it or adds facts.

/** One line, Markdown control characters escaped so text can't break the structure. */
export function escapeMd(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/[\\`*_[\]<>]/g, (c) => `\\${c}`)
}

const quote = (text: string) => `"${escapeMd(text)}"`

const SOURCE_LABELS = {
  notes: 'Source (from your notes)',
  unverified: 'Source (quoted by AI, not found in your notes)',
  user: 'Source (entered by you, not checked against the notes)',
} as const

const depLabel = (d: Dependency) => (d.known ? escapeMd(d.label) : `⚠ ${escapeMd(d.label)}`)

// Slice 7 metadata: if present, every inference and its evidence (or its absence) is written out.
// The current UI does not display it yet, so with this metadata the file shows more than the screen.
function inferenceLine(inf: Inference): string {
  const evidence = inf.evidence ? `Evidence: ${quote(inf.evidence)}` : 'Evidence: none provided'
  const note = inf.note ? ` (${escapeMd(inf.note)})` : ''
  return `  - ⚠ Inferred ${inf.field} (Inferred — confirm). ${evidence}${note}`
}

function taskLines(task: Task, tasks: Task[]): string[] {
  const badges = badgesOf(task)
  const inferences = task.inferences ?? []
  const titleTags = [badges.title, inferences.length ? 'Inferred — confirm' : null].filter(Boolean).map((t) => ` (${t})`)
  const lines = [`- [ ] ${escapeMd(task.title)}${titleTags.join('')}`]

  lines.push(`  - Owner: ${task.owner ? escapeMd(task.owner) + (badges.owner ? ' (User-provided)' : '') : 'Unassigned'}`)

  if (task.deadline === null) {
    lines.push('  - Deadline: Deadline not specified (clarify)')
  } else {
    const kind = task.deadlineType ? ` (${task.deadlineType.replace('_', ' ')})` : ''
    const unclear = task.deadlineAmbiguous ? ' (wording unclear, clarify)' : ''
    lines.push(`  - Deadline: ${escapeMd(task.deadline)}${kind}${badges.deadline ? ' (User-provided)' : ''}${unclear}`)
  }

  for (const w of task.warnings) lines.push(`  - ⚠ ${escapeMd(w)}`)
  for (const inf of inferences) lines.push(inferenceLine(inf))

  const source = sourceKind(task)
  if (source) lines.push(`  - ${SOURCE_LABELS[source]}: ${quote(task.sourcePhrase!)}`)

  const deps = dependenciesOf(task, tasks)
  if (deps.length) lines.push(`  - Blocked by: ${deps.map(depLabel).join('; ')}`)
  return lines
}

function noteItemSection(title: string, items: NoteItem[]): string[] {
  const out = [`## ${title}`, '']
  if (!items.length) return [...out, 'None.']
  for (const item of items) {
    out.push(`- ${escapeMd(item.text)}`)
    for (const w of item.warnings ?? []) out.push(`  - ⚠ ${escapeMd(w)}`)
    if (item.sourcePhrase) {
      const unverified = (item.warnings ?? []).some((w) => w.includes('source phrase not found'))
      out.push(`  - ${unverified ? SOURCE_LABELS.unverified : SOURCE_LABELS.notes}: ${quote(item.sourcePhrase)}`)
    }
  }
  return out
}

export function toMarkdown(plan: Plan): string {
  const out = ['# Action Plan', '']
  if (plan.mode === 'sample') out.push('_Sample mode: generated from a saved sample response, not a live AI call._', '')

  out.push(`## Tasks (${plan.tasks.length})`, '')
  if (plan.tasks.length === 0) out.push('No actionable tasks found in these notes.')
  else for (const t of plan.tasks) out.push(...taskLines(t, plan.tasks))

  out.push('', '## Blockers & Dependencies', '')
  const rows = blockerRows(plan.tasks)
  if (rows.length === 0) out.push('Nothing is blocked.')
  else for (const r of rows) out.push(`- ${escapeMd(r.task.title)} ← ${r.dependencies.map(depLabel).join('; ')}`)

  out.push('', '## Open Questions', '')
  if (plan.questions.length === 0) out.push('No open questions.')
  else for (const q of plan.questions) out.push(q.resolved ? `- [x] ${escapeMd(q.text)} (Resolved)` : `- [ ] ${escapeMd(q.text)}`)

  // Slice 7 sections appear only when that metadata exists, so today's format is unchanged.
  if (plan.decisions) out.push('', ...noteItemSection('Decisions', plan.decisions))
  if (plan.problems) out.push('', ...noteItemSection('Problems', plan.problems))

  return out.join('\n') + '\n'
}

export function downloadMarkdown(text: string, filename = 'action-plan.md'): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0) // after the click has started the download
}
