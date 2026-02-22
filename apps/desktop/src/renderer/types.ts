/**
 * Renderer-local type definitions.
 * Mirrors the subset of main/types.ts used by the renderer.
 * Kept in the renderer rootDir to satisfy tsconfig boundaries.
 */

export interface ConnectionState {
  connected: boolean
  error?: string
}

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
