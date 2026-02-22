import { ROLE_COLORS, getAvatarColor, type AgentRole } from '../../styles/design-tokens'

// ── Types ──

export interface RoleAvatarProps {
  /** Agent display name (used for initials and fallback color) */
  name: string
  /** Agent role string (e.g. "Frontend", "Lead", "Squad Expert") */
  role: string
  /** Avatar size variant */
  size: 'sm' | 'md' | 'lg'
}

// ── Shared helpers (canonical source — replaces copies in AgentCard, ChatPanel, Sidebar) ──

/**
 * Extract up to 2 uppercase initials from a name.
 * Splits on spaces and hyphens: "Mac Tavish" → "MT", "Poncho" → "PO"
 */
export function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Map a role string to a ROLE_COLORS key, or null if unrecognised.
 * Handles casing and "Squad Expert" → "expert" alias.
 */
export function getRoleKey(role: string): AgentRole | null {
  const normalized = role.toLowerCase().replace(/\s+/g, '')
  if (normalized in ROLE_COLORS) return normalized as AgentRole
  if (normalized === 'squadexpert') return 'expert'
  return null
}

/**
 * Resolve the avatar background color for a given name + role.
 * Prefers the role accent color; falls back to a deterministic hash color.
 */
export function getAvatarBg(name: string, role: string): string {
  const roleKey = getRoleKey(role)
  return roleKey ? ROLE_COLORS[roleKey].accent : getAvatarColor(name)
}

/**
 * Get the role display label (e.g. "Frontend", "Squad Expert").
 * Returns the raw role string if unrecognised.
 */
export function getRoleLabel(role: string): string {
  const roleKey = getRoleKey(role)
  return roleKey ? ROLE_COLORS[roleKey].label : role
}

/**
 * Get the role text color for inline labels.
 * Returns undefined if the role is unrecognised (inherit default).
 */
export function getRoleTextColor(role: string): string | undefined {
  const roleKey = getRoleKey(role)
  return roleKey ? ROLE_COLORS[roleKey].text : undefined
}

// ── Size mappings ──

const SIZE_CLASSES: Record<RoleAvatarProps['size'], string> = {
  sm: 'w-6 h-6 text-2xs',
  md: 'w-8 h-8 text-base',
  lg: 'w-10 h-10 text-lg',
}

// ── Component ──

/**
 * Colored circle with agent initials — the single source of truth for
 * avatar rendering across the app. Replaces duplicated getInitials() +
 * role-color logic in AgentCard, ChatPanel, and Sidebar.
 */
export default function RoleAvatar({ name, role, size }: RoleAvatarProps) {
  const bg = getAvatarBg(name, role)

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: bg }}
    >
      {getInitials(name)}
    </div>
  )
}
