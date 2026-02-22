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
  onEvent(callback: (event: unknown) => void): () => void
  onStreamDelta(callback: (delta: unknown) => void): () => void
  onStreamUsage(callback: (usage: unknown) => void): () => void
}

const squadAPI: SquadAPI = {
  // ── Invoke channels (renderer → main) ─────────────────────────
  createSession: (agentName, config?) =>
    ipcRenderer.invoke('squad:create-session', agentName, config),
  sendMessage: (sessionId, prompt) =>
    ipcRenderer.invoke('squad:send-message', sessionId, prompt),
  listSessions: () => ipcRenderer.invoke('squad:list-sessions'),
  deleteSession: (id) => ipcRenderer.invoke('squad:delete-session', id),
  getStatus: () => ipcRenderer.invoke('squad:get-status'),
  getAuthStatus: () => ipcRenderer.invoke('squad:get-auth-status'),
  listModels: () => ipcRenderer.invoke('squad:list-models'),
  loadConfig: () => ipcRenderer.invoke('squad:load-config'),
  getRoster: () => ipcRenderer.invoke('squad:get-roster'),
  getAgentStatuses: () => ipcRenderer.invoke('squad:get-agent-statuses'),
  getReadyState: () => ipcRenderer.invoke('squad:get-ready-state'),

  // ── Push channels (main → renderer) ───────────────────────────
  onEvent: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('squad:event', handler)
    return () => { ipcRenderer.removeListener('squad:event', handler) }
  },
  onStreamDelta: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('squad:stream-delta', handler)
    return () => { ipcRenderer.removeListener('squad:stream-delta', handler) }
  },
  onStreamUsage: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('squad:stream-usage', handler)
    return () => { ipcRenderer.removeListener('squad:stream-usage', handler) }
  }
}

contextBridge.exposeInMainWorld('squadAPI', squadAPI)
