import { readFile, access } from 'fs/promises'
import { join, dirname } from 'path'
import { execSync } from 'child_process'
import type {
  AgentStatus,
  CreateSessionConfig,
  SquadConfig,
  SquadEvent,
  SquadMember,
  StreamDelta,
  UsageEvent
} from './types.js'

// ── Squad SDK imports ──────────────────────────────────────────────
// The SDK is ESM-only with subpath exports.  We use dynamic import()
// so the module loads cleanly inside Electron's main process (also ESM).

type EventHandler = (event: SquadEvent) => void
type DeltaHandler = (delta: StreamDelta) => void
type UsageHandler = (usage: UsageEvent) => void

/**
 * SquadRuntime owns the full lifecycle of the Squad SDK in the main process.
 * Only one instance should exist; it is created at app-ready and torn down
 * on app-will-quit.
 */
export class SquadRuntime {
  private client: any = null
  private eventBus: any = null
  private pipeline: any = null
  private monitor: any = null
  private squadRoot: string
  private _isReady: boolean = false
  private sessions: Map<string, any> = new Map()

  private eventHandlers: Set<EventHandler> = new Set()
  private deltaHandlers: Set<DeltaHandler> = new Set()
  private usageHandlers: Set<UsageHandler> = new Set()
  private readyHandlers: Set<() => void> = new Set()
  private _initAttempted: boolean = false
  private _initPromise: Promise<void> | null = null

  constructor(squadRoot?: string) {
    // Resolve to git repo root so we find .squad/ regardless of CWD
    if (squadRoot) {
      this.squadRoot = squadRoot
    } else {
      try {
        this.squadRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
      } catch {
        this.squadRoot = process.cwd()
      }
    }
  }

  get isReady(): boolean {
    return this._isReady
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  /**
   * Initialize the Squad SDK components. Safe to call — if SDK is unavailable
   * or auth fails, logs error but doesn't crash. Roster reading always works.
   */
  async initialize(): Promise<void> {
    // Prevent concurrent or repeated init attempts
    if (this._initAttempted) return this._initPromise ?? Promise.resolve()
    this._initAttempted = true

    this._initPromise = (async () => {
      try {
        // Dynamic imports to handle ESM subpath exports
        const { SquadClientWithPool } = await import('@bradygaster/squad-sdk/client')
        const { EventBus } = await import('@bradygaster/squad-sdk/runtime/event-bus')
        const { StreamingPipeline } = await import('@bradygaster/squad-sdk/runtime/streaming')
        const { RalphMonitor } = await import('@bradygaster/squad-sdk/ralph')

        this.eventBus = new EventBus()
        this.client = new SquadClientWithPool({})
        await this.client.connect()
        this.pipeline = new StreamingPipeline()
        this.monitor = new RalphMonitor()

        // Subscribe to EventBus — forward all events to registered handlers
        this.eventBus.subscribeAll((event: SquadEvent) => {
          for (const handler of this.eventHandlers) {
            try { handler(event) } catch { /* handler errors don't crash runtime */ }
          }
        })

        // Subscribe to streaming deltas
        if (this.pipeline.onDelta) {
          this.pipeline.onDelta((delta: StreamDelta) => {
            for (const handler of this.deltaHandlers) {
              try { handler(delta) } catch { /* swallow */ }
            }
          })
        }

        // Subscribe to usage events
        if (this.pipeline.onUsage) {
          this.pipeline.onUsage((usage: UsageEvent) => {
            for (const handler of this.usageHandlers) {
              try { handler(usage) } catch { /* swallow */ }
            }
          })
        }

        this._isReady = true
        console.log('[SquadRuntime] initialized successfully')

        // Notify ready handlers
        for (const handler of this.readyHandlers) {
          try { handler() } catch { /* swallow */ }
        }
      } catch (err) {
        console.error('[SquadRuntime] initialize failed (SDK unavailable or auth issue):', err)
        console.log('[SquadRuntime] continuing without SDK — roster reading still works')
        // Don't throw — roster features work without SDK
      }
    })()

    return this._initPromise
  }

  async cleanup(): Promise<void> {
    try {
      if (this.pipeline?.stop) await this.pipeline.stop()
      if (this.monitor?.stop) await this.monitor.stop()
      if (this.client?.shutdown) await this.client.shutdown()
      this.sessions.clear()
      this.eventHandlers.clear()
      this.deltaHandlers.clear()
      this.usageHandlers.clear()
      this.readyHandlers.clear()
      this.client = null
      this.eventBus = null
      this.pipeline = null
      this.monitor = null
      this._isReady = false
      console.log('[SquadRuntime] cleanup complete')
    } catch (err) {
      console.error('[SquadRuntime] cleanup error:', err)
    }
  }

  // ── Session management ─────────────────────────────────────────

  async createSession(
    agentName: string,
    config?: CreateSessionConfig
  ): Promise<{ sessionId: string }> {
    if (this._initAttempted && !this._isReady) {
      throw new Error('SDK not connected — Copilot CLI is not running')
    }
    if (!this.client) throw new Error('SDK not available')
    const session = await this.client.createSession({
      agent: agentName,
      ...config
    })
    const id = session.id ?? session.sessionId
    this.sessions.set(id, session)
    return { sessionId: id }
  }

  async sendMessage(sessionId: string, prompt: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)
    await session.sendAndWait(prompt)
  }

