import { ROLE_COLORS, getAvatarColor, type AgentRole } from '../styles/design-tokens'
import type { AgentInfo } from './AgentCard'

// ── Types (matches Dutch arch doc §C.3) ──

export interface SquadSummary {
  id: string
  name: string
  floor: number
  memberCount: number
  activeSessionCount: number
  status: 'connected' | 'disconnected' | 'error'
}

interface SidebarProps {
  hubName: string
  squads: SquadSummary[]
  selectedSquadId: string | null
  onSelectSquad: (id: string) => void
  agents: AgentInfo[]
  selectedAgent: string | null
  onSelectAgent: (name: string) => void
  loading: boolean
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

export default function Sidebar({
  hubName,
  squads,
  selectedSquadId,
  onSelectSquad,
  agents,
  selectedAgent,
  onSelectAgent,
  loading,
}: SidebarProps) {
  return (
    <aside className="flex flex-col w-sidebar bg-bg-raised border-r border-border overflow-y-auto scrollbar-thin shrink-0 select-none">
      {/* Hub info */}
      <div className="px-3 pt-3 pb-1">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider px-2">
          {hubName}
        </h2>
      </div>

      {/* Squads section */}
      <div className="px-3 pb-3">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-2">
          Squads
        </h3>
        {loading ? (
          <p className="text-sm text-text-tertiary px-2 animate-pulse">Loading...</p>
        ) : squads.length === 0 ? (
          <p className="text-sm text-text-tertiary px-2">No squads found</p>
        ) : (
          <ul className="space-y-0.5">
            {squads.map((squad) => (
              <li key={squad.id}>
                <button
                  onClick={() => onSelectSquad(squad.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-default ${
                    selectedSquadId === squad.id
                      ? 'bg-bg-active text-text-primary font-medium'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{squad.name}</span>
                    <span className="text-2xs text-text-tertiary">F{squad.floor}</span>
                  </div>
                  <div className="text-2xs text-text-tertiary">
                    {squad.memberCount} member{squad.memberCount !== 1 ? 's' : ''}
                    {squad.activeSessionCount > 0 && ` · ${squad.activeSessionCount} active`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Divider */}
      {selectedSquadId && <div className="mx-3 border-t border-border" />}

      {/* Agents section (when squad is selected) */}
      {selectedSquadId && (
        <div className="p-3 flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-2">
            Agents
          </h3>
          {loading ? (
            <p className="text-sm text-text-tertiary px-2 animate-pulse">Loading agents...</p>
          ) : agents.length === 0 ? (
            <p className="text-sm text-text-tertiary px-2">No agents in squad</p>
          ) : (
            <ul className="space-y-0.5">
              {agents.map((agent, i) => {
                const roleKey = getRoleKey(agent.role)
                const avatarBg = roleKey
                  ? ROLE_COLORS[roleKey].accent
                  : getAvatarColor(agent.name)

                return (
                  <li key={agent.name}>
                    <button
                      onClick={() => onSelectAgent(agent.name)}
                      title={`${i + 1}: ${agent.name}`}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-default ${
                        selectedAgent === agent.name
                          ? 'bg-bg-active text-text-primary'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className="flex items-center justify-center rounded-full w-6 h-6 text-2xs font-semibold text-white shrink-0"
                        style={{ backgroundColor: avatarBg }}
                      >
                        {getInitials(agent.name)}
                      </div>

                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-sm">{agent.name}</div>
                        <div className="text-2xs text-text-tertiary truncate">
                          {roleKey ? ROLE_COLORS[roleKey].label : agent.role}
                        </div>
                      </div>

                      {/* Status dot */}
                      <span className={`status-dot status-dot-${agent.status} shrink-0`} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
