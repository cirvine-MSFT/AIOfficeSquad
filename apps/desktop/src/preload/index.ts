import { contextBridge, ipcRenderer } from 'electron'
import type {
  IpcResult,
  ReadyState,
  SquadConfig,
  SquadMember,
  AgentStatus,
  SessionDetail,
  ConnectionInfo,
  HookEvent,
  SquadEvent,
  StreamDelta,
  UsageEvent,
  ConnectionState
} from '../main/types'

export interface SquadAPI {
  createSession(agentName: string, config?: unknown): Promise<IpcResult<{ sessionId: string }>>
  sendMessage(sessionId: string, prompt: string): Promise<IpcResult<void>>
  listSessions(): Promise<IpcResult<unknown[]>>
  deleteSession(id: string): Promise<IpcResult<void>>
  getStatus(): Promise<IpcResult<unknown>>
  getAuthStatus(): Promise<IpcResult<unknown>>
  listModels(): Promise<IpcResult<unknown[]>>
  loadConfig(): Promise<IpcResult<SquadConfig>>
  getRoster(): Promise<IpcResult<SquadMember[]>>
  getAgentStatuses(): Promise<IpcResult<AgentStatus[]>>
  getReadyState(): Promise<IpcResult<ReadyState>>
  getSessionDetail(sessionId: string): Promise<IpcResult<SessionDetail>>
  getDecisions(): Promise<IpcResult<string>>
  getConnectionInfo(): Promise<IpcResult<ConnectionInfo>>
  getHookActivity(): Promise<IpcResult<HookEvent[]>>
  onConnectionState(callback: (state: ConnectionState) => void): () => void
  onEvent(callback: (event: SquadEvent) => void): () => void
  onStreamDelta(callback: (delta: StreamDelta) => void): () => void
  onStreamUsage(callback: (usage: UsageEvent) => void): () => void
}

const squadAPI: SquadAPI = {
  // ── Invoke channels (renderer → main) ─────────────────────────
  // Each invoke is wrapped so IPC-level failures (channel missing, serialization
  // error, main-process crash) are converted into {ok:false} results rather than
  // propagating as unhandled rejections in the renderer.
  createSession: (agentName, config?) =>
    ipcRenderer.invoke('squad:create-session', agentName, config)
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  sendMessage: (sessionId, prompt) =>
    ipcRenderer.invoke('squad:send-message', sessionId, prompt)
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  listSessions: () => ipcRenderer.invoke('squad:list-sessions')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  deleteSession: (id) => ipcRenderer.invoke('squad:delete-session', id)
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getStatus: () => ipcRenderer.invoke('squad:get-status')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getAuthStatus: () => ipcRenderer.invoke('squad:get-auth-status')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  listModels: () => ipcRenderer.invoke('squad:list-models')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  loadConfig: () => ipcRenderer.invoke('squad:load-config')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getRoster: () => ipcRenderer.invoke('squad:get-roster')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getAgentStatuses: () => ipcRenderer.invoke('squad:get-agent-statuses')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getReadyState: () => ipcRenderer.invoke('squad:get-ready-state')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getSessionDetail: (sessionId: string) =>
    ipcRenderer.invoke('squad:get-session-detail', sessionId)
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getDecisions: () => ipcRenderer.invoke('squad:get-decisions')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getConnectionInfo: () => ipcRenderer.invoke('squad:get-connection-info')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getHookActivity: () => ipcRenderer.invoke('squad:get-hook-activity')
      .catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),

  // ── Push channels (main → renderer) ───────────────────────────
  onConnectionState: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      try { callback(data as ConnectionState) } catch (err) { console.error('[Preload] onConnectionState callback error:', err) }
    }
    ipcRenderer.on('squad:connection-state', handler)
    return () => { ipcRenderer.removeListener('squad:connection-state', handler) }
  },
  onEvent: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      try { callback(data) } catch (err) { console.error('[Preload] onEvent callback error:', err) }
    }
    ipcRenderer.on('squad:event', handler)
    return () => { ipcRenderer.removeListener('squad:event', handler) }
  },
  onStreamDelta: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      try { callback(data) } catch (err) { console.error('[Preload] onStreamDelta callback error:', err) }
    }
    ipcRenderer.on('squad:stream-delta', handler)
    return () => { ipcRenderer.removeListener('squad:stream-delta', handler) }
  },
  onStreamUsage: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      try { callback(data) } catch (err) { console.error('[Preload] onStreamUsage callback error:', err) }
    }
    ipcRenderer.on('squad:stream-usage', handler)
    return () => { ipcRenderer.removeListener('squad:stream-usage', handler) }
  }
}

contextBridge.exposeInMainWorld('squadAPI', squadAPI)
