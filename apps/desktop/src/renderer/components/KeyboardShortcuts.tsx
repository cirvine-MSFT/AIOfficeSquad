import { useState, useEffect, useCallback } from 'react'

const SHORTCUTS = [
  { keys: ['Esc'], description: 'Go back / deselect agent' },
  { keys: ['1', '–', '9'], description: 'Quick-select agent by position' },
  { keys: ['?'], description: 'Toggle this help panel' },
]

export default function KeyboardShortcuts() {
  const [visible, setVisible] = useState(false)

  const toggle = useCallback(() => setVisible((v) => !v), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '?') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay/80 animate-fade-in"
      onClick={toggle}
    >
      <div
        className="bg-bg-surface border border-border rounded-xl shadow-elevation-3 p-6 max-w-sm w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">⌨️ Keyboard Shortcuts</h2>
          <button
            onClick={toggle}
            className="text-text-tertiary hover:text-text-primary transition-default text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="kbd"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-text-tertiary text-center">
            Press <kbd className="kbd">?</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
