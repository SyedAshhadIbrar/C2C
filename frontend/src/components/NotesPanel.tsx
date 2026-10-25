import { useState } from 'react'

interface Props {
  notes: string
  onChange: (notes: string) => void
  onOrganize: () => void
  loading: boolean
}

export default function NotesPanel({ notes, onChange, onOrganize, loading }: Props) {
  const [showEmpty, setShowEmpty] = useState(false)

  function handleClick() {
    if (!notes.trim()) {
      setShowEmpty(true) // no request for empty notes
      return
    }
    setShowEmpty(false)
    onOrganize()
  }

  return (
    <section className="panel notes-panel" aria-label="Meeting notes">
      <label htmlFor="notes" className="panel-title">Your notes</label>
      <textarea
        id="notes"
        value={notes}
        onChange={(e) => {
          onChange(e.target.value)
          if (e.target.value.trim()) setShowEmpty(false)
        }}
        placeholder="Paste messy meeting notes, a brainstorm, or a long message…"
        spellCheck={false}
      />
      {showEmpty && <p className="inline-msg" role="alert">Paste notes first.</p>}
      <button className="btn-primary" onClick={handleClick} disabled={loading}>
        {loading ? 'Organizing…' : 'Organize Notes'}
      </button>
    </section>
  )
}
