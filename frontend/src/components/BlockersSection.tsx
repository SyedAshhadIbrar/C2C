import { blockerRows } from '../plan'
import type { Task } from '../types'

export default function BlockersSection({ tasks }: { tasks: Task[] }) {
  const rows = blockerRows(tasks)

  return (
    <section className="results-section" aria-labelledby="blockers-title">
      <h2 id="blockers-title" className="panel-title">Blockers &amp; Dependencies <span className="count">{rows.length}</span></h2>
      {rows.length === 0 ? (
        <p className="muted section-empty">Nothing is blocked.</p>
      ) : (
        <ul className="blocker-list">
          {rows.map(({ task, dependencies }) => (
            <li key={task.id}>
              <span className="blocker-task">{task.title}</span>
              <span className="blocker-arrow" aria-label="is blocked by">←</span>
              <span className="blocker-deps">
                {dependencies.map((d, i) => (
                  <span key={i} className={d.known ? 'dep' : 'dep dep-unknown'}>
                    {!d.known && '⚠ '}
                    {d.label}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
