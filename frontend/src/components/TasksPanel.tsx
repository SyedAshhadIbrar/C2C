import type { Status } from '../App'
import { blockerRows, type NewTask, type TaskEdit } from '../plan'
import type { Plan, Question } from '../types'
import { matchesSearch } from '../view'
import BlockersSection from './BlockersSection'
import OpenQuestions from './OpenQuestions'
import TaskForm from './TaskForm'
import TaskRow from './TaskRow'

interface Props {
  status: Status
  plan: Plan | null
  error: string
  onRetry: () => void
  onTrySample: () => void
  search: string
  onClearSearch: () => void
  selectedId: string | null
  editingId: string | null
  adding: boolean
  onSelect: (id: string) => void
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onSetAdding: (adding: boolean) => void
  onEditTask: (id: string, edit: TaskEdit) => void
  onDeleteTask: (id: string) => void
  onAddTask: (input: NewTask) => void
  onQuestionChange: (id: string, patch: Partial<Omit<Question, 'id'>>) => void
}

export default function TasksPanel(p: Props) {
  const { status, plan } = p

  if (status === 'idle' || !plan) {
    return (
      <section className="cc-col-m" aria-labelledby="tasks-title">
        <div className="cc-tasks-head">
          <h1 id="tasks-title" className="cc-h1">Tasks for this meeting</h1>
        </div>
        {status === 'loading' ? <Loading /> : status === 'error' ? <ErrorBox error={p.error} onRetry={p.onRetry} /> : (
          <div className="cc-empty">
            <p className="cc-empty-title">Your action plan will appear here</p>
            <p className="cc-meta">Paste your notes and choose <b>Organize notes →</b>. You'll get tasks with the exact phrase from your notes that supports each one, plus open questions and blockers. Missing owners and dates are marked, never guessed.</p>
            <button type="button" className="cc-textbtn" onClick={p.onTrySample}>Try sample notes</button>
          </div>
        )}
      </section>
    )
  }

  const visible = plan.tasks.filter((t) => matchesSearch(t, p.search))
  const openQs = plan.questions.filter((q) => !q.resolved).length
  const blockers = blockerRows(plan.tasks).length
  const filtering = p.search.trim() !== ''

  return (
    <section className="cc-col-m" aria-labelledby="tasks-title" aria-busy={status === 'loading'}>
      <div className="cc-tasks-head">
        <div className="cc-headrow cc-wrap">
          <h1 id="tasks-title" className="cc-h1"><span className="cc-long">Tasks for this meeting</span><span className="cc-short">Tasks</span></h1>
          <button type="button" className="cc-textbtn" onClick={() => p.onSetAdding(true)} disabled={p.adding}>+ Add task</button>
        </div>
        <div className="cc-chips">
          <a href="#tasks" className="chip chip-grey cc-link">#{plan.tasks.length} tasks</a>
          <a href="#questions" className={`chip ${openQs ? 'chip-lime' : 'chip-grey'} cc-link`}>#{openQs} questions</a>
          <a href="#blockers" className={`chip ${blockers ? 'chip-orange' : 'chip-grey'} cc-link`}>#{blockers} blockers</a>
          {plan.mode === 'sample' && <span className="chip chip-outline cc-mode-mobile">Sample mode · no AI call</span>}
        </div>
      </div>

      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorBox error={p.error} onRetry={p.onRetry} />}

      <div id="tasks" className="cc-tasks">
        {filtering && (
          <p className="cc-filter-note" role="status">
            Showing {visible.length} of {plan.tasks.length} tasks matching “{p.search.trim()}” ·{' '}
            <button type="button" className="cc-inlinelink" onClick={p.onClearSearch}>Clear search</button>
          </p>
        )}
        {plan.tasks.length === 0 && !p.adding && <p className="cc-meta cc-pad">No actionable tasks found in these notes.</p>}
        {plan.tasks.length > 0 && visible.length === 0 && <p className="cc-meta cc-pad">No tasks match your search.</p>}
        {visible.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            tasks={plan.tasks}
            selected={p.selectedId === t.id}
            editing={p.editingId === t.id}
            onSelect={() => p.onSelect(t.id)}
            onStartEdit={() => p.onStartEdit(t.id)}
            onCancelEdit={p.onCancelEdit}
            onSave={(edit) => p.onEditTask(t.id, edit)}
            onDelete={() => p.onDeleteTask(t.id)}
          />
        ))}
        {p.adding && (
          <div className="cc-row cc-row-add">
            <p className="cc-add-title">New task <span className="chip chip-sm chip-grey">User-added</span></p>
            <TaskForm
              label="Add a task"
              initial={{ title: '', owner: '', deadline: '', sourcePhrase: '' }}
              submitLabel="Add task"
              onSubmit={(v) => p.onAddTask(v)}
              onCancel={() => p.onSetAdding(false)}
            />
          </div>
        )}
      </div>

      <OpenQuestions questions={plan.questions} onChange={p.onQuestionChange} />
      <BlockersSection tasks={plan.tasks} />
    </section>
  )
}

function Loading() {
  return (
    <div className="cc-loading" role="status" aria-live="polite">
      <p className="cc-meta">Organizing your notes…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="cc-skel-row" aria-hidden="true">
          <span className="cc-skel cc-skel-title" /><span className="cc-skel cc-skel-src" /><span className="cc-skel cc-skel-chip" />
        </div>
      ))}
    </div>
  )
}

function ErrorBox({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="cc-error" role="alert">
      <p><span className="cc-warn-mark" aria-hidden="true">⚠</span> {error}</p>
      <p className="cc-meta cc-m0">Your notes are kept.</p>
      <button type="button" className="cc-primary cc-primary-sm" onClick={onRetry}>Retry</button>
    </div>
  )
}
