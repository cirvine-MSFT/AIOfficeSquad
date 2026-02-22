import type { ConnectionState } from '../types'

interface HeaderProps {
  connectionState: ConnectionState
  onConnect: () => void
  onDisconnect: () => void
  connecting: boolean
}

export default function Header({
  connectionState,
  onConnect,
  onDisconnect,
  connecting,
}: HeaderProps) {
  const connected = connectionState.connected

  return (
    <header className="flex items-center justify-between h-header px-4 bg-bg-raised border-b border-border app-drag select-none shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏢</span>
        <h1 className="text-md font-semibold text-text-primary">Squad Office</h1>
      </div>

      <div className="flex items-center gap-3 app-no-drag">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`status-dot ${
              connected
                ? 'status-dot-active'
                : connecting
                  ? 'status-dot-working'
                  : 'status-dot-error'
            }`}
          />
          <span className="text-text-secondary">
            {connected ? 'Connected' : connecting ? 'Connecting…' : 'Disconnected'}
          </span>
        </div>

        {connected ? (
          <button
            onClick={onDisconnect}
            className="h-8 px-3 text-sm font-medium rounded-md bg-bg-surface border border-border text-text-primary hover:bg-bg-hover transition-default"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="h-8 px-3 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-50 transition-default"
          >
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        )}
      </div>
    </header>
  )
}