  async listSessions(): Promise<unknown[]> {
    if (!this._isReady || !this.client) throw new Error('SDK not available')
    return await this.client.listSessions()
  }

  async deleteSession(id: string): Promise<void> {
    const session = this.sessions.get(id)
    if (session?.destroy) {
      await session.destroy()
    }
    this.sessions.delete(id)
    if (this.client) {
      await this.client.deleteSession(id)
    }
  }

  async getStatus(): Promise<unknown> {
    if (!this._isReady || !this.client) throw new Error('SDK not available')
    return await this.client.getStatus()
  }

  async getAuthStatus(): Promise<unknown> {
    if (!this._isReady || !this.client) throw new Error('SDK not available')
    return await this.client.getAuthStatus()
  }

  async listModels(): Promise<unknown[]> {
    if (!this._isReady || !this.client) throw new Error('SDK not available')
    return await this.client.listModels()
  }

  // ── Decisions & connection info ─────────────────────────────────

  async getDecisions(): Promise<string> {
    const decPath = join(this.squadRoot, '.squad', 'decisions.md')
    try {
      return await readFile(decPath, 'utf-8')
    } catch {
      return ''
    }
  }

  getConnectionInfo(): { connected: boolean; error?: string; squadRoot: string } {
    return {
      connected: this._isReady,
      error: this._initAttempted && !this._isReady ? 'SDK not connected' : undefined,
      squadRoot: this.squadRoot
    }
  }

  // ── Squad config & roster ──────────────────────────────────────

  async loadSquadConfig(): Promise<SquadConfig> {
    try {
      const members = await this.getRoster()
      // Try to read squad name from team.md or fall back
      const teamPath = join(this.squadRoot, '.squad', 'team.md')
      let name = 'Squad Office'
      try {
        const content = await readFile(teamPath, 'utf-8')
        const nameMatch = content.match(/^#\s+(.+)/m)
        if (nameMatch) name = nameMatch[1]
      } catch { /* use default */ }
      return {
        name,
        root: this.squadRoot,
        members
      }
    } catch (err) {
      console.error('[SquadRuntime] loadSquadConfig failed:', err)
      throw err
    }
  }

  async getRoster(): Promise<SquadMember[]> {
    try {
      const teamPath = join(this.squadRoot, '.squad', 'team.md')
      const content = await readFile(teamPath, 'utf-8')
      return parseTeamMd(content)
    } catch (err) {
      console.error('[SquadRuntime] getRoster failed:', err)
      return []
    }
  }

  async getAgentStatuses(): Promise<AgentStatus[]> {
    if (!this.monitor?.getStatus) return []
    try {
      return await this.monitor.getStatus()
    } catch {
      return []
    }
  }

  // ── Event subscriptions ────────────────────────────────────────

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler)
    return () => { this.eventHandlers.delete(handler) }
  }

  onStreamDelta(handler: DeltaHandler): () => void {
    this.deltaHandlers.add(handler)
    return () => { this.deltaHandlers.delete(handler) }
  }

  onUsage(handler: UsageHandler): () => void {
    this.usageHandlers.add(handler)
    return () => { this.usageHandlers.delete(handler) }
  }

  onReady(handler: () => void): () => void {
    this.readyHandlers.add(handler)
    // If already ready, call immediately
    if (this._isReady) {
      try { handler() } catch { /* swallow */ }
    }
    return () => { this.readyHandlers.delete(handler) }
  }
}

// ── team.md parser ───────────────────────────────────────────────

function parseTeamMd(content: string): SquadMember[] {
  const members: SquadMember[] = []
  const lines = content.split('\n')
  let inTable = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue

    // Skip separator rows
    if (/^\|[\s-:]+\|/.test(trimmed) && trimmed.includes('---')) {
      inTable = true
      continue
    }

    // Skip header row (first row with pipes but before separator)
    if (!inTable) continue

    const cells = trimmed
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)

    if (cells.length >= 3) {
      members.push({
        name: cells[0],
        role: cells[1],
        agent: cells[2],
        status: cells[3] ?? 'active'
      })
    }
  }

  return members
}
