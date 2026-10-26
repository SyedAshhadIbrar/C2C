import { useState } from 'react'
import { downloadMarkdown, toMarkdown } from '../exportMarkdown'
import type { Status } from '../App'
import type { NewTask, TaskEdit } from '../plan'
import type { Plan, Question } from '../types'
import BlockersSection from './BlockersSection'
import EmptyState from './EmptyState'
import OpenQuestions from './OpenQuestions'
import TaskCard, { TaskForm } from './TaskCard'

interface Props {
  status: Status
  plan: Plan | null
  error: string
  onRetry: () => void
  onQuestionChange: (id: string, patch: Partial<Omit<Question, 'id'>>) => void
  onEditTask: (id: string, edit: TaskEdit) => void
  onDeleteTask: (id: string) => void
  onAddTask: (input: NewTask) => void
}

export default function ResultsPanel({ status, plan, error, onRetry, onQuestionChange, onEditTask, onDeleteTask, onAddTask }: Props) {
  const [adding, setAdding] = useState(false)

  return (
    <section className="panel results-panel" aria-label="Organized results" aria-busy={status === 'loading'}>
      {status === 'idle' && <EmptyState />}
      {status === 'loading' && <p className="loading">Organizing your notes…</p>}
      {status === 'error' && (
        <div className="error-msg" role="alert">
          <p>{error}</p>
          <button className="btn-secondary" onClick={onRetry}>Retry</button>
        </div>
      )}
      {status === 'done' && plan && (
        <>
          <div className="results-toolbar">
            <h2 className="panel-title">Tasks <span className="count">{plan.tasks.length}</span></h2>
            <div className="toolbar-actions">
              {plan.mode === 'sample' && (
                <span className="pill pill-warn" title="No API key set, so this is a saved sample response for demo/notes.txt">
                  Sample mode · no AI call
                </span>
              )}
              <button className="btn-ghost" onClick={() => setAdding(true)} disabled={adding}>+ Add task</button>
              <button className="btn-ghost" onClick={() => downloadMarkdown(toMarkdown(plan))} title="Download the plan as shown (saved edits only)">
                Export Markdown
              </button>
            </div>
          </div>
          {plan.tasks.length === 0 && !adding ? (
            <p className="muted section-empty">No actionable tasks found in these notes.</p>
          ) : (
            <div className="task-list">
              {plan.tasks.map((t, i) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  tasks={plan.tasks}
                  index={i}
                  onEdit={(edit) => onEditTask(t.id, edit)}
                  onDelete={() => onDeleteTask(t.id)}
                />
              ))}
              {adding && (
                <div className="task-card add-card">
                  <h3 className="task-title">New task</h3>
                  <TaskForm
                    initial={{ title: '', owner: '', deadline: '', sourcePhrase: '' }}
                    submitLabel="Add task"
                    onSubmit={(values) => {
                      onAddTask(values)
                      setAdding(false)
                    }}
                    onCancel={() => setAdding(false)}
                  />
                </div>
              )}
            </div>
          )}
          <BlockersSection tasks={plan.tasks} />
          <OpenQuestions questions={plan.questions} onChange={onQuestionChange} />
        </>
      )}
    </section>
  )
}
