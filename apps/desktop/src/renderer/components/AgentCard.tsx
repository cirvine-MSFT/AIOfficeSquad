import { ROLE_COLORS, getAvatarColor } from '../styles/design-tokens'
import { getInitials, getRoleKey } from './shared/RoleAvatar'

export interface AgentInfo {
  name: string
  role: string
  status: 'active' | 'idle' | 'error' | 'working'
  lastActivity?: string
  sessionId?: string
}

interface AgentCardProps {
  agent: AgentInfo
  selected: boolean
  onClick: () => void
  /** Index for staggered entrance animation */
  index?: number
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
  working: 'Working',
}

/** Monitor glow color per status */
const MONITOR_GLOW: Record<string, { border: string; shadow: string; bg: string }> = {
  active: { border: '#4ade80', shadow: '0 0 10px rgba(74,222,128,0.3) inset', bg: 'rgba(74,222,128,0.15)' },
  working: { border: '#60a5fa', shadow: '0 0 10px rgba(96,165,250,0.3) inset', bg: 'rgba(96,165,250,0.15)' },
  error: { border: '#f87171', shadow: '0 0 10px rgba(248,113,113,0.3) inset', bg: 'rgba(248,113,113,0.15)' },
  idle: { border: '#3d4555', shadow: 'none', bg: 'linear-gradient(135deg, #1a2535 0%, #0f1420 100%)' },
}

export default function AgentCard({ agent, selected, onClick, index = 0 }: AgentCardProps) {
  const roleKey = getRoleKey(agent.role)
  const roleAccent = roleKey ? ROLE_COLORS[roleKey].accent : getAvatarColor(agent.name)
  const roleText = roleKey ? ROLE_COLORS[roleKey].text : undefined
  const roleLabel = roleKey ? ROLE_COLORS[roleKey].label : agent.role
  const isOccupied = agent.status === 'active' || agent.status === 'working'
  const monitorStyle = MONITOR_GLOW[agent.status] ?? MONITOR_GLOW.idle

  return (
    <button
      onClick={onClick}
      aria-label={`${agent.name}, ${agent.role}, ${STATUS_LABEL[agent.status] ?? agent.status}`}
      aria-pressed={selected}
      title={`${agent.name} — ${agent.role} (${STATUS_LABEL[agent.status] ?? agent.status})`}
      className={`w-full text-left rounded-lg border transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-border-focus animate-fade-in-up ${
        selected ? 'border-accent bg-bg-active shadow-[0_0_15px_rgba(91,141,239,0.2)]' : 'border-[#2a2f3d] bg-[#2a2f3d]'
      }`}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
        boxShadow: isOccupied && !selected ? `0 0 15px ${monitorStyle.border}33` : undefined,
      }}
    >
      <div className="flex flex-col items-center gap-2 p-3">
        {/* Desk workstation surface */}
        <div
          className="w-full flex flex-col items-center justify-center rounded-lg p-3 relative"
          style={{
            aspectRatio: '1.4',
            background: '#2a2f3d',
            border: `2px solid ${isOccupied ? monitorStyle.border : '#3d4555'}`,
            boxShadow: isOccupied ? `0 2px 8px ${monitorStyle.border}33` : '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {/* Monitor */}
          <div
            className="flex items-center justify-center rounded-t mb-1"
            style={{
              width: '60%',
              aspectRatio: '16/10',
              background: isOccupied ? monitorStyle.bg : 'linear-gradient(135deg, #1a2535 0%, #0f1420 100%)',
              border: `2px solid ${monitorStyle.border}`,
              boxShadow: monitorStyle.shadow,
              borderRadius: '4px 4px 0 0',
            }}
          >
            {isOccupied && <span className="text-base" style={{ animation: 'glow 2s ease-in-out infinite' }}>💻</span>}
          </div>
          {/* Monitor stand */}
          <div className="h-[3px] rounded-sm" style={{ width: '70%', background: '#3d4555' }} />
        </div>

        {/* Chair slot with agent sitting */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 24,
            background: isOccupied ? '#151820' : '#252936',
            borderRadius: '8px 8px 4px 4px',
            border: '1px solid #3d4555',
          }}
        >
          {isOccupied && (
            <span className="text-base" style={{ animation: 'typing 1.5s ease-in-out infinite' }}>🧑‍💻</span>
          )}
        </div>

        {/* Nameplate */}
        <div
          className="text-[11px] font-semibold px-2.5 py-1 rounded-md text-center truncate max-w-full"
          style={{
            background: '#0f1117',
            border: `1px solid ${isOccupied ? monitorStyle.border : '#2a2f3d'}`,
            color: isOccupied ? monitorStyle.border : '#e8eaf0',
          }}
        >
          {agent.name}
        </div>

        {/* Role label */}
        <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: roleText ?? roleAccent }}>
          {roleLabel}
        </div>

        {/* Last activity */}
        {agent.lastActivity && (
          <p className="text-2xs text-text-tertiary truncate w-full text-center">
            {agent.lastActivity}
          </p>
        )}
      </div>
    </button>
  )
}

export { getInitials, getRoleKey }
