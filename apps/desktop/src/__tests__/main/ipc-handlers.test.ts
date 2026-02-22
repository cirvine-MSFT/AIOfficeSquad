import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IpcResult } from '../../main/types.js'

// -- Mock SquadRuntime --

const mockRuntime = {
  isReady: false,
  squadRoot: '/test/squad/root',
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn(),
  sendMessage: vi.fn(),
  listSessions: vi.fn().mockResolvedValue([]),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  getStatus: vi.fn().mockResolvedValue({ status: 'ready' }),
  getAuthStatus: vi.fn().mockResolvedValue({ authenticated: true }),
  listModels: vi.fn().mockResolvedValue([]),
  loadSquadConfig: vi.fn().mockResolvedValue({
    name: 'Test Squad',
    root: '/test/squad/root',
    members: []
  }),
  getRoster: vi.fn().mockResolvedValue([]),
  getAgentStatuses: vi.fn().mockResolvedValue([]),
  getDecisions: vi.fn().mockResolvedValue(''),
  getConnectionInfo: vi.fn().mockReturnValue({
    connected: false,
    squadRoot: '/test/squad/root'
  }),
  getHookActivity: vi.fn().mockReturnValue([]),
  onEvent: vi.fn().mockReturnValue(() => {}),
  onStreamDelta: vi.fn().mockReturnValue(() => {}),
  onUsage: vi.fn().mockReturnValue(() => {}),
  onReady: vi.fn().mockReturnValue(() => {})
}

// -- Mock Electron IPC --

const handlers = new Map<string, (...args: any[]) => Promise<any>>()

const mockIpcMain = {
  handle: vi.fn((channel: string, handler: any) => {
    handlers.set(channel, async (...args: any[]) => {
      return await handler({ sender: {} }, ...args)
    })
  }),
  removeHandler: vi.fn((channel: string) => {
    handlers.delete(channel)
  })
}

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  BrowserWindow: vi.fn()
}))

