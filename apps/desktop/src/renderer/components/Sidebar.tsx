import { ROLE_COLORS, getAvatarColor, type AgentRole } from '../styles/design-tokens'
import type { AgentInfo } from './AgentCard'

interface SidebarProps {
  squads: string[]
  selectedSquad: string | null
  onSelectSquad: (name: string) => void
  agents: AgentInfo[]
  selectedAgent: string | null
  onSelectAgent: (name: string) => void
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
  squads,
  selectedSquad,
  onSelectSquad,
  agents,
  selectedAgent,
  onSelectAgent,
}: SidebarProps) {
  return (
    <aside className="flex flex-col w-sidebar bg-bg-raised border-r border-border overflow-y-auto scrollbar-thin shrink-0 select-none">
      {/* Squads section */}
      <div className="p-3">
        <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-2">
          Squads
        </h2>
        {squads.length === 0 ? (
          <p className="text-sm text-text-tertiary px-2">No squads found</p>
        ) : (
          <ul className="space-y-0.5">
            {squads.map((name) => (
              <li key={name}>
                <button
                  onClick={() => onSelectSquad(name)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm font-medium transition-default ${
                    selectedSquad === name
                      ? 'bg-bg-active text-text-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Divider */}
      {selectedSquad && <div className="mx-3 border-t border-border" />}

      {/* Agents section */}
      {selectedSquad && (
        <div className="p-3 flex-1 overflow-y-auto">
          <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 px-2">
            Agents
          </h2>
          {agents.length === 0 ? (
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
