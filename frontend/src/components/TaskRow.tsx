import { useEffect, useRef, useState } from 'react'
import { badgesOf, dependenciesOf, sourceKind, type TaskEdit } from '../plan'
import type { Task } from '../types'
import { initial } from '../view'
import TaskForm from './TaskForm'

interface Props {
  task: Task
  tasks: Task[]
  selected: boolean
  editing: boolean
  onSelect: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (edit: TaskEdit) => void
  onDelete: () => void
}

export default function TaskRow({ task, tasks, selected, editing, onSelect, onStartEdit, onCancelEdit, onSave, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const badges = badgesOf(task)
  const source = sourceKind(task)
  const deps = dependenciesOf(task, tasks)

  const flags: { text: string; tone: 'grey' | 'orange'; title?: string }[] = []
  if (badges.title) flags.push({ text: badges.title, tone: 'grey' })
  if (badges.owner) flags.push({ text: 'User-provided owner', tone: 'grey' })
  if (badges.deadline) flags.push({ text: 'User-provided deadline', tone: 'grey' })
  if (task.warnings.length) flags.push({ text: 'Needs verification', tone: 'orange' })
  if (source === 'unverified') flags.push({ text: 'Quote not found in notes', tone: 'orange' })
  if (source === 'user') flags.push({ text: 'Your source · not checked', tone: 'grey', title: 'Source you entered — not checked against the notes' })
  if (task.deadline && task.deadlineAmbiguous) flags.push({ text: 'Unclear wording · clarify', tone: 'orange' })

  return (
    <div className={`cc-row${selected ? ' is-selected' : ''}`} id={`task-${task.id}`}>
      <div className="cc-row-main">
        <button type="button" className="cc-row-title" onClick={onSelect} aria-pressed={selected}
          title={selected ? 'Selected: its source is highlighted in your notes' : 'Select to highlight its source in your notes'}>
          {task.title}
        </button>
        <span className="cc-src">{task.sourcePhrase ? `“${task.sourcePhrase}”` : <span className="cc-muted">No source phrase</span>}</span>
        <span className="cc-row-chips">
          {task.owner ? (
            <span className="cc-avatar" title={task.owner} aria-label={`Owner: ${task.owner}`}>{initial(task.owner)}</span>
          ) : (
            <span className="chip chip-orange" aria-label="Owner: unassigned">Unassigned</span>
          )}
          {task.deadline ? (
            <span className="chip chip-lime" aria-label={`Deadline: ${task.deadline}`}>{task.deadline}</span>
          ) : (
            <span className="chip chip-orange" title="Deadline not specified — clarify the deadline" aria-label="Deadline not specified, clarify">No date</span>
          )}
        </span>
        <RowMenu
          open={menuOpen}
          setOpen={setMenuOpen}
          label={task.title}
          onEdit={() => { setConfirmDelete(false); onStartEdit() }}
          onDelete={() => setConfirmDelete(true)}
        />
      </div>

      {(flags.length > 0 || deps.length > 0) && (
        <div className="cc-row-meta">
          {flags.map((f) => (
            <span key={f.text} className={`chip chip-sm chip-${f.tone}`} title={f.title}>{f.text}</span>
          ))}
          {deps.length > 0 && (
            <span className="cc-deps">
              <span className="cc-muted">Blocked by</span>
              {deps.map((d, i) => (
                <span key={i} className={d.known ? 'chip chip-sm chip-outline' : 'chip chip-sm chip-orange'}>
                  {!d.known && '⚠ '}{d.label}
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      {task.warnings.length > 0 && (
        <ul className="cc-warnings" aria-label="Verification warnings">
          {task.warnings.map((w) => (
            <li key={w}><span className="cc-warn-mark" aria-hidden="true">⚠</span> {w.replace(/^Needs verification: /, '')}. Check it against your notes.</li>
          ))}
        </ul>
      )}

      {confirmDelete && (
        <div className="cc-confirm" role="group" aria-label="Confirm delete">
          <span>Delete this task?</span>
          <button type="button" className="cc-primary cc-primary-sm" onClick={onDelete}>Yes, delete</button>
          <button type="button" className="cc-textbtn" onClick={() => setConfirmDelete(false)}>No</button>
        </div>
      )}

      {editing && (
        <TaskForm
          label={`Edit ${task.title}`}
          initial={{ title: task.title, owner: task.owner ?? '', deadline: task.deadline ?? '' }}
          submitLabel="Save"
          onSubmit={(v) => onSave({ title: v.title, owner: v.owner, deadline: v.deadline })}
          onCancel={onCancelEdit}
        />
      )}
    </div>
  )
}

function RowMenu({ open, setOpen, label, onEdit, onDelete }: {
  open: boolean
  setOpen: (o: boolean) => void
  label: string
  onEdit: () => void
  onDelete: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      ref.current?.querySelector<HTMLButtonElement>('.cc-dots')?.focus()
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open, setOpen])

  const pick = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div className="cc-menu" ref={ref}>
      <button type="button" className={`cc-dots${open ? ' is-open' : ''}`} aria-label={`More actions for ${label}`}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
      {open && (
        <div className="cc-menu-list" role="menu">
          <button type="button" role="menuitem" onClick={pick(onEdit)}>Edit</button>
          <button type="button" role="menuitem" onClick={pick(onDelete)}>Delete</button>
        </div>
      )}
    </div>
  )
}
