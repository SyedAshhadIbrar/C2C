import type { Plan } from '../types'
import { clarityStats, completeness } from '../view'
import { CalendarIcon, PersonIcon } from './Icons'

export default function ClarityStats({ plan }: { plan: Plan }) {
  const s = clarityStats(plan)
  const pct = (v: number | null) => (v === null ? '—' : `${v}%`)
  const scores = plan.tasks.map(completeness)
  const summary = scores.map((sc, i) => `task ${i + 1}: ${sc} of 3`).join(', ')

  return (
    <div className="cc-clarity">
      <h1 className="cc-h1 cc-mb24">Clarity</h1>
      <div className="cc-stats">
        <div className="cc-stat">
          <span className="cc-ring"><PersonIcon /></span>
          <span className="cc-stat-num">{pct(s.ownerPct)}</span>
          <span className="cc-stat-label"><span className="cc-long">tasks have an owner</span><span className="cc-short">have owner</span></span>
        </div>
        <div className="cc-stat">
          <span className="cc-ring"><CalendarIcon /></span>
          <span className="cc-stat-num">{pct(s.deadlinePct)}</span>
          <span className="cc-stat-label"><span className="cc-long">tasks have a deadline</span><span className="cc-short">have date</span></span>
        </div>
        <div className="cc-stat">
          <span className="cc-ring cc-ring-q" aria-hidden="true">?</span>
          <span className="cc-stat-num">{s.openQuestions}</span>
          <span className="cc-stat-label"><span className="cc-long">open questions</span><span className="cc-short">questions</span></span>
        </div>
      </div>

      {scores.length > 0 && (
        <div className="cc-bars-wrap">
          <div className="cc-bars" role="img" aria-label={`Completeness per task (owner, deadline, source found in notes): ${summary}`}>
            {scores.map((sc, i) => (
              <div key={plan.tasks[i].id} className="cc-bar-col">
                <span className={sc === 3 ? 'cc-bar cc-bar-full' : 'cc-bar'} style={{ height: `${Math.max(sc, 0.15) * 33.34}%` }} />
              </div>
            ))}
          </div>
          <div className="cc-bar-labels" aria-hidden="true">
            {scores.map((_, i) => <span key={i}>T{i + 1}</span>)}
          </div>
          <p className="cc-meta">Owner + deadline + source found in notes, per task</p>
        </div>
      )}
    </div>
  )
}
