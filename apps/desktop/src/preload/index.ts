import { contextBridge, ipcRenderer } from 'electron'

export interface SquadAPI {
  createSession(agentName: string, config?: unknown): Promise<unknown>
  sendMessage(sessionId: string, prompt: string): Promise<unknown>
  listSessions(): Promise<unknown>
  deleteSession(id: string): Promise<unknown>
  getStatus(): Promise<unknown>
  getAuthStatus(): Promise<unknown>
  listModels(): Promise<unknown>
  loadConfig(): Promise<unknown>
  getRoster(): Promise<unknown>
  getAgentStatuses(): Promise<unknown>
  getReadyState(): Promise<unknown>
  getSessionDetail(sessionId: string): Promise<unknown>
  getDecisions(): Promise<unknown>
  getConnectionInfo(): Promise<unknown>
  getHookActivity(): Promise<unknown>
  onEvent(callback: (event: unknown) => void): () => void
  onStreamDelta(callback: (delta: unknown) => void): () => void
  onStreamUsage(callback: (usage: unknown) => void): () => void
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
