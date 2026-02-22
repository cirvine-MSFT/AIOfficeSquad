import { contextBridge, ipcRenderer } from "electron";
const squadAPI = {
  // ── Invoke channels (renderer → main) ─────────────────────────
  // Each invoke is wrapped so IPC-level failures (channel missing, serialization
  // error, main-process crash) are converted into {ok:false} results rather than
  // propagating as unhandled rejections in the renderer.
  createSession: (agentName, config) => ipcRenderer.invoke("squad:create-session", agentName, config).catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  sendMessage: (sessionId, prompt) => ipcRenderer.invoke("squad:send-message", sessionId, prompt).catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  listSessions: () => ipcRenderer.invoke("squad:list-sessions").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  deleteSession: (id) => ipcRenderer.invoke("squad:delete-session", id).catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getStatus: () => ipcRenderer.invoke("squad:get-status").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getAuthStatus: () => ipcRenderer.invoke("squad:get-auth-status").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  listModels: () => ipcRenderer.invoke("squad:list-models").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  loadConfig: () => ipcRenderer.invoke("squad:load-config").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getRoster: () => ipcRenderer.invoke("squad:get-roster").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getAgentStatuses: () => ipcRenderer.invoke("squad:get-agent-statuses").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getReadyState: () => ipcRenderer.invoke("squad:get-ready-state").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getSessionDetail: (sessionId) => ipcRenderer.invoke("squad:get-session-detail", sessionId).catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getDecisions: () => ipcRenderer.invoke("squad:get-decisions").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getConnectionInfo: () => ipcRenderer.invoke("squad:get-connection-info").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  getHookActivity: () => ipcRenderer.invoke("squad:get-hook-activity").catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) })),
  // ── Push channels (main → renderer) ───────────────────────────
  onEvent: (callback) => {
    const handler = (_event, data) => {
      try {
        callback(data);
      } catch (err) {
        console.error("[Preload] onEvent callback error:", err);
      }
    };
    ipcRenderer.on("squad:event", handler);
    return () => {
      ipcRenderer.removeListener("squad:event", handler);
    };
  },
  onStreamDelta: (callback) => {
    const handler = (_event, data) => {
      try {
        callback(data);
      } catch (err) {
        console.error("[Preload] onStreamDelta callback error:", err);
      }
    };
    ipcRenderer.on("squad:stream-delta", handler);
    return () => {
      ipcRenderer.removeListener("squad:stream-delta", handler);
    };
  },
  onStreamUsage: (callback) => {
    const handler = (_event, data) => {
      try {
        callback(data);
      } catch (err) {
        console.error("[Preload] onStreamUsage callback error:", err);
      }
    };
    ipcRenderer.on("squad:stream-usage", handler);
    return () => {
      ipcRenderer.removeListener("squad:stream-usage", handler);
    };
  }
};
contextBridge.exposeInMainWorld("squadAPI", squadAPI);
