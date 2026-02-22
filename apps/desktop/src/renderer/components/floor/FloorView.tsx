import type { SquadDetail } from './types'
import FloorHeader from './FloorHeader'
import SessionCard from './SessionCard'
import NewSessionCard from './NewSessionCard'

// ── Types ──

export interface FloorViewProps {
  /** Full squad detail (members + sessions) */
  squad: SquadDetail
  /** Called when a session room card is clicked */
  onSelectSession: (sessionId: string) => void
  /** Called when the new-session card is clicked */
  onCreateSession: () => void
  /** Whether data is still loading */
  loading: boolean
}

// ── Component ──

/**
 * Floor plan view — a hallway with glass-walled office rooms (SessionCards).
 *
 * Replaces the old PodView agent-card grid with the floor-plan layout
 * from the mockup. Each session is a room you peek into through glass.
 */
export default function FloorView({
  squad,
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
        ) : squad.sessions.length === 0 ? (
          <div className="max-w-[1200px] mx-auto">
            {/* Hallway label */}
            <div className="flex items-center gap-2 text-2xs text-text-tertiary uppercase tracking-wider mb-5">
              <span className="flex-1 h-px bg-border" />
              Hallway
              <span className="flex-1 h-px bg-border" />
            </div>

            <div className="text-center py-12">
              <p className="text-sm text-text-tertiary mb-4">No sessions yet. Start one to open a room.</p>
              <NewSessionCard onClick={onCreateSession} />
            </div>
          </div>
        ) : (
          <div className="max-w-[1200px] mx-auto">
            {/* Hallway label */}
            <div className="flex items-center gap-2 text-2xs text-text-tertiary uppercase tracking-wider mb-5">
              <span className="flex-1 h-px bg-border" />
              Hallway
              <span className="flex-1 h-px bg-border" />
            </div>

            {/* Office rooms grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {squad.sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onClick={() => onSelectSession(session.id)}
                />
              ))}
              <NewSessionCard onClick={onCreateSession} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
