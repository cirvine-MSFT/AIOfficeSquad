import { RoleAvatar, getRoleLabel, getRoleTextColor } from '../shared'
import type { AgentInSession } from '../../types'

// ── Types ──

export interface WaterCoolerProps {
  /** Idle agents in this session */
  idleAgents: AgentInSession[]
}

// ── Idle chat bubble messages (fun flavor text) ──

const COOLER_BUBBLES = [
  '☕ Coffee break',
  '💭 Thinking…',
  '🫖 Tea time',
  '📖 Reading docs',
  '🎵 Vibing',
  '🧘 Zen mode',
]

function getBubble(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return COOLER_BUBBLES[Math.abs(hash) % COOLER_BUBBLES.length]
}

// ── Component ──

/**
 * Water cooler / break area for idle agents within a session.
 *
 * Shows a fun water-cooler scene with agent avatars, role labels,
 * and humorous chat bubbles. Only renders agents whose status is 'idle'.
 */
export default function WaterCooler({ idleAgents }: WaterCoolerProps) {
  return (
    <div className="
      bg-gradient-to-br from-[#1a2535] to-[#151d2a]
      border-[3px] border-dashed border-[#2a3545]
      rounded-xl p-5 relative min-h-[300px]
      shadow-[0_4px_20px_rgba(0,0,0,0.2)]
    ">
      {/* Subtle warm glow overlay */}
      <div className="absolute inset-0 rounded-xl pointer-events-none bg-[radial-gradient(circle_at_30%_40%,rgba(251,191,36,0.05)_0%,transparent_60%)]" />

      {/* Area label */}
      <div className="flex items-center gap-2 text-sm font-semibold text-status-idle uppercase tracking-wider mb-5 relative">
        <span className="w-[3px] h-3.5 bg-status-idle rounded-sm" />
        ☕ Water Cooler
      </div>

      {idleAgents.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center italic py-5 relative">
          Everyone's at their desk — the cooler is lonely 🥲
        </p>
      ) : (
        <div className="flex flex-col items-center pt-5 relative">
          {/* Water cooler emoji */}
          <div className="text-5xl mb-4 relative" style={{ filter: 'drop-shadow(0 2px 8px rgba(251,191,36,0.2))' }}>
            🚰
            <span className="absolute -bottom-1.5 -right-2.5 text-sm" style={{ animation: 'drip 2s ease-in-out infinite' }}>
              💧
            </span>
          </div>

          {/* Idle member avatars */}
          <div className="flex gap-3 flex-wrap justify-center mt-4">
            {idleAgents.map((agent) => (
              <div
                key={agent.name}
                className="
                  flex flex-col items-center gap-1.5 p-3
                  bg-bg-surface rounded-lg border-2 border-border
                  min-w-[80px] transition-all duration-200
                  hover:border-status-idle hover:-translate-y-0.5
                "
              >
                <div style={{ animation: 'chat 3s ease-in-out infinite' }}>
                  <RoleAvatar name={agent.name} role={agent.role} size="md" />
                </div>
                <span className="text-2xs font-semibold text-text-primary">{agent.name}</span>
                <span
                  className="text-[9px] uppercase tracking-wider"
                  style={{ color: getRoleTextColor(agent.role) ?? undefined }}
                >
                  {getRoleLabel(agent.role)}
                </span>
                <span className="text-[10px] bg-bg px-2 py-0.5 rounded-full text-status-idle mt-1">
                  {getBubble(agent.name)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
