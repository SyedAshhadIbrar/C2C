export interface ToastMessage {
  id: number
  text: string
  tone: 'ok' | 'error'
}

/** Bottom-center pill from the reference ("Copied"). Announced to screen readers. */
export default function Toast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div className="cc-toast-region" role="status" aria-live="polite">
      {toast && <span key={toast.id} className={`cc-toast${toast.tone === 'error' ? ' is-error' : ''}`}>{toast.text}</span>}
    </div>
  )
}
