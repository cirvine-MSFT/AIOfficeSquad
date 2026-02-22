import type { SquadMember } from '../../types'

// ── Types ──

export interface FloorHeaderProps {
  /** Squad / floor display name */
  squadName: string
  /** Floor number in the building */
  floor: number
  /** All members on this floor */
  members: SquadMember[]
  /** Number of active sessions on this floor */
  activeSessionCount: number
}

// ── Component ──

/**
 * Header bar for the FloorView — shows squad name, floor number,
 * member count, and an active sessions badge.
 */
export default function FloorHeader({
  squadName,
  floor,
  members,
  activeSessionCount,
}: FloorHeaderProps) {
  return (
    <div className="px-6 py-5 border-b border-border bg-bg-raised shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            {squadName}
            <span className="text-xs font-medium text-text-tertiary bg-bg px-2 py-0.5 rounded">
              Floor {floor}
            </span>
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>

        {activeSessionCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-status-active/15 text-status-active">
            <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse" />
            {activeSessionCount} active session{activeSessionCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
