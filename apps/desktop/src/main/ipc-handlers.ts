import { ipcMain, type BrowserWindow } from 'electron'
import type { SquadRuntime } from './squad-runtime.js'
import type { IpcResult, SessionDetail, AgentInSession } from './types.js'

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

  handle('squad:get-ready-state', () => 
    Promise.resolve({ ready: runtime.isReady, squadRoot: runtime['squadRoot'] })
  )

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

  handle('squad:get-decisions', () => runtime.getDecisions())

  handle('squad:get-connection-info', () =>
    Promise.resolve(runtime.getConnectionInfo())
  )

  handle('squad:get-hook-activity', () =>
    Promise.resolve(runtime.getHookActivity())
  )

  handle('squad:get-session-detail', async (sessionId: string) => {
    const sessions = (await runtime.listSessions()) as any[]
    const session = sessions.find(
      (s: any) => (s.id ?? s.sessionId) === sessionId
    )
    if (!session) throw new Error(`Session not found: ${sessionId}`)

    const config = await runtime.loadSquadConfig()
    const agentStatuses = await runtime.getAgentStatuses()

    // Build agent list from session data cross-referenced with roster
    const agentNames: string[] = session.agents ?? (session.agent ? [session.agent] : [])
    const agents: AgentInSession[] = agentNames.map((name: string) => {
      const member = config.members.find((m) => m.name === name)
      const status = agentStatuses.find((a) => a.name === name)
      return {
        name,
        role: member?.role ?? 'unknown',
        status: status?.status === 'busy' ? 'active'
             : status?.status === 'error' ? 'error'
             : 'idle',
        model: (session as any).model,
        activity: status?.lastActivity,
        lastActivityAt: undefined
      }
    })

    return {
      id: session.id ?? session.sessionId,
      name: session.name ?? `Session ${sessionId.slice(0, 8)}`,
      status: session.status === 'active' ? 'active'
           : session.status === 'error' ? 'error'
           : 'idle',
      task: session.task ?? session.systemPrompt,
      squadId: config.root,
      squadName: config.name,
      agents,
      createdAt: session.createdAt ?? Date.now()
    } satisfies SessionDetail
  })

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
  
  // Notify renderer when SDK becomes ready
  runtime.onReady(() => {
    send('squad:connection-state', { connected: true })
  })
}

/**
 * Removes all registered IPC handlers. Call on shutdown.
 */
export function removeIpcHandlers(): void {
  const channels = [
    'squad:get-ready-state',
    'squad:create-session',
    'squad:send-message',
    'squad:list-sessions',
    'squad:delete-session',
    'squad:get-status',
    'squad:get-auth-status',
    'squad:list-models',
    'squad:load-config',
    'squad:get-roster',
    'squad:get-agent-statuses',
    'squad:get-decisions',
    'squad:get-connection-info',
    'squad:get-session-detail',
    'squad:get-hook-activity'
  ]
  for (const ch of channels) {
    ipcMain.removeHandler(ch)
  }
}
