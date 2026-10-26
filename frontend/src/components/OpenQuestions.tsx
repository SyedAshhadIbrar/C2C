import { useState } from 'react'
import type { Question } from '../types'

type Patch = Partial<Omit<Question, 'id'>>

interface Props {
  questions: Question[]
  onChange: (id: string, patch: Patch) => void
}

export default function OpenQuestions({ questions, onChange }: Props) {
  const open = questions.filter((q) => !q.resolved).length

  return (
    <section className="results-section" aria-labelledby="questions-title">
      <h2 id="questions-title" className="panel-title">Open Questions <span className="count">{open}</span></h2>
      {questions.length === 0 ? (
        <p className="muted section-empty">No open questions found.</p>
      ) : (
        <ul className="question-list">
          {questions.map((q) => (
            <QuestionRow key={q.id} question={q} onChange={(patch) => onChange(q.id, patch)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function QuestionRow({ question: q, onChange }: { question: Question; onChange: (patch: Patch) => void }) {
  const [draft, setDraft] = useState(q.text)
  const [savedText, setSavedText] = useState(q.text)
  if (q.text !== savedText) {
    // saved wording changed (trimmed save, or a new Organize run): show it
    setSavedText(q.text)
    setDraft(q.text)
  }

  function save() {
    const text = draft.trim()
    if (text) onChange({ text })
    setDraft(text || q.text) // blank: keep the existing wording
  }

  return (
    <li className={q.resolved ? 'question resolved' : 'question'}>
      <input
        className="question-text"
        value={draft}
        disabled={q.resolved}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={q.resolved ? 'Question wording (reopen to edit)' : 'Question wording'}
      />
      {q.resolved && <span className="pill pill-ok">Resolved</span>}
      <button className="btn-ghost" onClick={() => onChange({ resolved: !q.resolved })}>
        {q.resolved ? 'Reopen' : 'Resolve'}
      </button>
    </li>
  )
}
