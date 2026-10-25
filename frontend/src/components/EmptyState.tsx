export default function EmptyState() {
  return (
    <div className="empty-state">
      <h2>Your action plan will appear here</h2>
      <p>Paste your notes and click <strong>Organize Notes</strong>. You'll get:</p>
      <ul>
        <li><strong>Task cards</strong>, each with an owner, deadline, and the exact phrase from your notes that supports it</li>
        <li><strong>Blockers &amp; dependencies</strong> between tasks</li>
        <li><strong>Open questions</strong> that still need an answer</li>
      </ul>
      <p className="muted">Anything your notes don't say, like a missing owner or date, is marked, not guessed.</p>
    </div>
  )
}
