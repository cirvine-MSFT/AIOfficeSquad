/**
 * Design tokens for the Squad Campus desktop app.
 * These mirror the Tailwind config and CSS custom properties
 * for use in React components and runtime logic.
 */

// ── Agent Role Colors ──

export const ROLE_COLORS = {
  lead: {
    bg: '#3d2e10',
    text: '#fcd281',
    accent: '#f5a623',
    label: 'Lead',
  },
  frontend: {
    bg: '#0c2d42',
    text: '#7dd3fc',
    accent: '#38bdf8',
    label: 'Frontend',
  },
  backend: {
    bg: '#0d3320',
    text: '#86efac',
    accent: '#4ade80',
    label: 'Backend',
  },
  tester: {
    bg: '#2a1f54',
    text: '#c4b5fd',
    accent: '#a78bfa',
    label: 'Tester',
  },
  expert: {
    bg: '#3d2010',
    text: '#fdba74',
    accent: '#fb923c',
    label: 'Squad Expert',
  },
  design: {
    bg: '#3d1028',
    text: '#f9a8d4',
    accent: '#f472b6',
    label: 'Design',
  },
  scribe: {
    bg: '#1e2736',
    text: '#cbd5e1',
    accent: '#94a3b8',
    label: 'Scribe',
  },
  monitor: {
    bg: '#0d3330',
    text: '#5eead4',
    accent: '#2dd4bf',
    label: 'Monitor',
  },
} as const;

export type AgentRole = keyof typeof ROLE_COLORS;

// ── Status Colors ──

export const STATUS_COLORS = {
  active: { color: '#4ade80', label: 'Active' },
  idle: { color: '#facc15', label: 'Idle' },
  error: { color: '#f87171', label: 'Error' },
  working: { color: '#60a5fa', label: 'Working' },
} as const;

export type AgentStatus = keyof typeof STATUS_COLORS;

// ── Avatar Colors ──
// Distinguishable colors for agent initials circles.
// Ordered to maximize visual separation when shown side-by-side.

export const AVATAR_COLORS = [
  '#f5a623', // amber (lead)
  '#38bdf8', // cyan (frontend)
  '#4ade80', // green (backend)
  '#a78bfa', // purple (tester)
  '#fb923c', // orange (expert)
  '#f472b6', // pink (design)
  '#94a3b8', // slate (scribe)
  '#2dd4bf', // teal (monitor)
  '#e879f9', // fuchsia
  '#f97316', // deep orange
  '#22d3ee', // bright cyan
  '#a3e635', // lime
] as const;

/**
 * Get a deterministic avatar color from an agent name or ID.
 */
export function getAvatarColor(identifier: string): string {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Layout Constants ──

export const LAYOUT = {
  sidebarWidth: 280,
  panelMinWidth: 320,
  statusBarHeight: 32,
  headerHeight: 48,
  avatarSizeSm: 24,
  avatarSizeMd: 32,
  avatarSizeLg: 40,
} as const;

// ── Z-Index Scale ──

export const Z_INDEX = {
  base: 0,
  sidebar: 10,
  header: 20,
  dropdown: 30,
  modal: 40,
  overlay: 50,
  toast: 60,
  tooltip: 70,
} as const;

// ── Transition Presets ──

export const TRANSITIONS = {
  fast: '100ms ease-out',
  base: '150ms ease-out',
  slow: '250ms ease-out',
  snappy: '150ms cubic-bezier(0.2, 0, 0, 1)',
} as const;
