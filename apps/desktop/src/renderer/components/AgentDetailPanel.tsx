import { ROLE_COLORS, getAvatarColor, type AgentRole } from '../styles/design-tokens'
import type { AgentInfo } from './AgentCard'

interface AgentDetailPanelProps {
  agent: AgentInfo
  onClose: () => void
  onChat: (name: string) => void
}

function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleKey(role: string): AgentRole | null {
  const normalized = role.toLowerCase().replace(/\s+/g, '')
  if (normalized in ROLE_COLORS) return normalized as AgentRole
  if (normalized === 'squadexpert') return 'expert'
  return null
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

const ROLE_DESC: Record<string, string> = {
  lead: 'Coordinates the squad, assigns tasks, and makes architectural decisions.',
  frontend: 'Builds UI components, handles styling, and implements user interactions.',
  backend: 'Develops server logic, APIs, data models, and system integrations.',
  tester: 'Writes tests, finds bugs, ensures quality, and validates changes.',
  expert: 'Deep knowledge of the squad SDK and tooling ecosystem.',
  design: 'Creates visual designs, UX flows, and design system tokens.',
  scribe: 'Logs decisions, writes documentation, and maintains project records.',
  monitor: 'Watches system health, tracks performance, and reports anomalies.',
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-status-active', bg: 'bg-status-active/10' },
  idle: { label: 'Idle', color: 'text-status-idle', bg: 'bg-status-idle/10' },
  error: { label: 'Error', color: 'text-status-error', bg: 'bg-status-error/10' },
  working: { label: 'Working', color: 'text-status-working', bg: 'bg-status-working/10' },
}

export default function AgentDetailPanel({ agent, onClose, onChat }: AgentDetailPanelProps) {
  const roleKey = getRoleKey(agent.role)
  const avatarBg = roleKey ? ROLE_COLORS[roleKey].accent : getAvatarColor(agent.name)
  const roleIcon = roleKey ? ROLE_ICON[roleKey] : '👤'
  const roleLabel = roleKey ? ROLE_COLORS[roleKey].label : agent.role
  const roleDesc = roleKey ? ROLE_DESC[roleKey] : ''
  const status = STATUS_STYLES[agent.status] ?? STATUS_STYLES.idle

  return (
    <div className="w-80 bg-bg-raised border-l border-border flex flex-col overflow-hidden animate-slide-in-right shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Agent Details</h3>
        <button
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary transition-default text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Agent profile */}
      <div className="flex flex-col items-center px-4 py-6 gap-3">
        <div className="relative">
          <div
            className="flex items-center justify-center rounded-full w-16 h-16 text-2xl font-bold text-white"
            style={{ backgroundColor: avatarBg }}
          >
            {getInitials(agent.name)}
          </div>
          <span className="absolute -bottom-1 -right-1 text-xl">{roleIcon}</span>
        </div>
        <div className="text-center">
          <h4 className="text-lg font-semibold text-text-primary">{agent.name}</h4>
          <p
            className="text-sm font-medium mt-0.5"
            style={{ color: roleKey ? ROLE_COLORS[roleKey].text : undefined }}
          >
            {roleLabel}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${status.bg} ${status.color}`}>
          <span className={`status-dot status-dot-${agent.status}`} />
          {status.label}
        </span>
      </div>

      {/* Role description */}
      {roleDesc && (
        <div className="px-4 pb-4">
          <p className="text-xs text-text-secondary leading-relaxed">{roleDesc}</p>
        </div>
      )}

      {/* Details */}
      <div className="px-4 pb-4 space-y-2 text-xs">
        {agent.lastActivity && (
          <div className="flex justify-between">
            <span className="text-text-tertiary">Last activity</span>
            <span className="text-text-secondary">{agent.lastActivity}</span>
          </div>
        )}
        {agent.sessionId && (
          <div className="flex justify-between">
            <span className="text-text-tertiary">Session</span>
            <span className="text-text-secondary font-mono">{agent.sessionId.slice(0, 8)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto p-4 border-t border-border space-y-2">
        <button
          onClick={() => onChat(agent.name)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium transition-default hover:bg-accent/90"
        >
          💬 Chat with {agent.name}
        </button>
      </div>
    </div>
  )
}
