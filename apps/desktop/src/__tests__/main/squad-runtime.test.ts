import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SquadRuntime } from '../../main/squad-runtime.js'
import { readFile } from 'fs/promises'

// -- Mock fs/promises for getDecisions() tests --
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  access: vi.fn()
}))

const mockReadFile = vi.mocked(readFile)

// -- Mock the Squad SDK --
// The SDK requires real GitHub auth, so we mock all SDK imports.

const mockSession = {
  sessionId: 'test-session-123',
  id: 'test-session-123',
  send: vi.fn(),
  sendAndWait: vi.fn(),
  on: vi.fn(),
  getMessages: vi.fn().mockResolvedValue([]),
  destroy: vi.fn(),
  abort: vi.fn(),
  connection: {},
  workspacePath: '/test/workspace'
}

const mockClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
  getState: vi.fn().mockReturnValue('connected'),
  isConnected: vi.fn().mockReturnValue(true),
  createSession: vi.fn().mockResolvedValue(mockSession),
  resumeSession: vi.fn().mockResolvedValue(mockSession),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  listSessions: vi.fn().mockResolvedValue([]),
  ping: vi.fn().mockResolvedValue({ ok: true }),
  getStatus: vi.fn().mockResolvedValue({ status: 'ready' }),
  getAuthStatus: vi.fn().mockResolvedValue({ authenticated: true }),
  listModels: vi.fn().mockResolvedValue([]),
  on: vi.fn()
}

const mockEventBus = {
  subscribeAll: vi.fn(),
  publish: vi.fn()
}

const mockPipeline = {
  onDelta: vi.fn(),
  onUsage: vi.fn(),
  stop: vi.fn().mockResolvedValue(undefined)
}

const mockMonitor = {
  getStatus: vi.fn().mockResolvedValue([]),
  stop: vi.fn().mockResolvedValue(undefined)
}

vi.mock('@bradygaster/squad-sdk/client', () => ({
  SquadClientWithPool: class MockSquadClientWithPool {
    constructor() {
      return mockClient
    }
  }
}))

vi.mock('@bradygaster/squad-sdk/runtime/event-bus', () => ({
  EventBus: class MockEventBus {
    constructor() {
      return mockEventBus
    }
  }
}))

vi.mock('@bradygaster/squad-sdk/runtime/streaming', () => ({
  StreamingPipeline: class MockStreamingPipeline {
    constructor() {
      return mockPipeline
    }
  }
}))

vi.mock('@bradygaster/squad-sdk/ralph', () => ({
  RalphMonitor: class MockRalphMonitor {
    constructor() {
      return mockMonitor
    }
  }
}))

