import type { Status } from '../App'
import type { Plan, Question } from '../types'
import BlockersSection from './BlockersSection'
import EmptyState from './EmptyState'
import OpenQuestions from './OpenQuestions'
import TaskCard from './TaskCard'

interface Props {
  status: Status
  plan: Plan | null
  error: string
  onRetry: () => void
  onQuestionChange: (id: string, patch: Partial<Omit<Question, 'id'>>) => void
}

export default function ResultsPanel({ status, plan, error, onRetry, onQuestionChange }: Props) {
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
            {plan.mode === 'sample' && (
              <span className="pill pill-warn" title="No API key set, so this is a saved sample response for demo/notes.txt">
                Sample mode · no AI call
              </span>
            )}
          </div>
          {plan.tasks.length === 0 ? (
            <p className="muted section-empty">No actionable tasks found in these notes.</p>
          ) : (
            <div className="task-list">
              {plan.tasks.map((t, i) => (
                <TaskCard key={t.id} task={t} tasks={plan.tasks} index={i} />
              ))}
            </div>
          )}
          <BlockersSection tasks={plan.tasks} />
          <OpenQuestions questions={plan.questions} onChange={onQuestionChange} />
        </>
      )}
    </section>
  )
}
