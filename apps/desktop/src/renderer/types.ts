/**
 * Renderer-local type definitions.
 * Mirrors the subset of main/types.ts used by the renderer.
 * Kept in the renderer rootDir to satisfy tsconfig boundaries.
 */

export interface StreamDelta {
  sessionId: string
  delta: string
  role: 'assistant' | 'tool'
}

export interface UsageEvent {
  sessionId: string
  inputTokens: number
  outputTokens: number
  model: string
}

export interface AgentStatus {
  name: string
  status: 'idle' | 'busy' | 'error' | 'offline'
  lastActivity?: string
  sessionId?: string
}

export interface SquadMember {
  name: string
  role: string
  agent: string
  status: string
}

export interface SquadConfig {
  name: string
  root: string
  members: SquadMember[]
}

// ── Phase 1a: New interfaces (Dutch arch doc §H) ───────────────────

export interface HubStats {
  floorCount: number
  totalMembers: number
  activeSessions: number
  totalSessions: number
}

export interface SquadInfo {
  id: string
  name: string
  floor: number
  root: string
  memberCount: number
  activeSessionCount: number
  status: 'connected' | 'disconnected' | 'error'
}

export interface SquadStatus {
  squadId: string
  connected: boolean
  activeSessionCount: number
  error?: string
}

export interface SessionMetadata {
  id: string
  name: string
  status: 'active' | 'idle' | 'error' | 'creating' | 'destroyed'
  task?: string
  agentNames: string[]
  createdAt: number
}

export interface SessionDetail {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  task?: string
  squadId: string
  squadName: string
  agents: AgentInSession[]
  createdAt: number
}

export interface AgentInSession {
  name: string
  role: string
  status: 'active' | 'idle' | 'error' | 'spawning'
  model?: string
  activity?: string
  lastActivityAt?: number
}

/** Governance hook event from the HookPipeline */
export interface HookEvent {
  id: string
  timestamp: number
  type: 'blocked' | 'scrubbed' | 'permitted' | 'info'
  description: string
  agentName?: string
}
