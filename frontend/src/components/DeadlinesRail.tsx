import type { Task } from '../types'
import { deadlineGroups } from '../view'

interface Props {
  tasks: Task[]
  onSelect: (id: string) => void
  onSetDates: (id: string) => void // opens editing for that task
}

/** Grouped by the exact deadline wording from the notes: never converted to calendar dates. */
export default function DeadlinesRail({ tasks, onSelect, onSetDates }: Props) {
  const { dated, undated } = deadlineGroups(tasks)

  return (
    <aside className="cc-col-r" aria-labelledby="deadlines-title">
      <h1 id="deadlines-title" className="cc-h1 cc-mb24">Deadlines</h1>
      {tasks.length === 0 ? (
        <p className="cc-meta cc-m0">Deadlines from your tasks appear here, exactly as written.</p>
      ) : (
        <div className="cc-deadlines">
          {dated.map((g) => (
            <div key={g.wording} className="cc-deadline">
              <span className="cc-deadline-wording">{g.wording}</span>
              <ul className="cc-deadline-tasks">
                {g.tasks.map((t) => (
                  <li key={t.id}>
                    <button type="button" className="cc-linkbtn" onClick={() => onSelect(t.id)}>{t.title}</button>
                    {t.deadlineAmbiguous && <span className="cc-unclear"> · unclear wording</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="cc-deadline cc-deadline-last">
            <span className="chip chip-orange">No date ({undated.length})</span>
            {undated.length > 0 ? (
              <>
                <ul className="cc-deadline-tasks cc-deadline-undated">
                  {undated.map((t) => (
                    <li key={t.id}><button type="button" className="cc-linkbtn" onClick={() => onSelect(t.id)}>{t.title}</button></li>
                  ))}
                </ul>
                <button type="button" className="cc-textbtn cc-mt10" onClick={() => onSetDates(undated[0].id)}>Set dates →</button>
              </>
            ) : (
              <p className="cc-meta cc-mt10">Every task has a deadline.</p>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
