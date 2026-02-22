import { useState, useCallback, useEffect } from 'react'
import type { HookEvent } from '../types'

const badgeStyles: Record<HookEvent['type'], string> = {
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  scrubbed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  permitted: 'bg-green-500/20 text-green-400 border-green-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const badgeLabels: Record<HookEvent['type'], string> = {
  blocked: '🚫 Blocked',
  scrubbed: '🧹 Scrubbed',
  permitted: '✅ Permitted',
  info: 'ℹ️ Info',
}

export default function HooksPanel() {
  const [events, setEvents] = useState<HookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHookActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await (window.squadAPI as any).getHookActivity()
      const result = res as { ok: boolean; data?: HookEvent[]; error?: string }
      if (result.ok && Array.isArray(result.data)) {
        setEvents(result.data)
      } else {
        setError(result.error ?? 'Failed to load hook activity')
      }
    } catch (_err) {
      setError('Hook activity IPC not available yet')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHookActivity()
  }, [fetchHookActivity])

  return (
    <div className="flex flex-col h-full bg-bg-sunken p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          🛡️ Governance Hooks
        </h2>
        <button
          onClick={fetchHookActivity}
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
      {!loading && !error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-text-tertiary">
          <span className="text-3xl mb-2">🛡️</span>
          <p className="text-sm">No governance events yet</p>
          <p className="text-xs mt-1">Hook events will appear as agents work</p>
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />

          {[...events].reverse().map((event) => (
            <div key={event.id} className="relative mb-4 last:mb-0">
              {/* Timeline dot */}
              <div className="absolute -left-4 top-2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg-sunken" />

              {/* Timestamp */}
              <div className="text-xs text-text-tertiary font-mono mb-1">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>

              {/* Event card */}
              <div className="bg-bg-raised border border-border rounded-lg p-3 hover:border-accent/40 transition-default">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${badgeStyles[event.type]}`}>
                    {badgeLabels[event.type]}
                  </span>
                  {event.agentName && (
                    <span className="text-xs text-accent">{event.agentName}</span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
