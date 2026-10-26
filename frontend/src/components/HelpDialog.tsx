import { useEffect, useRef } from 'react'
import { CloseIcon } from './Icons'

/** Native <dialog>: focus is trapped while open, Escape closes, focus returns to the opener. */
export default function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} className="cc-dialog" aria-labelledby="help-title" onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}>
      <div className="cc-dialog-body">
        <div className="cc-headrow">
          <h2 id="help-title" className="cc-h2 cc-m0">What the labels mean</h2>
          <button type="button" className="cc-iconbtn" aria-label="Close help" onClick={onClose}><CloseIcon /></button>
        </div>
        <dl className="cc-help">
          <dt><span className="chip chip-sm chip-orange">Needs verification</span></dt>
          <dd>The AI's answer didn't fully match your notes: its quote isn't in the notes, or the owner or deadline isn't in its quote. The task is still shown so you can check it. Nothing is hidden.</dd>
          <dt><span className="chip chip-sm chip-orange">Quote not found in notes</span></dt>
          <dd>The source phrase the AI quoted doesn't appear in your notes (ignoring capitalization, extra spaces, and quote style). Treat it as unverified.</dd>
          <dt>Source quote “…”</dt>
          <dd>The exact text from your notes that supports a task. Select a task's title to highlight its source in your notes.</dd>
          <dt><span className="chip chip-sm chip-orange">Unassigned</span> <span className="chip chip-sm chip-orange">No date</span></dt>
          <dd>Your notes don't name an owner or a deadline. Nothing is guessed. Use ⋯ → Edit, or <b>Set dates →</b>, to fill them in.</dd>
          <dt><span className="chip chip-sm chip-lime">by Friday</span></dt>
          <dd>A deadline, kept exactly as written in your notes. It's never converted to a calendar date. <span className="chip chip-sm chip-orange">Unclear wording · clarify</span> means the wording is vague.</dd>
          <dt><span className="chip chip-sm chip-grey">User-added</span></dt>
          <dd>A task you created. It isn't checked against the notes; any source you entered is marked "Your source · not checked".</dd>
          <dt><span className="chip chip-sm chip-grey">User-edited</span></dt>
          <dd>You changed the task's title.</dd>
          <dt><span className="chip chip-sm chip-grey">User-provided owner / deadline</span></dt>
          <dd>You entered or changed that value. It's yours, not the AI's, and not verified against the notes.</dd>
          <dt>Blocked by <span className="chip chip-sm chip-outline">task</span> <span className="chip chip-sm chip-orange">⚠ Unknown task "t9"</span></dt>
          <dd>What a task is waiting on. A reference to a missing or deleted task, or to the task itself, stays visible with ⚠ instead of disappearing.</dd>
          <dt>Sample mode · no AI call</dt>
          <dd>No API key is set, so results come from a saved sample for the demo notes. The checks still run.</dd>
          <dt>Export / Copy Markdown</dt>
          <dd>Saves or copies the plan exactly as shown, with every label. Search only filters the screen; it doesn't change what's exported.</dd>
        </dl>
      </div>
    </dialog>
  )
}
