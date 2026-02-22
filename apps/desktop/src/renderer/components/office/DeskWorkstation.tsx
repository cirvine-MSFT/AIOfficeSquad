import { RoleAvatar, getRoleTextColor, getRoleLabel } from '../shared'

// ── Types ──

export interface DeskWorkstationProps {
  /** Agent display name */
  name: string
  /** Agent role (e.g. "Frontend", "Lead") */
  role: string
  /** Agent status within this session */
  status: 'active' | 'idle' | 'error' | 'spawning'
  /** Current activity description (shown when working) */
  activity?: string
}

// ── Component ──

/**
 * Single agent workstation — monitor with glow, chair, nameplate.
 *
 * When active: monitor glows blue, typing animation plays, nameplate
 * is highlighted. When idle: dimmed, empty chair. Mirrors the mockup's
 * desk-workstation design.
 */
export default function DeskWorkstation({
  name,
  role,
  status,
  activity,
}: DeskWorkstationProps) {
  const isWorking = status === 'active'
  const isError = status === 'error'
  const isSpawning = status === 'spawning'
  const roleColor = getRoleTextColor(role)

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Desk surface */}
      <div className={`
        w-full aspect-[1.4] rounded-lg flex flex-col items-center justify-center p-3 relative
        border-2 shadow-[0_2px_8px_rgba(0,0,0,0.3)]
        ${isWorking
          ? 'bg-[#2a2f3d] border-status-working shadow-[0_0_15px_rgba(96,165,250,0.2)]'
          : isError
            ? 'bg-[#2a2f3d] border-status-error shadow-[0_0_15px_rgba(248,113,113,0.2)]'
            : 'bg-[#2a2f3d] border-[#3d4555]'
        }
      `}>
        {/* Monitor */}
        <div className={`
          w-[60%] aspect-video rounded-t flex items-center justify-center text-base relative mb-1
          border-2 rounded-t-md
          ${isWorking
            ? 'bg-gradient-to-br from-[rgba(96,165,250,0.2)] to-[rgba(96,165,250,0.05)] border-status-working shadow-[inset_0_0_10px_rgba(96,165,250,0.3)]'
            : isError
              ? 'bg-gradient-to-br from-[rgba(248,113,113,0.2)] to-[rgba(248,113,113,0.05)] border-status-error'
              : 'bg-gradient-to-br from-[#1a2535] to-[#0f1420] border-[#3d4555]'
          }
        `}>
          {isWorking && (
            <span className="text-lg animate-pulse" style={{ animationDuration: '2s' }}>💻</span>
          )}
          {isError && <span className="text-lg">⚠️</span>}
          {isSpawning && (
            <span className="text-lg animate-spin" style={{ animationDuration: '2s' }}>⏳</span>
          )}
        </div>

        {/* Monitor base */}
        <div className="w-[70%] h-[3px] bg-[#3d4555] rounded-sm" />

        {/* Chair slot */}
        <div className={`
          w-8 h-6 rounded-t-lg rounded-b-sm flex items-center justify-center mt-2
          border border-[#3d4555]
          ${isWorking ? 'bg-bg-raised' : 'bg-bg-active'}
        `}>
          {isWorking && (
            <span className="text-base" style={{ animation: 'typing 1.5s ease-in-out infinite' }}>🧑‍💻</span>
          )}
        </div>
      </div>

      {/* Nameplate */}
      <div className={`
        text-2xs font-semibold px-2.5 py-1 rounded-md border text-center
        ${isWorking
          ? 'text-status-working border-status-working bg-bg'
          : isError
            ? 'text-status-error border-status-error bg-bg'
            : 'text-text-primary border-border bg-bg'
        }
      `}>
        <div className="truncate max-w-[100px]">{name}</div>
        <div className="text-[9px] font-medium mt-0.5 opacity-70 uppercase tracking-wide" style={{ color: roleColor }}>
          {getRoleLabel(role)}
        </div>
      </div>

      {/* Activity text */}
      {isWorking && activity && (
        <p className="text-[10px] text-text-tertiary text-center truncate max-w-[140px]">
          {activity}
        </p>
      )}
    </div>
  )
}
