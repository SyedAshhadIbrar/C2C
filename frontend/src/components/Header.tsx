import { useState } from 'react'
import type { Mode } from '../types'
import { CloseIcon, HelpIcon, MenuIcon, SearchIcon } from './Icons'

interface Props {
  mode: Mode | null // null before the first successful Organize
  search: string
  onSearch: (q: string) => void
  onExport: () => void
  onCopy: () => void
  onHelp: () => void
}

export default function Header({ mode, search, onSearch, onExport, onCopy, onHelp }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasPlan = mode !== null
  const exportTitle = hasPlan ? undefined : 'Organize notes first'

  const searchBox = (cls: string) => (
    <label className={cls}>
      <SearchIcon />
      <input
        type="search"
        placeholder="Search tasks"
        aria-label="Search tasks by title, source phrase, or owner"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        disabled={!hasPlan}
      />
    </label>
  )

  return (
    <header className="cc-header">
      <div className="cc-brand">
        <span className="cc-mark" aria-hidden="true">C→C</span>
        <span className="cc-name">Chaos to Clarity</span>
        {mode === 'sample' && (
          <span className="chip chip-grey cc-mode" title="No API key set: results come from a saved sample response">
            Sample mode · no AI call
          </span>
        )}
      </div>

      {searchBox('cc-search')}

      <nav className="cc-nav" aria-label="Plan actions">
        <button type="button" className="cc-textbtn" onClick={onExport} disabled={!hasPlan} title={exportTitle}>Export</button>
        <button type="button" className="cc-textbtn" onClick={onCopy} disabled={!hasPlan} title={exportTitle}>Copy Markdown</button>
        <button type="button" className="cc-iconbtn" aria-label="Help: what the labels mean" onClick={onHelp}><HelpIcon /></button>
      </nav>

      <button
        type="button"
        className="cc-iconbtn cc-menubtn"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="cc-mobile-menu"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {menuOpen && (
        <div id="cc-mobile-menu" className="cc-mobile-menu">
          {searchBox('cc-search-mobile')}
          <button type="button" className="cc-textbtn" disabled={!hasPlan} onClick={() => { onExport(); setMenuOpen(false) }}>Export Markdown</button>
          <button type="button" className="cc-textbtn" disabled={!hasPlan} onClick={() => { onCopy(); setMenuOpen(false) }}>Copy Markdown</button>
          <button type="button" className="cc-textbtn" onClick={() => { onHelp(); setMenuOpen(false) }}>Help</button>
        </div>
      )}
    </header>
  )
}
