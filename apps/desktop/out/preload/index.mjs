import { contextBridge, ipcRenderer } from "electron";
const squadAPI = {
  // ── Invoke channels (renderer → main) ─────────────────────────
  createSession: (agentName, config) => ipcRenderer.invoke("squad:create-session", agentName, config),
  sendMessage: (sessionId, prompt) => ipcRenderer.invoke("squad:send-message", sessionId, prompt),
  listSessions: () => ipcRenderer.invoke("squad:list-sessions"),
  deleteSession: (id) => ipcRenderer.invoke("squad:delete-session", id),
  getStatus: () => ipcRenderer.invoke("squad:get-status"),
  getAuthStatus: () => ipcRenderer.invoke("squad:get-auth-status"),
  listModels: () => ipcRenderer.invoke("squad:list-models"),
  loadConfig: () => ipcRenderer.invoke("squad:load-config"),
  getRoster: () => ipcRenderer.invoke("squad:get-roster"),
  getAgentStatuses: () => ipcRenderer.invoke("squad:get-agent-statuses"),
  getReadyState: () => ipcRenderer.invoke("squad:get-ready-state"),
  getSessionDetail: (sessionId) => ipcRenderer.invoke("squad:get-session-detail", sessionId),
  getDecisions: () => ipcRenderer.invoke("squad:get-decisions"),
  getConnectionInfo: () => ipcRenderer.invoke("squad:get-connection-info"),
  // ── Push channels (main → renderer) ───────────────────────────
  onEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("squad:event", handler);
    return () => {
      ipcRenderer.removeListener("squad:event", handler);
    };
  },
  onStreamDelta: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("squad:stream-delta", handler);
    return () => {
      ipcRenderer.removeListener("squad:stream-delta", handler);
    };
  },
  onStreamUsage: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("squad:stream-usage", handler);
    return () => {
      ipcRenderer.removeListener("squad:stream-usage", handler);
    };
  }
};
contextBridge.exposeInMainWorld("squadAPI", squadAPI);
