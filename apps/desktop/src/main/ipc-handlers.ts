import { ipcMain, type BrowserWindow } from 'electron'
import type { SquadRuntime } from './squad-runtime.js'
import type { IpcResult } from './types.js'

/**
 * Registers all IPC handlers that bridge the renderer ↔ Squad runtime.
 * Call once after the runtime is created and the main window exists.
 */
export function registerIpcHandlers(
  runtime: SquadRuntime,
  getMainWindow: () => BrowserWindow | null
): void {
  // ── Helper: wrap async SDK calls with error handling ───────────
  function handle<T>(
    channel: string,
    fn: (...args: any[]) => Promise<T>
  ): void {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        const data = await fn(...args)
        return { ok: true, data } as IpcResult<T>
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[IPC] ${channel} error:`, message)
        return { ok: false, error: message } as IpcResult
      }
    })
  }

  // ── Invoke channels (renderer → main) ─────────────────────────

  handle('squad:connect', (config?: any) => runtime.connect())

  handle('squad:disconnect', () => runtime.shutdown())

  handle('squad:create-session', (agentName: string, config?: any) =>
    runtime.createSession(agentName, config)
  )

  handle('squad:send-message', (sessionId: string, prompt: string) =>
    runtime.sendMessage(sessionId, prompt)
  )

  handle('squad:list-sessions', () => runtime.listSessions())

  handle('squad:delete-session', (id: string) => runtime.deleteSession(id))

  handle('squad:get-status', () => runtime.getStatus())

  handle('squad:get-auth-status', () => runtime.getAuthStatus())

  handle('squad:list-models', () => runtime.listModels())

  handle('squad:load-config', () => runtime.loadSquadConfig())

  handle('squad:get-roster', () => runtime.getRoster())

  handle('squad:get-agent-statuses', () => runtime.getAgentStatuses())

  // ── Push channels (main → renderer) ───────────────────────────
  // Subscribe to runtime events and forward them to the renderer.

  const send = (channel: string, payload: unknown) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }

  runtime.onEvent((event) => send('squad:event', event))
  runtime.onStreamDelta((delta) => send('squad:stream-delta', delta))
  runtime.onUsage((usage) => send('squad:stream-usage', usage))
}

/**
 * Removes all registered IPC handlers. Call on shutdown.
 */
export function removeIpcHandlers(): void {
  const channels = [
    'squad:connect',
    'squad:disconnect',
    'squad:create-session',
    'squad:send-message',
    'squad:list-sessions',
    'squad:delete-session',
    'squad:get-status',
    'squad:get-auth-status',
    'squad:list-models',
    'squad:load-config',
    'squad:get-roster',
    'squad:get-agent-statuses'
  ]
  for (const ch of channels) {
    ipcMain.removeHandler(ch)
  }
}
