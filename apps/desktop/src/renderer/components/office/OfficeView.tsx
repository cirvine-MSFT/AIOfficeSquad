import type { SessionDetail, AgentInSession } from '../../types'
import DeskWorkstation from './DeskWorkstation'
import WaterCooler from './WaterCooler'
import TerminalPanel from './TerminalPanel'

// ── Types ──

export interface OfficeViewProps {
  /** Full session detail data */
  session: SessionDetail
  /** Current streaming text for the terminal panel */
  streamingText: string
  /** Called when the user clicks back */
  onBack: () => void
  /** Whether data is still loading */
  loading: boolean
}

// ── Component ──

/**
 * Session detail view — the inside of an office room.
 *
 * Two-column layout:
 *  - LEFT: Workspace area with desk grid (working agents) + water cooler (idle agents)
 *  - RIGHT: Chat panel (rendered by parent, not here — OfficeView only owns the workspace)
 *
 * The chat panel integration happens at the App.tsx level (Phase 1d).
 * This component renders the workspace + terminal half.
 */
export default function OfficeView({
  session,
  streamingText,
  onBack,
  loading,
}: OfficeViewProps) {
  const workingAgents = session.agents.filter((a) => a.status === 'active' || a.status === 'spawning')
  const idleAgents = session.agents.filter((a) => a.status === 'idle')
  const errorAgents = session.agents.filter((a) => a.status === 'error')
  const isActive = session.status === 'active'

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-text-tertiary border-t-accent rounded-full animate-spin mb-3" />
          <p className="text-sm text-text-tertiary">Opening office…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Office header */}
      <div className="px-6 py-5 border-b border-border bg-gradient-to-b from-bg-raised to-bg-surface relative shrink-0">
        {/* Subtle bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-text-tertiary hover:text-text-primary transition-default text-sm"
            aria-label="Go back to floor"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <span>🚪</span>
              {session.name}
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              {session.squadName} · {session.agents.length} member{session.agents.length !== 1 ? 's' : ''}
              {session.task && <span> · {session.task}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Workspace area */}
      <div
        className="flex-1 overflow-y-auto p-6"
        style={{ background: 'linear-gradient(180deg, #12151c 0%, #0f1117 100%)' }}
      >
        <div className="max-w-[1000px] mx-auto flex gap-6 flex-col lg:flex-row">
          {/* Work area — desks */}
          <div className="
            flex-[2] bg-gradient-to-br from-bg-surface to-bg-raised
            border-[3px] border-[#1e2230] rounded-xl p-6 relative
            shadow-[0_4px_20px_rgba(0,0,0,0.3)]
          ">
            {/* Glass reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-xl" />

            {/* Area label */}
            <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wider mb-5 relative">
              <span className="w-[3px] h-3.5 bg-accent rounded-sm" />
              💼 Workstations
            </div>

            {/* Desk grid */}
            {workingAgents.length === 0 && errorAgents.length === 0 ? (
              <p className="text-sm text-text-tertiary italic py-8 text-center relative">
                All members are at the water cooler
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 relative">
                {[...workingAgents, ...errorAgents].map((agent) => (
                  <DeskWorkstation
                    key={agent.name}
                    name={agent.name}
                    role={agent.role}
                    status={agent.status}
                    activity={agent.activity}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Water cooler — idle agents */}
          <div className="flex-1 min-w-[250px]">
            <WaterCooler idleAgents={idleAgents} />
          </div>
        </div>
      </div>

      {/* Terminal panel — live streaming output */}
      <TerminalPanel
        text={streamingText}
        active={isActive}
      />
    </div>
  )
}
