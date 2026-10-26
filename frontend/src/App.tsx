import { useRef, useState } from 'react'
import { organize } from './api'
import NotesPanel from './components/NotesPanel'
import ResultsPanel from './components/ResultsPanel'
import { addTask, deleteTask, editTask, nextUserTaskId, updateQuestion } from './plan'
import type { Plan } from './types'

export type Status = 'idle' | 'loading' | 'error' | 'done'

export default function App() {
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState('')
  const idCounter = useRef(0) // user-added ids only ever count up this session

  async function handleOrganize() {
    setStatus('loading')
    try {
      setPlan(await organize(notes))
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chaos to Clarity</h1>
        <p>Messy meeting notes in. A plan you can verify out.</p>
      </header>
      <main className="workspace">
        <NotesPanel notes={notes} onChange={setNotes} onOrganize={handleOrganize} loading={status === 'loading'} />
        <ResultsPanel
          status={status}
          plan={plan}
          error={error}
          onRetry={handleOrganize}
          onQuestionChange={(id, patch) => setPlan((p) => p && { ...p, questions: updateQuestion(p.questions, id, patch) })}
          onEditTask={(id, edit) => setPlan((p) => p && { ...p, tasks: editTask(p.tasks, id, edit) })}
          onDeleteTask={(id) => setPlan((p) => p && { ...p, tasks: deleteTask(p.tasks, id) })}
          onAddTask={(input) => {
            if (!plan) return
            const { id, counter } = nextUserTaskId(plan.tasks, idCounter.current)
            idCounter.current = counter
            setPlan((p) => p && { ...p, tasks: addTask(p.tasks, input, id) })
          }}
        />
      </main>
    </div>
  )
}
