import { useState, useCallback, useEffect } from 'react'

// ── Markdown parsing ──

interface DecisionEntry {
  timestamp: string
  title: string
  author: string
  what: string
  why: string
}

function parseDecisionsMarkdown(md: string): DecisionEntry[] {
  const entries: DecisionEntry[] = []
  // Split on ### headings that contain a timestamp + title
  const blocks = md.split(/(?=^### )/m).filter((b) => b.trim())

  for (const block of blocks) {
    const headerMatch = block.match(/^### (.+?):\s*(.+)$/m)
    if (!headerMatch) continue

    const timestamp = headerMatch[1].trim()
    const title = headerMatch[2].trim()

    const authorMatch = block.match(/\*\*By:\*\*\s*(.+)/i)
    const whatMatch = block.match(/\*\*What:\*\*\s*(.+)/i)
    const whyMatch = block.match(/\*\*Why:\*\*\s*(.+)/i)

    entries.push({
      timestamp,
      title,
      author: authorMatch?.[1]?.trim() ?? 'Unknown',
      what: whatMatch?.[1]?.trim() ?? '',
      why: whyMatch?.[1]?.trim() ?? '',
    })
  }

  return entries
}

// ── Component ──

export default function DecisionsTimeline() {
  const [entries, setEntries] = useState<DecisionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDecisions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await (window.squadAPI as any).getDecisions()
      const result = res as { ok: boolean; data?: string; error?: string }
      if (result.ok && typeof result.data === 'string') {
        setEntries(parseDecisionsMarkdown(result.data))
      } else {
        setError(result.error ?? 'No decisions data')
      }
    } catch (_err) {
      setError('Decisions IPC not available yet')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDecisions()
  }, [fetchDecisions])

  return (
    <div className="flex flex-col h-full bg-bg-sunken p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          📋 Decisions Timeline
        </h2>
        <button
          onClick={fetchDecisions}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium rounded bg-bg-raised border border-border text-text-secondary hover:text-text-primary hover:border-accent transition-default disabled:opacity-50"
        >
          {loading ? '⟳ Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-3 py-2 mb-3 text-sm text-status-error bg-status-error/10 rounded border border-status-error/20">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-text-tertiary">
          <span className="text-3xl mb-2">📭</span>
          <p className="text-sm">No decisions yet</p>
          <p className="text-xs mt-1">Decisions will appear here as the squad works</p>
        </div>
      )}

      {/* Timeline */}
      {entries.length > 0 && (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />

          {entries.map((entry, i) => (
            <div key={i} className="relative mb-4 last:mb-0">
              {/* Timeline dot */}
              <div className="absolute -left-4 top-2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg-sunken" />

              {/* Timestamp */}
              <div className="text-xs text-text-tertiary font-mono mb-1">{entry.timestamp}</div>

              {/* Decision card */}
              <div className="bg-bg-raised border border-border rounded-lg p-3 hover:border-accent/40 transition-default">
                <h3 className="text-sm font-semibold text-text-primary mb-1">{entry.title}</h3>
                <div className="text-xs text-accent mb-2">By: {entry.author}</div>
                {entry.what && (
                  <p className="text-xs text-text-secondary mb-1">
                    <span className="text-text-tertiary">What: </span>{entry.what}
                  </p>
                )}
                {entry.why && (
                  <p className="text-xs text-text-secondary">
                    <span className="text-text-tertiary">Why: </span>{entry.why}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
