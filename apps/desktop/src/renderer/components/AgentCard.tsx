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

const ROLE_ICON: Record<string, string> = {
  lead: '🎖️',
  frontend: '🎨',
  backend: '⚙️',
  tester: '🧪',
  expert: '📚',
  design: '✏️',
  scribe: '📝',
  monitor: '📡',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
  working: 'Working',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-status-active/15 text-status-active',
  idle: 'bg-status-idle/15 text-status-idle',
  error: 'bg-status-error/15 text-status-error',
  working: 'bg-status-working/15 text-status-working',
}

export default function AgentCard({ agent, selected, onClick, index = 0 }: AgentCardProps) {
  const roleKey = getRoleKey(agent.role)
  const avatarBg = roleKey ? ROLE_COLORS[roleKey].accent : getAvatarColor(agent.name)
  const roleIcon = roleKey ? ROLE_ICON[roleKey] : '👤'

  return (
    <button
      onClick={onClick}
      aria-label={`${agent.name}, ${agent.role}, ${STATUS_LABEL[agent.status] ?? agent.status}`}
      aria-pressed={selected}
      title={`${agent.name} — ${agent.role} (${STATUS_LABEL[agent.status] ?? agent.status})`}
      className={`w-full text-left rounded-lg bg-bg-surface border shadow-elevation-1 p-4 transition-default hover:bg-bg-hover hover:shadow-elevation-2 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-border-focus animate-fade-in-up ${
        selected ? 'border-accent bg-bg-active' : 'border-border'
      }`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Avatar with role icon */}
        <div className="relative">
          <div
            className="flex items-center justify-center rounded-full w-10 h-10 text-lg font-semibold text-white shrink-0"
            style={{ backgroundColor: avatarBg }}
          >
            {getInitials(agent.name)}
          </div>
          <span className="absolute -bottom-1 -right-1 text-sm" title={agent.role}>
            {roleIcon}
          </span>
        </div>

        {/* Info */}
        <div className="text-center min-w-0">
          <div className="text-md font-semibold text-text-primary truncate">{agent.name}</div>
          <div
            className="text-sm font-medium mt-0.5"
            style={{ color: roleKey ? ROLE_COLORS[roleKey].text : undefined }}
          >
            {roleKey ? ROLE_COLORS[roleKey].label : agent.role}
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-sm ${STATUS_BADGE[agent.status] ?? ''}`}
        >
          <span className={`status-dot status-dot-${agent.status}`} />
          {STATUS_LABEL[agent.status] ?? agent.status}
        </span>

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
