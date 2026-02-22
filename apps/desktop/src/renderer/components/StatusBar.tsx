import type { ConnectionState } from '../types'

interface StatusBarProps {
  connectionState: ConnectionState
  sessionCount: number
  totalTokens: number
  estimatedCost: number
  model: string | null
}

export default function StatusBar({
  connectionState,
  sessionCount,
  totalTokens,
  estimatedCost,
  model,
}: StatusBarProps) {
  const connected = connectionState.connected

  return (
    <footer className="flex items-center justify-between h-status-bar px-4 bg-bg-raised border-t border-border text-xs text-text-secondary font-mono shrink-0 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`status-dot ${connected ? 'status-dot-active' : 'status-dot-error'}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <span className="text-text-tertiary">·</span>
        <span>{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex items-center gap-4">
        {model && (
          <>
            <span className="text-text-tertiary">{model}</span>
            <span className="text-text-tertiary">·</span>
          </>
        )}
        <span>{totalTokens.toLocaleString()} tokens</span>
        <span className="text-text-tertiary">·</span>
        <span>${estimatedCost.toFixed(4)}</span>
      </div>
    </footer>
  )
}
