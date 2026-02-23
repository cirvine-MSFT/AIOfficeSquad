import type { SquadDetail } from './types'
import type { SquadMember } from '../../types'
import FloorHeader from './FloorHeader'
import SessionCard from './SessionCard'
import NewSessionCard from './NewSessionCard'
import AgentCard from '../AgentCard'
import type { AgentInfo } from '../AgentCard'

// ── Types ──

export interface FloorViewProps {
  /** Full squad detail (members + sessions) */
  squad: SquadDetail
  /** Merged agent info with status */
  agents: AgentInfo[]
  /** Currently selected agent name */
  selectedAgent: string | null
  /** Called when an agent card is clicked */
  onSelectAgent: (name: string) => void
  /** Called when a session room card is clicked */
  onSelectSession: (sessionId: string) => void
  /** Called when the new-session card is clicked */
  onCreateSession: () => void
  /** Whether data is still loading */
  loading: boolean
}

// ── Component ──

/**
 * Floor plan view — an open office with agent desks and session rooms.
 *
 * Primary content: Agent roster cards showing the team at their desks.
 * Secondary content: Session rooms along the hallway (glass-walled offices).
 * This is the heart of the Squad Campus metaphor.
 */
export default function FloorView({
  squad,
  agents,
  selectedAgent,
  onSelectAgent,
  onSelectSession,
  onCreateSession,
  loading,
}: FloorViewProps) {
  const activeSessionCount = squad.sessions.filter((s) => s.status === 'active').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header bar */}
      <FloorHeader
        squadName={squad.name}
        floor={squad.floor}
        members={squad.members}
        activeSessionCount={activeSessionCount}
      />

      {/* Floor plan area */}
      <div className="flex-1 overflow-auto p-6" style={{ background: '#12151c' }}>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-text-tertiary border-t-accent rounded-full animate-spin mb-3" />
            <p className="text-sm text-text-tertiary">Loading floor plan…</p>
          </div>
        ) : (
          <div className="max-w-[1200px] mx-auto space-y-8">
            {/* ── Open Office: Agent desk grid ── */}
            <section>
              <div className="flex items-center gap-2 text-2xs text-text-tertiary uppercase tracking-wider mb-4">
                <span className="w-[3px] h-3 bg-accent rounded-sm" />
                Open Office — {agents.length} desk{agents.length !== 1 ? 's' : ''}
                <span className="flex-1 h-px bg-border" />
              </div>

              {agents.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl mb-2 block">🏢</span>
                  <p className="text-sm text-text-tertiary">No team members on this floor</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.name}
                      agent={agent}
                      selected={selectedAgent === agent.name}
                      onClick={() => onSelectAgent(agent.name)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Session Rooms: Hallway ── */}
            <section>
              <div className="flex items-center gap-2 text-2xs text-text-tertiary uppercase tracking-wider mb-4">
                <span className="w-[3px] h-3 bg-status-active rounded-sm" />
                Session Rooms
                <span className="flex-1 h-px bg-border" />
                {activeSessionCount > 0 && (
                  <span className="text-status-active">{activeSessionCount} active</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {squad.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onClick={() => onSelectSession(session.id)}
                  />
                ))}
                <NewSessionCard onClick={onCreateSession} />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
