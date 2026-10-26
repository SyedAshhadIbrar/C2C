import { useEffect, useRef, useState } from 'react'
import sampleNotes from '../../demo/notes.txt?raw'
import { organize } from './api'
import ClarityStats from './components/ClarityStats'
import DeadlinesRail from './components/DeadlinesRail'
import Header from './components/Header'
import HelpDialog from './components/HelpDialog'
import NotesPanel from './components/NotesPanel'
import TasksPanel from './components/TasksPanel'
import Toast, { type ToastMessage } from './components/Toast'
import { downloadMarkdown, toMarkdown } from './exportMarkdown'
import { addTask, deleteTask, editTask, nextUserTaskId, updateQuestion } from './plan'
import type { Plan } from './types'

export type Status = 'idle' | 'loading' | 'error' | 'done'

export default function App() {
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState('')
  const idCounter = useRef(0) // user-added ids only ever count up this session

  // Screen-only state: none of it changes the plan or the export.
  const [notesEditing, setNotesEditing] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const notify = (text: string, tone: ToastMessage['tone'] = 'ok') => setToast({ id: Date.now(), text, tone })

  async function handleOrganize() {
    setStatus('loading')
    try {
      setPlan(await organize(notes))
      setStatus('done')
      setNotesEditing(false)
      setSelectedId(null)
      setEditingId(null)
      setAdding(false)
      setSearch('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  function revealTask(id: string, edit = false) {
    setSearch('') // make sure the row is visible
    setSelectedId(id)
    if (edit) setEditingId(id)
    requestAnimationFrame(() => document.getElementById(`task-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }

  async function copyMarkdown() {
    if (!plan) return
    try {
      if (!navigator.clipboard) throw new Error('Clipboard not available')
      // A blocked permission prompt can leave writeText pending forever; never stay silent.
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      await Promise.race([navigator.clipboard.writeText(toMarkdown(plan)), timeout])
      notify('Copied')
    } catch {
      notify("Couldn't confirm the copy. Use Export instead.", 'error')
    }
  }

  return (
    <div className="cc-shell">
      <div className="cc-page">
        <Header
          mode={plan?.mode ?? null}
          search={search}
          onSearch={setSearch}
          onExport={() => plan && downloadMarkdown(toMarkdown(plan))}
          onCopy={copyMarkdown}
          onHelp={() => setHelpOpen(true)}
        />
        <main className="cc-grid">
          <section className="cc-col-l" aria-label="Notes and clarity">
            <NotesPanel
              notes={notes}
              onChange={setNotes}
              onOrganize={handleOrganize}
              onTrySample={() => {
                setNotes(sampleNotes)
                setNotesEditing(true)
              }}
              loading={status === 'loading'}
              readOnly={!!plan && !notesEditing}
              onEditNotes={() => setNotesEditing(true)}
              highlight={plan?.tasks.find((t) => t.id === selectedId)?.sourcePhrase ?? null}
            />
            {plan && <ClarityStats plan={plan} />}
          </section>

          <TasksPanel
            status={status}
            plan={plan}
            error={error}
            onRetry={handleOrganize}
            onTrySample={() => {
              setNotes(sampleNotes)
              setNotesEditing(true)
            }}
            search={search}
            onClearSearch={() => setSearch('')}
            selectedId={selectedId}
            editingId={editingId}
            adding={adding}
            onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
            onStartEdit={(id) => {
              setEditingId(id)
              setSelectedId(id)
            }}
            onCancelEdit={() => setEditingId(null)}
            onSetAdding={setAdding}
            onEditTask={(id, edit) => {
              setPlan((p) => p && { ...p, tasks: editTask(p.tasks, id, edit) })
              setEditingId(null)
            }}
            onDeleteTask={(id) => {
              setPlan((p) => p && { ...p, tasks: deleteTask(p.tasks, id) })
              if (selectedId === id) setSelectedId(null)
              if (editingId === id) setEditingId(null)
            }}
            onAddTask={(input) => {
              if (!plan) return
              const { id, counter } = nextUserTaskId(plan.tasks, idCounter.current)
              idCounter.current = counter
              setPlan((p) => p && { ...p, tasks: addTask(p.tasks, input, id) })
              setAdding(false)
              revealTask(id)
            }}
            onQuestionChange={(id, patch) => setPlan((p) => p && { ...p, questions: updateQuestion(p.questions, id, patch) })}
          />

          <DeadlinesRail tasks={plan?.tasks ?? []} onSelect={(id) => revealTask(id)} onSetDates={(id) => revealTask(id, true)} />
        </main>
      </div>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Toast toast={toast} />
    </div>
  )
}