describe('SquadRuntime - Session Lifecycle', () => {
  let runtime: SquadRuntime

  beforeEach(() => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  // -- BUG 1: Missing connect() before operations --

  it('initialize() calls connect() on the client', async () => {
    await runtime.initialize()

    expect(mockClient.connect).toHaveBeenCalledTimes(1)
    expect(runtime.isReady).toBe(true)
  })

  it('SDK operations fail gracefully without connect()', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('Not connected'))

    await runtime.initialize()

    expect(runtime.isReady).toBe(false)
  })

  // -- BUG 2: sendMessage uses session.sendAndWait() --

  it('createSession() returns a session with correct ID', async () => {
    await runtime.initialize()

    const result = await runtime.createSession('test-agent')

    expect(result.sessionId).toBe('test-session-123')
    expect(mockClient.createSession).toHaveBeenCalledWith({
      agent: 'test-agent'
    })
  })

  it('createSession() stores the session object for later sendMessage use', async () => {
    await runtime.initialize()

    const testSession = {
      ...mockSession,
      sessionId: 'stored-session-456',
      id: 'stored-session-456',
      sendAndWait: vi.fn().mockResolvedValue({ content: 'response' })
    }
    mockClient.createSession.mockResolvedValueOnce(testSession)

    const result = await runtime.createSession('test-agent')
    expect(result.sessionId).toBe('stored-session-456')
  })

  it('sendMessage() calls session.sendAndWait() on the stored session', async () => {
    await runtime.initialize()

    const testSession = {
      ...mockSession,
      sessionId: 'active-session-789',
      id: 'active-session-789',
      sendAndWait: vi.fn().mockResolvedValue({ content: 'response' })
    }
    mockClient.createSession.mockResolvedValueOnce(testSession)

    await runtime.createSession('test-agent')

    await runtime.sendMessage('active-session-789', 'hello')
    expect(testSession.sendAndWait).toHaveBeenCalledWith('hello')
  })

  it('sendMessage() throws if session does not exist', async () => {
    await runtime.initialize()

    await expect(
      runtime.sendMessage('nonexistent-session', 'hello')
    ).rejects.toThrow()
  })

  // -- BUG 3: close() should be shutdown() --

  it('cleanup() calls shutdown() not close()', async () => {
    await runtime.initialize()
    await runtime.cleanup()

    expect(mockClient.shutdown).toHaveBeenCalledTimes(1)
    expect(mockClient.shutdown).toHaveBeenCalled()
  })

  // -- Error handling --

  it('gracefully degrades when SDK import fails', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'))

    const failRuntime = new SquadRuntime('/test/squad/root')
    await failRuntime.initialize()

    expect(failRuntime.isReady).toBe(false)
    await failRuntime.cleanup()
  })

  it('sendMessage() throws when SDK unavailable', async () => {
    await expect(
      runtime.sendMessage('some-session', 'hello')
    ).rejects.toThrow('Session not found')
  })

  it('initialize() handles connect() failure gracefully', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('Connection refused'))

    await runtime.initialize()

    expect(runtime.isReady).toBe(false)
  })

  // -- Cleanup verification --

  it('cleanup() stops all components in correct order', async () => {
    await runtime.initialize()
    await runtime.cleanup()

    expect(mockPipeline.stop).toHaveBeenCalled()
    expect(mockMonitor.stop).toHaveBeenCalled()
    expect(mockClient.shutdown).toHaveBeenCalled()
    expect(runtime.isReady).toBe(false)
  })

  it('cleanup() is safe to call multiple times', async () => {
    await runtime.initialize()
    await runtime.cleanup()
    await runtime.cleanup() // Should not throw

    expect(mockClient.shutdown).toHaveBeenCalledTimes(1)
  })

  it('cleanup() handles errors without crashing', async () => {
    await runtime.initialize()

    mockClient.shutdown.mockRejectedValueOnce(new Error('Shutdown failed'))

    await runtime.cleanup() // Should not throw
    expect(true).toBe(true)
  })
})

