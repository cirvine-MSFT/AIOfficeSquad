// ── Squad SDK Type Definitions ──────────────────────────────────────
// These interfaces mirror the Squad SDK's runtime types so the main
// process, preload, and renderer all share a single contract.

/** Connection configuration for Squad runtime */
export interface SquadConnectionConfig {
  squadRoot?: string
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
  'squad:connect': { args: [SquadConnectionConfig?]; result: IpcResult<void> }
  'squad:disconnect': { args: []; result: IpcResult<void> }
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
}

export interface IpcPushChannels {
  'squad:event': SquadEvent
  'squad:stream-delta': StreamDelta
  'squad:stream-usage': UsageEvent
  'squad:connection-state': ConnectionState
}

export type IpcInvokeChannel = keyof IpcInvokeChannels
export type IpcPushChannel = keyof IpcPushChannels
