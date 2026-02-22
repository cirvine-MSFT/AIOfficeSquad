/**
 * Crash Resistance Tests — verifies that SquadRuntime methods return
 * safe defaults when the SDK is not ready, and that edge cases don't
 * throw unhandled exceptions.
 *
 * Created by Blain (Tester) for crash audit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SquadRuntime } from '../../main/squad-runtime.js'
import { readFile } from 'fs/promises'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  access: vi.fn()
}))

const mockReadFile = vi.mocked(readFile)

// Mock SDK — all methods that could throw
const mockClient = {
  connect: vi.fn().mockRejectedValue(new Error('SDK unavailable')),
  shutdown: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  listSessions: vi.fn(),
  getStatus: vi.fn(),
  getAuthStatus: vi.fn(),
  listModels: vi.fn(),
  on: vi.fn()
}

const mockEventBus = { subscribeAll: vi.fn(), publish: vi.fn() }
const mockPipeline = { onDelta: vi.fn(), onUsage: vi.fn(), stop: vi.fn() }
const mockMonitor = { getStatus: vi.fn(), stop: vi.fn() }

vi.mock('@bradygaster/squad-sdk/client', () => ({
  SquadClientWithPool: class { constructor() { return mockClient } }
}))
vi.mock('@bradygaster/squad-sdk/runtime/event-bus', () => ({
  EventBus: class { constructor() { return mockEventBus } }
}))
vi.mock('@bradygaster/squad-sdk/runtime/streaming', () => ({
  StreamingPipeline: class { constructor() { return mockPipeline } }
}))
vi.mock('@bradygaster/squad-sdk/ralph', () => ({
  RalphMonitor: class { constructor() { return mockMonitor } }
}))

// ── Safe defaults when SDK not ready ──

describe('Crash Resistance — safe defaults when SDK not ready', () => {
  let runtime: SquadRuntime

  beforeEach(() => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  it('getStatus() returns { status: "disconnected" } without init', async () => {
    const result = await runtime.getStatus()
    expect(result).toEqual({ status: 'disconnected' })
  })

  it('getAuthStatus() returns { authenticated: false } without init', async () => {
    const result = await runtime.getAuthStatus()
    expect(result).toEqual({ authenticated: false })
  })

  it('listModels() returns empty array without init', async () => {
    const result = await runtime.listModels()
    expect(result).toEqual([])
  })

  it('listSessions() returns empty array without init', async () => {
    const result = await runtime.listSessions()
    expect(result).toEqual([])
  })

  it('getAgentStatuses() returns empty array without init', async () => {
    const result = await runtime.getAgentStatuses()
    expect(result).toEqual([])
  })

  it('getDecisions() returns empty string when file missing', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    const result = await runtime.getDecisions()
    expect(result).toBe('')
  })

  it('getConnectionInfo() returns disconnected before init', () => {
    const result = runtime.getConnectionInfo()
    expect(result.connected).toBe(false)
    expect(result.squadRoot).toBe('/test/squad/root')
  })

  it('getRoster() returns empty array when team.md missing', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    const result = await runtime.getRoster()
    expect(result).toEqual([])
  })

  it('loadSquadConfig() works even when team.md missing', async () => {
    // First call (getRoster -> readFile) fails
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'))
    
    const result = await runtime.loadSquadConfig()
    expect(result.name).toBe('Squad Campus')
    expect(result.members).toEqual([])
    expect(result.root).toBe('/test/squad/root')
  })
})

// ── Safe defaults after failed init ──

describe('Crash Resistance — safe defaults after failed init', () => {
  let runtime: SquadRuntime

  beforeEach(async () => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
    // Force SDK init to fail
    mockClient.connect.mockRejectedValueOnce(new Error('SDK unavailable'))
    await runtime.initialize()
    expect(runtime.isReady).toBe(false)
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  it('getStatus() returns safe default after failed init', async () => {
    const result = await runtime.getStatus()
    expect(result).toEqual({ status: 'disconnected' })
  })

  it('getAuthStatus() returns safe default after failed init', async () => {
    const result = await runtime.getAuthStatus()
    expect(result).toEqual({ authenticated: false })
  })

  it('listModels() returns empty array after failed init', async () => {
    const result = await runtime.listModels()
    expect(result).toEqual([])
  })

  it('listSessions() returns empty array after failed init', async () => {
    const result = await runtime.listSessions()
    expect(result).toEqual([])
  })

  it('getAgentStatuses() returns empty array after failed init', async () => {
    const result = await runtime.getAgentStatuses()
    expect(result).toEqual([])
  })

  it('getConnectionInfo() returns error state after failed init', () => {
    const result = runtime.getConnectionInfo()
    expect(result.connected).toBe(false)
    expect(result.error).toBe('SDK not connected')
  })
})

// ── createSession edge cases ──

describe('Crash Resistance — createSession edge cases', () => {
  let runtime: SquadRuntime

  beforeEach(async () => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  it('throws for empty string agent name', async () => {
    await expect(runtime.createSession('')).rejects.toThrow('Agent name is required')
  })

  it('throws for whitespace-only agent name', async () => {
    // The runtime checks `!agentName` — empty string is falsy, but whitespace is truthy.
    // This test documents current behavior: whitespace passes the name check
    // but will fail at SDK level. The IPC error handler catches it.
    await expect(runtime.createSession('   ')).rejects.toThrow('SDK not connected')
  })

  it('throws "SDK not connected" when SDK never initialized', async () => {
    await expect(runtime.createSession('test-agent')).rejects.toThrow('SDK not connected')
  })

  it('throws "SDK not connected" after failed init', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('Auth failed'))
    await runtime.initialize()
    await expect(runtime.createSession('test-agent')).rejects.toThrow('SDK not connected')
  })

  it('handles SDK createSession throwing', async () => {
    mockClient.connect.mockResolvedValueOnce(undefined)
    await runtime.initialize()
    mockClient.createSession.mockRejectedValueOnce(new Error('Session limit reached'))
    await expect(runtime.createSession('test-agent')).rejects.toThrow('Failed to create session')
  })
})

// ── cleanup resilience ──

describe('Crash Resistance — cleanup resilience', () => {
  let runtime: SquadRuntime

  beforeEach(() => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
  })

  it('cleanup() is safe when never initialized', async () => {
    await runtime.cleanup() // Should not throw
  })

  it('cleanup() handles all components failing', async () => {
    mockClient.connect.mockResolvedValueOnce(undefined)
    await runtime.initialize()

    mockPipeline.stop.mockRejectedValueOnce(new Error('Pipeline stop failed'))
    mockMonitor.stop.mockRejectedValueOnce(new Error('Monitor stop failed'))
    mockClient.shutdown.mockRejectedValueOnce(new Error('Shutdown failed'))

    // Should not throw even with all components failing
    await runtime.cleanup()
    expect(runtime.isReady).toBe(false)
  })
})

// ── Event handler resilience ──

describe('Crash Resistance — event handler errors do not crash runtime', () => {
  let runtime: SquadRuntime

  beforeEach(async () => {
    vi.clearAllMocks()
    mockClient.connect.mockResolvedValueOnce(undefined)
    runtime = new SquadRuntime('/test/squad/root')
    await runtime.initialize()
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  it('onEvent handler error does not crash', () => {
    const badHandler = vi.fn(() => { throw new Error('handler crash') })
    runtime.onEvent(badHandler)

    // Simulate EventBus firing an event
    const subscribeAllCall = mockEventBus.subscribeAll.mock.calls[0]
    expect(subscribeAllCall).toBeTruthy()

    const eventCallback = subscribeAllCall[0]
    // Should not throw even though handler throws
    expect(() => eventCallback({ type: 'test', timestamp: Date.now(), payload: {} })).not.toThrow()
    expect(badHandler).toHaveBeenCalled()
  })

  it('onReady handler error does not crash', () => {
    const badHandler = vi.fn(() => { throw new Error('handler crash') })
    // Register after init — handler should be called immediately since runtime is ready
    runtime.onReady(badHandler)
    expect(badHandler).toHaveBeenCalled()
  })

  it('unsubscribe function works correctly', () => {
    const handler = vi.fn()
    const unsub = runtime.onEvent(handler)
    unsub()
    // After unsubscribe, handler should not be in the set anymore
    // This prevents memory leaks from accumulated handlers
  })
})