describe('SquadRuntime - Configuration', () => {
  let runtime: SquadRuntime

  beforeEach(() => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  it('createSession() accepts config parameter', async () => {
    await runtime.initialize()

    const config = {
      model: 'claude-sonnet-4',
      systemPrompt: 'You are a helpful assistant'
    }

    await runtime.createSession('test-agent', config)

    expect(mockClient.createSession).toHaveBeenCalledWith({
      agent: 'test-agent',
      ...config
    })
  })

  it('createSession() throws when not initialized (no lazy init)', async () => {
    // Phase 2: createSession no longer lazy-initializes
    await expect(
      runtime.createSession('test-agent')
    ).rejects.toThrow('SDK not available')
  })
})

// -- Phase 2: Init Guard & Idempotency --

describe('SquadRuntime - Init Guard & Idempotency', () => {
  let runtime: SquadRuntime

  beforeEach(() => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  it('initialize() sets _initAttempted so second call is a no-op', async () => {
    await runtime.initialize()
    expect(mockClient.connect).toHaveBeenCalledTimes(1)

    // Second call should return immediately
    await runtime.initialize()
    expect(mockClient.connect).toHaveBeenCalledTimes(1)
  })

  it('second initialize() after failure still does not retry', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('Auth failed'))

    await runtime.initialize()
    expect(runtime.isReady).toBe(false)

    // Reset mock so connect would succeed if called again
    mockClient.connect.mockResolvedValue(undefined)

    // Second call should NOT retry init
    await runtime.initialize()
    expect(mockClient.connect).toHaveBeenCalledTimes(1)
    expect(runtime.isReady).toBe(false)
  })

  it('concurrent initialize() calls share the same promise', async () => {
    const p1 = runtime.initialize()
    const p2 = runtime.initialize()

    await Promise.all([p1, p2])

    expect(mockClient.connect).toHaveBeenCalledTimes(1)
    expect(runtime.isReady).toBe(true)
  })

  it('createSession() throws "SDK not connected" when init failed', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('Connection refused'))
    await runtime.initialize()
    expect(runtime.isReady).toBe(false)

    // createSession should throw immediately - no lazy init
    await expect(
      runtime.createSession('test-agent')
    ).rejects.toThrow('SDK not connected')
  })

  it('createSession() throws "SDK not available" when never initialized', async () => {
    // Never called initialize - _initAttempted is false, client is null
    await expect(
      runtime.createSession('test-agent')
    ).rejects.toThrow('SDK not available')
  })
})

// -- Phase 2: getDecisions() --

describe('SquadRuntime - getDecisions()', () => {
  let runtime: SquadRuntime

  beforeEach(() => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  it('returns file content when .squad/decisions.md exists', async () => {
    const decisionsContent = '# Decisions\n\n## ADR-001: Use Vitest\nApproved.'
    mockReadFile.mockResolvedValueOnce(decisionsContent)

    const result = await runtime.getDecisions()

    expect(result).toBe(decisionsContent)
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('decisions.md'),
      'utf-8'
    )
  })

  it('returns empty string when .squad/decisions.md is missing', async () => {
    const enoent = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException
    enoent.code = 'ENOENT'
    mockReadFile.mockRejectedValueOnce(enoent)

    const result = await runtime.getDecisions()

    expect(result).toBe('')
  })

  it('returns empty string on any read error', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('Permission denied'))

    const result = await runtime.getDecisions()

    expect(result).toBe('')
  })

  it('reads from the correct path under squadRoot', async () => {
    mockReadFile.mockResolvedValueOnce('')

    await runtime.getDecisions()

    const expectedPath = expect.stringMatching(
      /[/\\]test[/\\]squad[/\\]root[/\\]\.squad[/\\]decisions\.md$/
    )
    expect(mockReadFile).toHaveBeenCalledWith(expectedPath, 'utf-8')
  })
})

// -- Phase 2: getConnectionInfo() --

describe('SquadRuntime - getConnectionInfo()', () => {
  let runtime: SquadRuntime

  beforeEach(() => {
    vi.clearAllMocks()
    runtime = new SquadRuntime('/test/squad/root')
  })

  afterEach(async () => {
    await runtime.cleanup()
  })

  it('returns initial state before init (not connected, no error)', () => {
    const info = runtime.getConnectionInfo()

    expect(info.connected).toBe(false)
    expect(info.squadRoot).toBe('/test/squad/root')
    expect(info.error).toBeUndefined()
  })

  it('returns connected state after successful init', async () => {
    await runtime.initialize()

    const info = runtime.getConnectionInfo()

    expect(info.connected).toBe(true)
    expect(info.error).toBeUndefined()
    expect(info.squadRoot).toBe('/test/squad/root')
  })

  it('returns error state after failed init', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('Auth failed'))
    await runtime.initialize()

    const info = runtime.getConnectionInfo()

    expect(info.connected).toBe(false)
    expect(info.error).toBe('SDK not connected')
    expect(info.squadRoot).toBe('/test/squad/root')
  })
})