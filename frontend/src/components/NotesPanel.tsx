import { useState } from 'react'
import { findInNotes } from '../view'

interface Props {
  notes: string
  onChange: (notes: string) => void
  onOrganize: () => void
  onTrySample: () => void
  loading: boolean
  readOnly: boolean // true after a successful Organize, until "Edit notes"
  onEditNotes: () => void
  highlight: string | null // selected task's source phrase
}

export default function NotesPanel({ notes, onChange, onOrganize, onTrySample, loading, readOnly, onEditNotes, highlight }: Props) {
  const [showEmpty, setShowEmpty] = useState(false)
  const match = readOnly && highlight ? findInNotes(notes, highlight) : null

  function handleOrganize() {
    if (!notes.trim()) {
      setShowEmpty(true) // no request for empty notes
      return
    }
    setShowEmpty(false)
    onOrganize()
  }

  return (
    <div className="cc-notes">
      <div className="cc-headrow">
        <h1 className="cc-h1">Your notes <span className="cc-spark" aria-hidden="true">✦</span></h1>
        {readOnly && <button type="button" className="cc-textbtn" onClick={onEditNotes}>Edit notes</button>}
      </div>

      {readOnly ? (
        <div className="cc-notes-text" aria-label="Your notes (highlight shows the selected task's source)">
          {match ? (
            <>
              {notes.slice(0, match.start)}
              <mark className="cc-mark-hl">{notes.slice(match.start, match.end)}</mark>
              {notes.slice(match.end)}
            </>
          ) : (
            notes
          )}
        </div>
      ) : (
        <textarea
          id="notes"
          className="cc-notes-input"
          value={notes}
          onChange={(e) => {
            onChange(e.target.value)
            if (e.target.value.trim()) setShowEmpty(false)
          }}
          placeholder="Paste messy meeting notes, a brainstorm, or a long message…"
          aria-label="Meeting notes"
          spellCheck={false}
        />
      )}

      <p className="cc-meta">
        {notes.length} characters · <button type="button" className="cc-inlinelink" onClick={onTrySample}>Try sample notes</button>
      </p>
      {showEmpty && <p className="cc-inline-warn" role="alert">Paste notes first.</p>}
      <button type="button" className="cc-primary" onClick={handleOrganize} disabled={loading}>
        {loading ? 'Organizing…' : 'Organize notes →'}
      </button>
    </div>
  )
}
