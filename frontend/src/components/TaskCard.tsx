import type { Task } from '../types'

interface Props {
  task: Task
  titleById: Map<string, string>
  index: number
}

export default function TaskCard({ task, titleById, index }: Props) {
  const needsClarify = task.deadline === null || task.deadlineAmbiguous
  const blockers = task.blockedBy.map((id) => titleById.get(id) ?? id)
  const sourceMissing = task.warnings.some((w) => w.includes('source phrase not found'))

  return (
    <article className={`task-card${task.warnings.length ? ' needs-verify' : ''}`} style={{ animationDelay: `${index * 30}ms` }}>
      <div className="task-head">
        <h3 className="task-title">{task.title}</h3>
        {task.warnings.length > 0 && <span className="pill pill-warn">Needs verification</span>}
      </div>

      <dl className="task-fields">
        <dt>Owner</dt>
        <dd>{task.owner ?? <span className="pill pill-warn">Unassigned</span>}</dd>

        <dt>Deadline</dt>
        <dd>
          {task.deadline ?? <span className="pill pill-warn">Deadline not specified</span>}
          {needsClarify && (
            <span className="clarify">
              {task.deadline === null ? 'Clarify the deadline' : 'Wording is unclear — clarify the deadline'}
            </span>
          )}
        </dd>
      </dl>

      {task.warnings.length > 0 && (
        <ul className="warnings" aria-label="Verification warnings">
          {task.warnings.map((w) => (
            <li key={w}>⚠ {w.replace(/^Needs verification: /, '')} — check it against your notes</li>
          ))}
        </ul>
      )}

      {task.sourcePhrase && (
        <blockquote className={`source${sourceMissing ? ' source-unverified' : ''}`}>
          <span className="source-label">{sourceMissing ? 'Quoted by AI — not found in your notes' : 'From your notes'}</span>
          “{task.sourcePhrase}”
        </blockquote>
      )}

      {(blockers.length > 0 || task.blockerNote) && (
        <p className="blocked">
          <span className="pill pill-blocked">Blocked</span>
          {[...blockers, ...(task.blockerNote ? [task.blockerNote] : [])].join(' · ')}
        </p>
      )}
    </article>
  )
}
