import { useState } from 'react'
import { badgesOf, dependenciesOf, sourceKind, titleError, type TaskEdit } from '../plan'
import type { Task } from '../types'

interface Props {
  task: Task
  tasks: Task[]
  index: number
  onEdit: (edit: TaskEdit) => void
  onDelete: () => void
}

const Badge = ({ children }: { children: string }) => <span className="pill pill-user">{children}</span>

export default function TaskCard({ task, tasks, index, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const needsClarify = task.deadline === null || task.deadlineAmbiguous
  const blockers = dependenciesOf(task, tasks)
  const badges = badgesOf(task)
  const source = sourceKind(task)

  return (
    <article className={`task-card${task.warnings.length ? ' needs-verify' : ''}`} style={{ animationDelay: `${index * 30}ms` }}>
      {editing ? (
        <TaskForm
          initial={{ title: task.title, owner: task.owner ?? '', deadline: task.deadline ?? '' }}
          submitLabel="Save"
          onSubmit={(values) => {
            onEdit(values)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="task-head">
            <h3 className="task-title">{task.title}</h3>
            {badges.title && <Badge>{badges.title}</Badge>}
            {task.warnings.length > 0 && <span className="pill pill-warn">Needs verification</span>}
          </div>

          <dl className="task-fields">
            <dt>Owner</dt>
            <dd>
              {task.owner ?? <span className="pill pill-warn">Unassigned</span>}
              {badges.owner && <Badge>User-provided</Badge>}
            </dd>

            <dt>Deadline</dt>
            <dd>
              {task.deadline ?? <span className="pill pill-warn">Deadline not specified</span>}
              {badges.deadline && <Badge>User-provided</Badge>}
              {needsClarify && (
                <span className="clarify">
                  {task.deadline === null ? 'Clarify the deadline' : 'Wording is unclear — clarify the deadline'}
                </span>
              )}
            </dd>
          </dl>
        </>
      )}

      {task.warnings.length > 0 && (
        <ul className="warnings" aria-label="Verification warnings">
          {task.warnings.map((w) => (
            <li key={w}>⚠ {w.replace(/^Needs verification: /, '')} — check it against your notes</li>
          ))}
        </ul>
      )}

      {source &&
        (source === 'user' ? (
          <blockquote className="source source-user">
            <span className="source-label">Source you entered — not checked against the notes</span>“{task.sourcePhrase}”
          </blockquote>
        ) : (
          <blockquote className={`source${source === 'unverified' ? ' source-unverified' : ''}`}>
            <span className="source-label">{source === 'unverified' ? 'Quoted by AI — not found in your notes' : 'From your notes'}</span>
            “{task.sourcePhrase}”
          </blockquote>
        ))}

      {blockers.length > 0 && (
        <p className="blocked">
          <span className="pill pill-blocked">Blocked</span>
          {blockers.map((d, i) => (
            <span key={i} className={d.known ? 'dep' : 'dep dep-unknown'}>
              {!d.known && '⚠ '}
              {d.label}
            </span>
          ))}
        </p>
      )}

      {!editing && (
        <div className="task-actions">
          {confirmDelete ? (
            <span className="confirm" role="group" aria-label="Confirm delete">
              Delete this task?
              <button className="btn-ghost btn-danger" onClick={onDelete}>Yes</button>
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>No</button>
            </span>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn-ghost" onClick={() => setConfirmDelete(true)}>Delete</button>
            </>
          )}
        </div>
      )}
    </article>
  )
}

export interface TaskFormValues {
  title: string
  owner: string
  deadline: string
  sourcePhrase?: string
}

/** Shared by Edit (title/owner/deadline) and Add task (plus optional source phrase). */
export function TaskForm({ initial, submitLabel, onSubmit, onCancel }: {
  initial: TaskFormValues
  submitLabel: string
  onSubmit: (values: TaskFormValues) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const set = (field: keyof TaskFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [field]: e.target.value })

  return (
    <form
      className="task-form"
      onSubmit={(e) => {
        e.preventDefault()
        const err = titleError(values.title)
        setError(err)
        if (!err) onSubmit(values)
      }}
    >
      <label>
        Title
        <input value={values.title} onChange={set('title')} autoFocus aria-invalid={!!error} />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <label>
        Owner <span className="muted">(leave empty if unknown)</span>
        <input value={values.owner} onChange={set('owner')} />
      </label>
      <label>
        Deadline <span className="muted">(as written, e.g. "by Friday"; empty if unknown)</span>
        <input value={values.deadline} onChange={set('deadline')} />
      </label>
      {values.sourcePhrase !== undefined && (
        <label>
          Source phrase <span className="muted">(optional)</span>
          <input value={values.sourcePhrase} onChange={set('sourcePhrase')} />
        </label>
      )}
      <div className="task-actions">
        <button type="submit" className="btn-primary btn-small">{submitLabel}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
