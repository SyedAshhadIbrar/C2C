import type { Task } from '../types'

interface Props {
  task: Task
  titleById: Map<string, string>
  index: number
}

export default function TaskCard({ task, titleById, index }: Props) {
  const needsClarify = task.deadline === null || task.deadlineAmbiguous
  const blockers = task.blockedBy.map((id) => titleById.get(id) ?? id)

  return (
    <article className="task-card" style={{ animationDelay: `${index * 30}ms` }}>
      <h3 className="task-title">{task.title}</h3>

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

      {task.sourcePhrase && (
        <blockquote className="source">
          <span className="source-label">From your notes</span>“{task.sourcePhrase}”
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
