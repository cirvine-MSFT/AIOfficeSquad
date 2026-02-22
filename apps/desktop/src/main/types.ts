// ── Squad SDK Type Definitions ──────────────────────────────────────
// These interfaces mirror the Squad SDK's runtime types so the main
// process, preload, and renderer all share a single contract.

/** Ready state for Squad runtime */
export interface ReadyState {
  ready: boolean
  squadRoot: string
}

/** Session creation options */
export interface CreateSessionConfig {
  model?: string
  systemPrompt?: string
  tools?: string[]
}

/** Agent status from RalphMonitor */
export interface AgentStatus {
  name: string
  status: 'idle' | 'busy' | 'error' | 'offline'
  lastActivity?: string
  sessionId?: string
}

/** Squad member parsed from team.md */
export interface SquadMember {
  name: string
  role: string
  agent: string
  status: string
}

/** Squad configuration from .squad/ */
export interface SquadConfig {
  name: string
  root: string
  members: SquadMember[]
}

/** Generic event from the Squad EventBus */
export interface SquadEvent {
  type: string
  timestamp: number
  payload: unknown
}

/** Streaming delta from the pipeline */
export interface StreamDelta {
  sessionId: string
  delta: string
  role: 'assistant' | 'tool'
}

/** Token usage from a completed turn */
export interface UsageEvent {
  sessionId: string
  inputTokens: number
  outputTokens: number
  model: string
}

export interface ConnectionInfo {
  connected: boolean
  error?: string
  squadRoot: string
}

/** Connection state pushed from main to renderer */
export interface ConnectionState {
  connected: boolean
  error?: string
}

/** Standard IPC result wrapper */
export type IpcResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ── IPC Channel Map ────────────────────────────────────────────────
// Single source of truth for all channel names and their signatures.

export interface IpcInvokeChannels {
  'squad:get-ready-state': { args: []; result: IpcResult<ReadyState> }
  'squad:create-session': { args: [string, CreateSessionConfig?]; result: IpcResult<{ sessionId: string }> }
  'squad:send-message': { args: [string, string]; result: IpcResult<void> }
  'squad:list-sessions': { args: []; result: IpcResult<unknown[]> }
  'squad:delete-session': { args: [string]; result: IpcResult<void> }
  'squad:get-status': { args: []; result: IpcResult<unknown> }
  'squad:get-auth-status': { args: []; result: IpcResult<unknown> }
  'squad:list-models': { args: []; result: IpcResult<unknown[]> }
  'squad:load-config': { args: []; result: IpcResult<SquadConfig> }
  'squad:get-roster': { args: []; result: IpcResult<SquadMember[]> }
  'squad:get-agent-statuses': { args: []; result: IpcResult<AgentStatus[]> }
  'squad:get-session-detail': { args: [string]; result: IpcResult<SessionDetail> }
  'squad:get-decisions': { args: []; result: IpcResult<string> }
  'squad:get-connection-info': { args: []; result: IpcResult<ConnectionInfo> }
  'squad:get-hook-activity': { args: []; result: IpcResult<HookEvent[]> }
}

export interface IpcPushChannels {
  'squad:event': SquadEvent
  'squad:stream-delta': StreamDelta
  'squad:stream-usage': UsageEvent
  'squad:connection-state': ConnectionState
  'squad:config-loaded': SquadConfig
  'hub:stats-updated': HubStats
  'hub:squad-status': SquadStatus
}

// ── Phase 1a: New interfaces (Dutch arch doc §H) ───────────────────

/** Hub-level aggregate statistics */
export interface HubStats {
  floorCount: number
  totalMembers: number
  activeSessions: number
  totalSessions: number
}

/** Summary of a single squad for hub/sidebar display */
export interface SquadInfo {
  id: string
  name: string
  floor: number
  root: string
  memberCount: number
  activeSessionCount: number
  status: 'connected' | 'disconnected' | 'error'
}

/** Per-squad status update pushed from main */
export interface SquadStatus {
  squadId: string
  connected: boolean
  activeSessionCount: number
  error?: string
}

/** Metadata for a session in the floor view */
export interface SessionMetadata {
  id: string
  name: string
  status: 'active' | 'idle' | 'error' | 'creating' | 'destroyed'
  task?: string
  agentNames: string[]
  createdAt: number
}

/** Full session detail for the office view */
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

/** Agent within a session context */
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

export type IpcInvokeChannel = keyof IpcInvokeChannels
export type IpcPushChannel = keyof IpcPushChannels
