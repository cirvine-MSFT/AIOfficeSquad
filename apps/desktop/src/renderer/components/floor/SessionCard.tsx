import type { SessionSummary } from './types'

// ── Types ──

export interface SessionCardProps {
  /** Session summary data */
  session: SessionSummary
  /** Called when the card is clicked to drill into the session */
  onClick: () => void
}

// ── Status styles ──

const STATUS_INDICATOR: Record<SessionSummary['status'], { label: string; dotClass: string; wrapperClass: string }> = {
  active: {
    label: 'Active',
    dotClass: 'bg-status-active shadow-[0_0_8px_rgba(74,222,128,0.3)] animate-pulse',
    wrapperClass: 'bg-[rgba(74,222,128,0.15)] border-status-active text-status-active',
  },
  idle: {
    label: 'Idle',
    dotClass: 'bg-text-tertiary',
    wrapperClass: 'bg-bg-raised border-border text-text-tertiary',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-status-error',
    wrapperClass: 'bg-status-error/15 border-status-error text-status-error',
  },
}

// ── Component ──

/**
 * Glass-walled office room card for the FloorView.
 *
 * Shows a peek-through view of the session interior with mini desk
 * previews and an occupancy summary. Styled to feel like looking
 * through a glass wall into an office room.
 */
export default function SessionCard({ session, onClick }: SessionCardProps) {
  const indicator = STATUS_INDICATOR[session.status]
  const totalMembers = session.workingCount + session.idleCount

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl overflow-hidden cursor-pointer
        transition-all duration-200 relative min-h-[200px]
        border-[3px] border-[#1e2230]
        bg-gradient-to-b from-bg-surface to-bg-raised
        hover:border-accent hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-0.5
        focus-visible:ring-2 focus-visible:ring-border-focus
        ${session.status === 'active' ? 'border-status-active shadow-[0_0_30px_rgba(74,222,128,0.2),_inset_0_0_10px_rgba(74,222,128,0.1)]' : ''}
      `}
    >
      {/* Glass wall reflection overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.01] pointer-events-none" />

      {/* Room Header */}
      <div className={`px-4 py-3 border-b border-border bg-bg flex justify-between items-center ${
        session.status === 'active' ? 'bg-gradient-to-r from-[rgba(74,222,128,0.1)] to-transparent' : ''
      }`}>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-text-primary truncate">{session.name}</div>
          {session.task && (
            <div className="text-2xs text-text-secondary truncate mt-0.5">{session.task}</div>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border shrink-0 ml-2 ${indicator.wrapperClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${indicator.dotClass}`} />
          {indicator.label}
        </span>
      </div>

      {/* Room Interior — peek through glass */}
      <div className="px-4 py-5 flex flex-col justify-center min-h-[140px]">
        {/* Mini desk layout */}
        {session.memberIds.length > 0 ? (
          <div className="flex gap-3 flex-wrap mb-3">
            {session.memberIds.map((memberId, i) => {
              const isWorking = i < session.workingCount
              return (
                <div key={memberId} className="flex flex-col items-center gap-1">
                  {/* Mini desk surface */}
                  <div className={`w-10 h-[22px] rounded bg-[#2a2f3d] border border-[#3d4555] flex items-center justify-center text-[10px] ${
                    isWorking ? 'after:content-["💻"] after:text-[11px]' : ''
                  }`}>
                    {isWorking && <span className="text-[11px]">💻</span>}
                  </div>
                  {/* Mini chair */}
                  <div className={`w-[18px] h-3 rounded-t-[5px] rounded-b-sm flex items-center justify-center ${
                    isWorking ? 'bg-bg-active' : 'bg-bg-surface'
                  }`}>
                    {isWorking && (
                      <span className="text-xs animate-bounce" style={{ animationDuration: '1.5s' }}>🧑‍💻</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-text-tertiary italic mb-3">Empty room</div>
        )}

        {/* Summary row */}
        {totalMembers > 0 && (
          <div className="flex gap-4 text-2xs text-text-secondary pt-3 border-t border-border">
            {session.workingCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-working" />
                {session.workingCount} working
              </span>
            )}
            {session.idleCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-idle" />
                {session.idleCount} at cooler
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
