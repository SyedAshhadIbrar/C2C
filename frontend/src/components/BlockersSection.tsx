import { blockerRows } from '../plan'
import type { Task } from '../types'

export default function BlockersSection({ tasks }: { tasks: Task[] }) {
  const rows = blockerRows(tasks)

  return (
    <section id="blockers" className="cc-section" aria-labelledby="blockers-title">
      <h2 id="blockers-title" className="cc-h2">Blockers</h2>
      {rows.length === 0 ? (
        <p className="cc-meta cc-m0">Nothing is blocked.</p>
      ) : (
        <ul className="cc-blockers">
          {rows.map(({ task, dependencies }) => (
            <li key={task.id}>
              <span className="cc-blocker-task">{task.title}</span>
              <span className="cc-muted" aria-label="is blocked by">←</span>
              {dependencies.map((d, i) => (
                <span key={i} className={d.known ? 'chip chip-sm chip-outline' : 'chip chip-sm chip-orange'}>
                  {!d.known && '⚠ '}{d.label}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
