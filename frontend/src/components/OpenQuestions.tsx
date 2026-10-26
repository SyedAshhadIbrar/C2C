import { useState } from 'react'
import type { Question } from '../types'

type Patch = Partial<Omit<Question, 'id'>>

interface Props {
  questions: Question[]
  onChange: (id: string, patch: Patch) => void
}

export default function OpenQuestions({ questions, onChange }: Props) {
  const [showResolved, setShowResolved] = useState(false)
  const open = questions.filter((q) => !q.resolved)
  const resolved = questions.filter((q) => q.resolved)

  return (
    <section id="questions" className="cc-section" aria-labelledby="questions-title">
      <h2 id="questions-title" className="cc-h2">Open questions <span className="cc-spark" aria-hidden="true">✦</span></h2>
      {open.length === 0 && <p className="cc-meta cc-m0">{questions.length ? 'All questions are resolved.' : 'No open questions found.'}</p>}
      {open.map((q) => (
        <QuestionRow key={q.id} question={q} onChange={(patch) => onChange(q.id, patch)} />
      ))}
      {resolved.length > 0 && (
        <>
          <button type="button" className="cc-disclosure" aria-expanded={showResolved} aria-controls="resolved-questions"
            onClick={() => setShowResolved(!showResolved)}>
            Resolved ({resolved.length}) {showResolved ? '▴' : '▾'}
          </button>
          {showResolved && (
            <div id="resolved-questions">
              {resolved.map((q) => (
                <QuestionRow key={q.id} question={q} onChange={(patch) => onChange(q.id, patch)} />
              ))}
            </div>
          )}
        </>
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
    <div className={`cc-question${q.resolved ? ' is-resolved' : ''}`}>
      <span className="cc-qmark" aria-hidden="true">?</span>
      <input
        className="cc-question-text"
        value={draft}
        disabled={q.resolved}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={q.resolved ? 'Question wording (reopen to edit)' : 'Question wording'}
      />
      <button type="button" className="cc-textbtn" onClick={() => onChange({ resolved: !q.resolved })}>
        {q.resolved ? 'Reopen' : 'Resolve'}
      </button>
    </div>
  )
}
