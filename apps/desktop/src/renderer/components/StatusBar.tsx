interface StatusBarProps {
  squadRoot: string | null
  squadName: string | null
  sessionCount: number
  totalTokens: number
  estimatedCost: number
  model: string | null
  totalMembers: number
  connected: boolean
}

export default function StatusBar({
  squadRoot,
  squadName,
  sessionCount,
  totalTokens,
  estimatedCost,
  model,
  totalMembers,
  connected,
}: StatusBarProps) {
  return (
    <footer role="status" className="flex items-center justify-between h-status-bar px-4 bg-bg-raised border-t border-border text-xs text-text-secondary font-mono shrink-0 select-none">
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <span className="flex items-center gap-1.5">
          <span className={`status-dot ${connected ? 'status-dot-active' : 'status-dot-idle'}`} />
          {connected ? 'Connected' : 'Offline'}
        </span>
        <span className="text-text-tertiary">·</span>
        {squadName && (
          <>
            <span className="text-text-primary">{squadName}</span>
            <span className="text-text-tertiary">·</span>
          </>
        )}
        {squadRoot && (
          <>
            <span className="truncate max-w-xs" title={squadRoot}>{squadRoot}</span>
            <span className="text-text-tertiary">·</span>
          </>
        )}
        <span>{totalMembers} member{totalMembers !== 1 ? 's' : ''}</span>
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