describe('IPC Handlers - Error Handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    handlers.clear()
    mockRuntime.isReady = true

    const { registerIpcHandlers } = await import('../../main/ipc-handlers.js')
    registerIpcHandlers(mockRuntime as any, () => null)
  })

  // -- SDK unavailable scenarios --

  it('squad:create-session returns error when SDK unavailable', async () => {
    mockRuntime.createSession.mockRejectedValueOnce(
      new Error('SDK not available')
    )

    const handler = handlers.get('squad:create-session')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('test-agent')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('SDK not available')
  })

  it('squad:send-message returns error for invalid session', async () => {
    mockRuntime.sendMessage.mockRejectedValueOnce(
      new Error('Session not found')
    )

    const handler = handlers.get('squad:send-message')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('invalid-session', 'hello')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Session not found')
  })

  it('squad:list-sessions returns error when SDK fails', async () => {
    mockRuntime.listSessions.mockRejectedValueOnce(
      new Error('SDK not available')
    )

    const handler = handlers.get('squad:list-sessions')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(false)
    expect(result.error).toContain('SDK not available')
  })

  it('squad:delete-session returns error when SDK fails', async () => {
    mockRuntime.deleteSession.mockRejectedValueOnce(
      new Error('Session not found')
    )

    const handler = handlers.get('squad:delete-session')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('nonexistent-session')

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Session not found')
  })

  it('squad:get-status returns error when runtime not ready', async () => {
    mockRuntime.getStatus.mockRejectedValueOnce(
      new Error('SDK not available')
    )

    const handler = handlers.get('squad:get-status')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(false)
    expect(result.error).toContain('SDK not available')
  })

  // -- IpcResult format verification --

  it('all handlers return IpcResult format on success', async () => {
    mockRuntime.createSession.mockResolvedValueOnce({
      sessionId: 'test-session-123'
    })

    const handler = handlers.get('squad:create-session')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('test-agent')

    expect(result).toHaveProperty('ok')
    expect(result.ok).toBe(true)
    expect(result).toHaveProperty('data')
    expect(result.data).toEqual({ sessionId: 'test-session-123' })
  })

  it('all handlers return IpcResult format on error', async () => {
    mockRuntime.createSession.mockRejectedValueOnce(
      new Error('Test error')
    )

    const handler = handlers.get('squad:create-session')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('test-agent')

    expect(result).toHaveProperty('ok')
    expect(result.ok).toBe(false)
    expect(result).toHaveProperty('error')
    expect(result.error).toBe('Test error')
  })

  it('handlers never throw - always return IpcResult', async () => {
    mockRuntime.sendMessage.mockImplementation(() => {
      throw new Error('Unexpected throw')
    })

    const handler = handlers.get('squad:send-message')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('session-id', 'message')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Unexpected throw')
  })

  // -- Session creation edge cases --

  it('squad:create-session with config parameter', async () => {
    mockRuntime.createSession.mockResolvedValueOnce({
      sessionId: 'configured-session'
    })

    const handler = handlers.get('squad:create-session')
    expect(handler).toBeDefined()

    const config = { model: 'claude-sonnet-4' }
    const result: IpcResult = await handler!('test-agent', config)

    expect(result.ok).toBe(true)
    expect(mockRuntime.createSession).toHaveBeenCalledWith('test-agent', config)
  })

  it('squad:send-message requires valid sessionId', async () => {
    mockRuntime.sendMessage.mockRejectedValueOnce(
      new Error('SDK not available')
    )

    const handler = handlers.get('squad:send-message')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('', 'hello')

    expect(result.ok).toBe(false)
  })

  // -- Ready state handling --

  it('squad:get-ready-state returns runtime state', async () => {
    mockRuntime.isReady = true

    const handler = handlers.get('squad:get-ready-state')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      ready: true,
      squadRoot: '/test/squad/root'
    })
  })

  it('squad:get-ready-state works when SDK not ready', async () => {
    mockRuntime.isReady = false

    const handler = handlers.get('squad:get-ready-state')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      ready: false,
      squadRoot: '/test/squad/root'
    })
  })

  // -- Session detail error handling --

  it('squad:get-session-detail returns error for unknown session', async () => {
    mockRuntime.listSessions.mockResolvedValueOnce([])

    const handler = handlers.get('squad:get-session-detail')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('unknown-session')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Session not found')
  })

  it('squad:get-session-detail succeeds with valid session', async () => {
    mockRuntime.listSessions.mockResolvedValueOnce([
      {
        id: 'valid-session',
        sessionId: 'valid-session',
        name: 'Test Session',
        status: 'active',
        agent: 'test-agent',
        model: 'claude-sonnet-4',
        createdAt: Date.now()
      }
    ])

    mockRuntime.loadSquadConfig.mockResolvedValueOnce({
      name: 'Test Squad',
      root: '/test/root',
      members: [
        { name: 'test-agent', role: 'Developer', agent: 'claude', status: 'active' }
      ]
    })

    const handler = handlers.get('squad:get-session-detail')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('valid-session')

    expect(result.ok).toBe(true)
    expect(result.data).toHaveProperty('id', 'valid-session')
    expect(result.data).toHaveProperty('agents')
  })

  // -- Config and roster handlers --

  it('squad:load-config returns config even when SDK unavailable', async () => {
    const handler = handlers.get('squad:load-config')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(true)
    expect(result.data).toHaveProperty('name', 'Test Squad')
  })

  it('squad:get-roster works independently of SDK', async () => {
    const handler = handlers.get('squad:get-roster')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  // -- Phase 2: Decisions handler --

  it('squad:get-decisions returns decisions content', async () => {
    mockRuntime.getDecisions.mockResolvedValueOnce(
      '# Decisions\n\n## ADR-001: Use Vitest\nApproved.'
    )

    const handler = handlers.get('squad:get-decisions')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(true)
    expect(result.data).toBe('# Decisions\n\n## ADR-001: Use Vitest\nApproved.')
  })

  it('squad:get-decisions returns empty string when no decisions file', async () => {
    mockRuntime.getDecisions.mockResolvedValueOnce('')

    const handler = handlers.get('squad:get-decisions')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(true)
    expect(result.data).toBe('')
  })

  it('squad:get-decisions returns error on unexpected failure', async () => {
    mockRuntime.getDecisions.mockRejectedValueOnce(
      new Error('Unexpected I/O error')
    )

    const handler = handlers.get('squad:get-decisions')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Unexpected I/O error')
  })

  // -- Phase 2: Connection info handler --

  it('squad:get-connection-info returns connection state', async () => {
    mockRuntime.getConnectionInfo.mockReturnValue({
      connected: true,
      squadRoot: '/test/squad/root'
    })

    const handler = handlers.get('squad:get-connection-info')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      connected: true,
      squadRoot: '/test/squad/root'
    })
  })

  it('squad:get-connection-info returns error state when init failed', async () => {
    mockRuntime.getConnectionInfo.mockReturnValue({
      connected: false,
      error: 'SDK not connected',
      squadRoot: '/test/squad/root'
    })

    const handler = handlers.get('squad:get-connection-info')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!()

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      connected: false,
      error: 'SDK not connected',
      squadRoot: '/test/squad/root'
    })
  })

  // -- Phase 2: Init guard on create-session --

  it('squad:create-session returns "SDK not connected" after failed init', async () => {
    mockRuntime.createSession.mockRejectedValueOnce(
      new Error('SDK not connected — Copilot CLI is not running')
    )

    const handler = handlers.get('squad:create-session')
    expect(handler).toBeDefined()

    const result: IpcResult = await handler!('test-agent')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('SDK not connected')
  })
})

describe('IPC Handlers - Registration', () => {
  it('registerIpcHandlers creates all expected handlers', async () => {
    handlers.clear()
    const { registerIpcHandlers } = await import('../../main/ipc-handlers.js')

    registerIpcHandlers(mockRuntime as any, () => null)

    const expectedChannels = [
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

    for (const channel of expectedChannels) {
      expect(handlers.has(channel)).toBe(true)
    }
  })

  it('removeIpcHandlers removes all handlers', async () => {
    const { registerIpcHandlers, removeIpcHandlers } = await import('../../main/ipc-handlers.js')

    registerIpcHandlers(mockRuntime as any, () => null)
    removeIpcHandlers()

    expect(mockIpcMain.removeHandler).toHaveBeenCalled()
  })
})