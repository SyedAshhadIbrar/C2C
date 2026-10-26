import { useState } from 'react'
import { titleError } from '../plan'

export interface TaskFormValues {
  title: string
  owner: string
  deadline: string
  sourcePhrase?: string // present only when adding a task
}

/** Inline edit / add panel from the reference design (underlined fields, Save + Cancel). */
export default function TaskForm({ initial, submitLabel, onSubmit, onCancel, label }: {
  initial: TaskFormValues
  submitLabel: string
  onSubmit: (values: TaskFormValues) => void
  onCancel: () => void
  label: string
}) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const set = (field: keyof TaskFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [field]: e.target.value })

  return (
    <form
      className="cc-form"
      aria-label={label}
      onSubmit={(e) => {
        e.preventDefault()
        const err = titleError(values.title)
        setError(err)
        if (!err) onSubmit(values)
      }}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <label className="cc-field cc-field-wide">
        Title
        <input value={values.title} onChange={set('title')} autoFocus aria-invalid={!!error} />
      </label>
      <label className="cc-field">
        Owner
        <input value={values.owner} onChange={set('owner')} placeholder="Unassigned" />
      </label>
      <label className="cc-field">
        Deadline
        <input value={values.deadline} onChange={set('deadline')} placeholder="as written, e.g. by Friday" />
      </label>
      {values.sourcePhrase !== undefined && (
        <label className="cc-field cc-field-wide">
          Source phrase (optional)
          <input value={values.sourcePhrase} onChange={set('sourcePhrase')} />
        </label>
      )}
      <span className="cc-form-actions">
        <button type="submit" className="cc-primary cc-primary-sm">{submitLabel}</button>
        <button type="button" className="cc-textbtn" onClick={onCancel}>Cancel</button>
      </span>
      {error && <p className="cc-field-error" role="alert">{error}</p>}
    </form>
  )
}
