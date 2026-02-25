/**
 * Crash Resistance Tests — verifies the app never crashes from SDK failures,
 * null objects, or destroyed windows.
 *
 * Tests the safety contract that Poncho's ErrorBoundary + defensive guards
 * rely on: every main-process entry point returns safe defaults or IpcResult
 * errors instead of throwing unhandled exceptions.
 *
 * Created by Blain (Tester) for crash resistance hardening.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock fs/promises ────────────────────────────────────────────────

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  access: vi.fn()
}))

import { readFile } from 'fs/promises'
const mockReadFile = vi.mocked(readFile)

// ── Controllable SDK mocks ──────────────────────────────────────────
// sdkControl.shouldFail triggers constructor throws to simulate import failures.
// Using an object so the reference survives vi.mock hoisting.
const sdkControl = { shouldFail: false }

const mockClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  listSessions: vi.fn().mockResolvedValue([]),
  getStatus: vi.fn().mockResolvedValue({ status: 'ready' }),
  getAuthStatus: vi.fn().mockResolvedValue({ authenticated: true }),
  listModels: vi.fn().mockResolvedValue(['model-1']),
}

const mockEventBus = { subscribeAll: vi.fn() }
const mockPipeline = {
  onDelta: vi.fn(), onUsage: vi.fn(), onHook: vi.fn(), stop: vi.fn()
}
const mockMonitor = {
  getStatus: vi.fn().mockResolvedValue([]), stop: vi.fn()
}

vi.mock('@bradygaster/squad-sdk/client', () => ({
  SquadClientWithPool: class {
    constructor() {
      if (sdkControl.shouldFail) throw new Error('Cannot find module @bradygaster/squad-sdk/client')
      return mockClient
    }
  }
}))
vi.mock('@bradygaster/squad-sdk/runtime/event-bus', () => ({
  EventBus: class {
    constructor() {
      if (sdkControl.shouldFail) throw new Error('Cannot find module')
      return mockEventBus
    }
  }
}))
vi.mock('@bradygaster/squad-sdk/runtime/streaming', () => ({
  StreamingPipeline: class {
    constructor() {
      if (sdkControl.shouldFail) throw new Error('Cannot find module')
      return mockPipeline
    }
  }
}))
vi.mock('@bradygaster/squad-sdk/ralph', () => ({
  RalphMonitor: class {
    constructor() {
      if (sdkControl.shouldFail) throw new Error('Cannot find module')
      return mockMonitor
    }
  }
}))

// ── Mock Electron ───────────────────────────────────────────────────

const handlers = new Map<string, (...args: any[]) => Promise<any>>()

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers.set(channel, async (...args: any[]) => handler({ sender: {} }, ...args))
    }),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn()
}))

import { SquadRuntime } from '../../main/squad-runtime.js'

// ════════════════════════════════════════════════════════════════════
// § 1. SquadRuntime crash resistance
// ════════════════════════════════════════════════════════════════════

describe('SquadRuntime crash resistance', () => {
  let runtime: SquadRuntime

  beforeEach(() => {
    vi.clearAllMocks()
    sdkControl.shouldFail = false
    runtime = new SquadRuntime('/test/squad/root')
  })

  afterEach(async () => {
    sdkControl.shouldFail = false
    await runtime.cleanup()
  })

  // ── initialize() resilience ─────────────────────────────────────

  it('initialize() does not throw when SDK imports fail', async () => {
    sdkControl.shouldFail = true
    await expect(runtime.initialize()).resolves.toBeUndefined()
    expect(runtime.isReady).toBe(false)
  })

  it('after failed initialize(), all SDK objects are null (no async crash vectors)', async () => {
    sdkControl.shouldFail = true
    await runtime.initialize()

    const r = runtime as any
    expect(r.client).toBeNull()
    expect(r.eventBus).toBeNull()
    expect(r.pipeline).toBeNull()
    expect(r.monitor).toBeNull()
  })

  // ── cleanup() resilience ────────────────────────────────────────

  it('cleanup() sets _isReady = false BEFORE doing cleanup work', async () => {
    await runtime.initialize()
    expect(runtime.isReady).toBe(true)

    // Track isReady during each cleanup call
    let isReadyDuringPipelineStop: boolean | undefined
    let isReadyDuringMonitorStop: boolean | undefined
    let isReadyDuringClientShutdown: boolean | undefined

    mockPipeline.stop.mockImplementation(async () => {
      isReadyDuringPipelineStop = runtime.isReady
    })
    mockMonitor.stop.mockImplementation(async () => {
      isReadyDuringMonitorStop = runtime.isReady
    })
    mockClient.shutdown.mockImplementation(async () => {
      isReadyDuringClientShutdown = runtime.isReady
    })

    await runtime.cleanup()

    // isReady MUST be false during all cleanup calls — prevents
    // new requests from racing against teardown
    expect(isReadyDuringPipelineStop).toBe(false)
    expect(isReadyDuringMonitorStop).toBe(false)
    expect(isReadyDuringClientShutdown).toBe(false)
  })

  it('cleanup() does not throw when pipeline/monitor/client are null', async () => {
    // Never initialized — all internal SDK objects are null
    await expect(runtime.cleanup()).resolves.toBeUndefined()
    expect(runtime.isReady).toBe(false)
  })

  it('cleanup() does not throw when cleanup methods themselves throw', async () => {
    await runtime.initialize()

    mockPipeline.stop.mockRejectedValueOnce(new Error('pipeline stop failed'))
    mockMonitor.stop.mockRejectedValueOnce(new Error('monitor stop failed'))
    mockClient.shutdown.mockRejectedValueOnce(new Error('shutdown failed'))

    await expect(runtime.cleanup()).resolves.toBeUndefined()
    expect(runtime.isReady).toBe(false)
  })

  // ── loadSquadConfig() resilience ────────────────────────────────

  it('loadSquadConfig() returns defaults when .squad/team.md is missing', async () => {
    // Both readFile calls (getRoster + name read) will fail
    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // getRoster
      .mockRejectedValueOnce(new Error('ENOENT'))  // name read

    const config = await runtime.loadSquadConfig()
    expect(config.name).toBe('Squad Campus')
    expect(config.members).toEqual([])
    expect(config.root).toBe('/test/squad/root')
  })

  // ── getRoster() resilience ──────────────────────────────────────

  it('getRoster() returns empty array when file is missing', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    expect(await runtime.getRoster()).toEqual([])
  })

  // ── Getter safe defaults when not connected ─────────────────────

  it('getStatus() returns safe default when not connected', async () => {
    expect(await runtime.getStatus()).toEqual({ status: 'disconnected' })
  })

  it('getAuthStatus() returns safe default when not connected', async () => {
    expect(await runtime.getAuthStatus()).toEqual({ authenticated: false })
  })

  it('listModels() returns empty array when not connected', async () => {
    expect(await runtime.listModels()).toEqual([])
  })

  it('getAgentStatuses() returns empty array when not connected', async () => {
    expect(await runtime.getAgentStatuses()).toEqual([])
  })

  it('all getters return safe defaults after failed initialize()', async () => {
    sdkControl.shouldFail = true
    await runtime.initialize()

    expect(await runtime.getStatus()).toEqual({ status: 'disconnected' })
    expect(await runtime.getAuthStatus()).toEqual({ authenticated: false })
    expect(await runtime.listModels()).toEqual([])
    expect(await runtime.getAgentStatuses()).toEqual([])
    expect(await runtime.listSessions()).toEqual([])

    const info = runtime.getConnectionInfo()
    expect(info.connected).toBe(false)
    expect(info.error).toBe('SDK not connected')
  })
})

// ════════════════════════════════════════════════════════════════════
// § 2. IPC handler crash resistance
// ════════════════════════════════════════════════════════════════════

describe('IPC handler crash resistance', () => {
  const mockRuntime = {
    isReady: true,
    squadRoot: '/test/squad/root',
    createSession: vi.fn(),
    sendMessage: vi.fn(),
    listSessions: vi.fn().mockResolvedValue([]),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({ status: 'ready' }),
    getAuthStatus: vi.fn().mockResolvedValue({ authenticated: true }),
    listModels: vi.fn().mockResolvedValue([]),
    loadSquadConfig: vi.fn().mockResolvedValue({ name: 'Test', root: '/', members: [] }),
    getRoster: vi.fn().mockResolvedValue([]),
    getAgentStatuses: vi.fn().mockResolvedValue([]),
    getDecisions: vi.fn().mockResolvedValue(''),
    getConnectionInfo: vi.fn().mockReturnValue({ connected: true, squadRoot: '/' }),
    getHookActivity: vi.fn().mockReturnValue([]),
    onEvent: vi.fn().mockReturnValue(() => {}),
    onStreamDelta: vi.fn().mockReturnValue(() => {}),
    onUsage: vi.fn().mockReturnValue(() => {}),
    onReady: vi.fn().mockReturnValue(() => {}),
  }

  let mockWindow: any

  beforeEach(async () => {
    vi.clearAllMocks()
    handlers.clear()
    mockWindow = null

    const { registerIpcHandlers } = await import('../../main/ipc-handlers.js')
    registerIpcHandlers(mockRuntime as any, () => mockWindow)
  })

  // ── handle() wrapper error conversion ───────────────────────────

  it('handle() converts thrown Error to { ok: false, error: string }', async () => {
    mockRuntime.createSession.mockRejectedValueOnce(new Error('SDK exploded'))
    const handler = handlers.get('squad:create-session')!

    const result = await handler('agent-1')

    expect(result).toEqual({ ok: false, error: 'SDK exploded' })
  })

  it('handle() converts non-Error throws to { ok: false, error: string }', async () => {
    mockRuntime.createSession.mockRejectedValueOnce('raw string error')
    const handler = handlers.get('squad:create-session')!

    const result = await handler('agent-1')

    expect(result).toEqual({ ok: false, error: 'raw string error' })
  })

  it('handle() converts synchronous throws to { ok: false, error }', async () => {
    mockRuntime.sendMessage.mockImplementation(() => {
      throw new TypeError('Cannot read property of undefined')
    })
    const handler = handlers.get('squad:send-message')!

    const result = await handler('sess-1', 'hello')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Cannot read property of undefined')
  })

  // ── send() to renderer resilience ───────────────────────────────

  it('send() does not throw when getMainWindow() returns null', () => {
    mockWindow = null

    expect(mockRuntime.onEvent).toHaveBeenCalled()
    const eventCallback = mockRuntime.onEvent.mock.calls[0][0]

    // Should silently no-op, not crash
    expect(() => eventCallback({
      type: 'test', timestamp: Date.now(), payload: {}
    })).not.toThrow()
  })

  it('send() does not throw when window is destroyed', () => {
    const sendSpy = vi.fn()
    mockWindow = {
      isDestroyed: () => true,
      webContents: { send: sendSpy }
    }

    expect(mockRuntime.onEvent).toHaveBeenCalled()
    const eventCallback = mockRuntime.onEvent.mock.calls[0][0]

    // Should not throw, and should NOT deliver the event
    expect(() => eventCallback({
      type: 'test', timestamp: Date.now(), payload: {}
    })).not.toThrow()
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('send() delivers events when window is valid', () => {
    const sendSpy = vi.fn()
    mockWindow = {
      isDestroyed: () => false,
      webContents: { send: sendSpy }
    }

    expect(mockRuntime.onEvent).toHaveBeenCalled()
    const eventCallback = mockRuntime.onEvent.mock.calls[0][0]

    const testEvent = { type: 'test', timestamp: 123, payload: {} }
    eventCallback(testEvent)

    expect(sendSpy).toHaveBeenCalledWith('squad:event', testEvent)
  })
})
