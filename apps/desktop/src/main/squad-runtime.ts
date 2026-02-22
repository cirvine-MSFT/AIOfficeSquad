import { readFile } from 'fs/promises'
import { join } from 'path'
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

  private eventHandlers: Set<EventHandler> = new Set()
  private deltaHandlers: Set<DeltaHandler> = new Set()
  private usageHandlers: Set<UsageHandler> = new Set()

  constructor(squadRoot?: string) {
    this.squadRoot = squadRoot ?? process.cwd()
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  async connect(): Promise<void> {
    try {
      // Dynamic imports to handle ESM subpath exports
      const { SquadClientWithPool } = await import('@bradygaster/squad-sdk/client')
      const { EventBus } = await import('@bradygaster/squad-sdk/runtime/event-bus')
      const { StreamingPipeline } = await import('@bradygaster/squad-sdk/runtime/streaming')
      const { RalphMonitor } = await import('@bradygaster/squad-sdk/ralph')

      this.eventBus = new EventBus()
      this.client = new SquadClientWithPool()
      this.pipeline = new StreamingPipeline()
      this.monitor = new RalphMonitor()

      // Subscribe to EventBus — forward all events to registered handlers
      this.eventBus.onAny((event: SquadEvent) => {
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

      console.log('[SquadRuntime] connected')
    } catch (err) {
      console.error('[SquadRuntime] connect failed:', err)
      throw err
    }
  }

  async shutdown(): Promise<void> {
    try {
      if (this.pipeline?.stop) await this.pipeline.stop()
      if (this.monitor?.stop) await this.monitor.stop()
      if (this.client?.close) await this.client.close()
      this.eventHandlers.clear()
      this.deltaHandlers.clear()
      this.usageHandlers.clear()
      this.client = null
      this.eventBus = null
      this.pipeline = null
      this.monitor = null
      console.log('[SquadRuntime] shutdown complete')
    } catch (err) {
      console.error('[SquadRuntime] shutdown error:', err)
    }
  }

  // ── Session management ─────────────────────────────────────────

  async createSession(
    agentName: string,
    config?: CreateSessionConfig
  ): Promise<{ sessionId: string }> {
    if (!this.client) throw new Error('Runtime not connected')
    const session = await this.client.createSession({
      agent: agentName,
      ...config
    })
    return { sessionId: session.id ?? session.sessionId }
  }

  async sendMessage(sessionId: string, prompt: string): Promise<void> {
    if (!this.client) throw new Error('Runtime not connected')
    await this.client.sendMessage(sessionId, prompt)
  }

  async listSessions(): Promise<unknown[]> {
    if (!this.client) throw new Error('Runtime not connected')
    return await this.client.listSessions()
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.client) throw new Error('Runtime not connected')
    await this.client.deleteSession(id)
  }

  async getStatus(): Promise<unknown> {
    if (!this.client) throw new Error('Runtime not connected')
    return await this.client.getStatus()
  }

  async getAuthStatus(): Promise<unknown> {
    if (!this.client) throw new Error('Runtime not connected')
    return await this.client.getAuthStatus()
  }

  async listModels(): Promise<unknown[]> {
    if (!this.client) throw new Error('Runtime not connected')
    return await this.client.listModels()
  }

  // ── Squad config & roster ──────────────────────────────────────

  async loadSquadConfig(): Promise<SquadConfig> {
    try {
      const { resolveSquad, loadConfig } = await import('@bradygaster/squad-sdk')
      const squadDir = await resolveSquad(this.squadRoot)
      const config = await loadConfig(squadDir)
      const members = await this.getRoster()
      return {
        name: config?.name ?? 'unknown',
        root: squadDir,
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
