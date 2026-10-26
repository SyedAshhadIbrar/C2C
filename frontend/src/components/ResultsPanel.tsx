import type { Status } from '../App'
import type { Plan } from '../types'
import EmptyState from './EmptyState'
import TaskCard from './TaskCard'

interface Props {
  status: Status
  plan: Plan | null
  error: string
  onRetry: () => void
}

export default function ResultsPanel({ status, plan, error, onRetry }: Props) {
  const titleById = new Map(plan?.tasks.map((t) => [t.id, t.title]))

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
          <div className="task-list">
            {plan.tasks.map((t, i) => (
              <TaskCard key={t.id} task={t} titleById={titleById} index={i} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
