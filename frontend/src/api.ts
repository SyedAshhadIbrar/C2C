import type { Mode, Plan } from './types'

// Shape returned by POST /api/organize (backend/app/schemas.py > OrganizeResponse).
interface ApiTask {
  id: string
  title: string
  owner: string | null
  deadline: string | null
  deadline_ambiguous: boolean
  source_phrase: string
  blocked_by: string[]
  blocker_note: string | null
  warnings: string[]
}

interface ApiResponse {
  mode: Mode
  tasks: ApiTask[]
  open_questions: { text: string }[]
}

export async function organize(notes: string): Promise<Plan> {
  const res = await fetch('/api/organize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${res.status})`)
  }
  const data: ApiResponse = await res.json()
  return {
    mode: data.mode,
    tasks: data.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      owner: t.owner,
      ownerOrigin: 'ai',
      deadline: t.deadline,
      deadlineOrigin: 'ai',
      deadlineAmbiguous: t.deadline_ambiguous,
      sourcePhrase: t.source_phrase,
      blockedBy: t.blocked_by,
      blockerNote: t.blocker_note,
      origin: 'ai',
      warnings: t.warnings,
    })),
    questions: data.open_questions.map((q, i) => ({ id: `q${i + 1}`, text: q.text, resolved: false })),
  }
}
