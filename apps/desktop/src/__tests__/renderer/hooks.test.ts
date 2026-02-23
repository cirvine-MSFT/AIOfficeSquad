/**
 * Unit tests for useNavigation and useChat hook logic.
 *
 * Strategy: test the STATE MACHINE logic directly — no React, no jsdom.
 * We replicate the pure transition functions from each hook and verify
 * every edge case of the navigation and chat state machines.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type {
  NavigationState,
  NavLevel,
  BreadcrumbItem,
  SquadLookup,
  SessionLookup,
} from '../../renderer/hooks/useNavigation'
import type {
  ChatMessage,
  UsageStats,
} from '../../renderer/hooks/useChat'

// ════════════════════════════════════════════════════════════════════
// § Navigation State Machine
// ════════════════════════════════════════════════════════════════════

/** Mirrors the state transitions inside useNavigation */
function createNavStateMachine(squads: SquadLookup[] = [], sessions: SessionLookup[] = []) {
  let state: NavigationState = {
    level: 'building',
    selectedSquadId: null,
    selectedSessionId: null,
    selectedAgentName: null,
  }

  // Auto-select (mirrors the useEffect)
  if (squads.length === 1 && state.level === 'building' && !state.selectedSquadId) {
    state = {
      level: 'floor',
      selectedSquadId: squads[0].id,
      selectedSessionId: null,
      selectedAgentName: null,
    }
  }

  return {
    get state() { return state },

    selectSquad(id: string) {
      state = {
        level: 'floor',
        selectedSquadId: id,
        selectedSessionId: null,
        selectedAgentName: null,
      }
    },

    selectSession(id: string) {
      state = {
        ...state,
        level: 'office',
        selectedSessionId: id,
        selectedAgentName: null,
      }
    },

    selectAgent(name: string | null) {
      if (state.level !== 'office') return
      state = {
        ...state,
        selectedAgentName: state.selectedAgentName === name ? null : name,
      }
    },

    back() {
      switch (state.level) {
        case 'office':
          state = { ...state, level: 'floor', selectedSessionId: null, selectedAgentName: null }
          break
        case 'floor':
          state = { level: 'building', selectedSquadId: null, selectedSessionId: null, selectedAgentName: null }
          break
        case 'building':
        default:
          break // no-op
      }
    },

    /** Breadcrumb generation — mirrors useMemo in the hook */
    breadcrumbs(): BreadcrumbItem[] {
      const items: BreadcrumbItem[] = [{ label: 'Hub', level: 'hub' }]
      if (state.selectedSquadId) {
        const squad = squads.find((s) => s.id === state.selectedSquadId)
        items.push({
          label: squad?.name ?? state.selectedSquadId,
          level: 'floor',
          id: state.selectedSquadId,
        })
      }
      if (state.selectedSessionId) {
        const session = sessions.find((s) => s.id === state.selectedSessionId)
        items.push({
          label: session?.name ?? state.selectedSessionId,
          level: 'office',
          id: state.selectedSessionId,
        })
      }
      return items
    },
  }
}

describe('useNavigation state machine', () => {
  it('initial state is building level with all nulls', () => {
    const nav = createNavStateMachine()
    expect(nav.state).toEqual({
      level: 'building',
      selectedSquadId: null,
      selectedSessionId: null,
      selectedAgentName: null,
    })
  })

  it('selectSquad transitions to floor level', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')
    expect(nav.state.level).toBe('floor')
    expect(nav.state.selectedSquadId).toBe('squad-1')
    expect(nav.state.selectedSessionId).toBeNull()
    expect(nav.state.selectedAgentName).toBeNull()
  })

  it('selectSession transitions to office level and preserves squadId', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')
    nav.selectSession('session-42')
    expect(nav.state.level).toBe('office')
    expect(nav.state.selectedSquadId).toBe('squad-1')
    expect(nav.state.selectedSessionId).toBe('session-42')
    expect(nav.state.selectedAgentName).toBeNull()
  })

  it('selectAgent toggles agent selection at office level', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')
    nav.selectSession('session-42')

    nav.selectAgent('dutch')
    expect(nav.state.selectedAgentName).toBe('dutch')

    // Same name toggles off
    nav.selectAgent('dutch')
    expect(nav.state.selectedAgentName).toBeNull()
  })

  it('selectAgent switches to a different agent', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')
    nav.selectSession('session-42')

    nav.selectAgent('dutch')
    expect(nav.state.selectedAgentName).toBe('dutch')

    nav.selectAgent('blain')
    expect(nav.state.selectedAgentName).toBe('blain')
  })

  it('selectAgent with null deselects at office level', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')
    nav.selectSession('session-42')
    nav.selectAgent('dutch')
    nav.selectAgent(null)
    expect(nav.state.selectedAgentName).toBeNull()
  })

  it('selectAgent is a no-op at building level', () => {
    const nav = createNavStateMachine()
    const before = { ...nav.state }
    nav.selectAgent('dutch')
    expect(nav.state).toEqual(before)
  })

  it('selectAgent is a no-op at floor level', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')
    const before = { ...nav.state }
    nav.selectAgent('dutch')
    expect(nav.state).toEqual(before)
  })

  it('back from office goes to floor (clears session + agent)', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')
    nav.selectSession('session-42')
    nav.selectAgent('dutch')

    nav.back()
    expect(nav.state.level).toBe('floor')
    expect(nav.state.selectedSquadId).toBe('squad-1')
    expect(nav.state.selectedSessionId).toBeNull()
    expect(nav.state.selectedAgentName).toBeNull()
  })

  it('back from floor goes to building (clears everything)', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')

    nav.back()
    expect(nav.state).toEqual({
      level: 'building',
      selectedSquadId: null,
      selectedSessionId: null,
      selectedAgentName: null,
    })
  })

  it('back from building is a no-op', () => {
    const nav = createNavStateMachine()
    const before = { ...nav.state }
    nav.back()
    expect(nav.state).toEqual(before)
  })

  it('switching squads clears session and agent', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('squad-1')
    nav.selectSession('session-42')
    nav.selectAgent('dutch')

    nav.selectSquad('squad-2')
    expect(nav.state.selectedSquadId).toBe('squad-2')
    expect(nav.state.selectedSessionId).toBeNull()
    expect(nav.state.selectedAgentName).toBeNull()
  })

  // ── Auto-select ──

  it('auto-selects squad when exactly 1 squad provided', () => {
    const nav = createNavStateMachine([{ id: 'only-squad', name: 'My Squad' }])
    expect(nav.state.level).toBe('floor')
    expect(nav.state.selectedSquadId).toBe('only-squad')
  })

  it('does NOT auto-select when 0 squads provided', () => {
    const nav = createNavStateMachine([])
    expect(nav.state.level).toBe('building')
  })

  it('does NOT auto-select when 2+ squads provided', () => {
    const nav = createNavStateMachine([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ])
    expect(nav.state.level).toBe('building')
    expect(nav.state.selectedSquadId).toBeNull()
  })

  // ── Breadcrumbs ──

  it('breadcrumbs at building level = 1 item (Hub)', () => {
    const nav = createNavStateMachine()
    expect(nav.breadcrumbs()).toEqual([{ label: 'Hub', level: 'hub' }])
  })

  it('breadcrumbs at floor level = 2 items (Hub + squad)', () => {
    const squads = [{ id: 'squad-1', name: 'Alpha' }]
    const nav = createNavStateMachine(squads)
    nav.selectSquad('squad-1')
    const bc = nav.breadcrumbs()
    expect(bc).toHaveLength(2)
    expect(bc[0].label).toBe('Hub')
    expect(bc[1].label).toBe('Alpha')
    expect(bc[1].id).toBe('squad-1')
  })

  it('breadcrumbs at office level = 3 items (Hub + squad + session)', () => {
    const squads = [{ id: 'squad-1', name: 'Alpha' }]
    const sessions = [{ id: 'sess-1', name: 'Code Review' }]
    const nav = createNavStateMachine(squads, sessions)
    nav.selectSquad('squad-1')
    nav.selectSession('sess-1')
    const bc = nav.breadcrumbs()
    expect(bc).toHaveLength(3)
    expect(bc[2].label).toBe('Code Review')
    expect(bc[2].level).toBe('office')
  })

  it('breadcrumbs fall back to ID when lookup name is missing', () => {
    const nav = createNavStateMachine([], [])
    nav.selectSquad('unknown-squad')
    const bc = nav.breadcrumbs()
    expect(bc[1].label).toBe('unknown-squad')
  })

  // ── Full round-trip ──

  it('full drill-down and back-up round trip returns to building', () => {
    const nav = createNavStateMachine()
    nav.selectSquad('sq')
    nav.selectSession('ses')
    nav.selectAgent('ag')
    expect(nav.state.level).toBe('office')

    nav.back() // → floor
    nav.back() // → building
    expect(nav.state).toEqual({
      level: 'building',
      selectedSquadId: null,
      selectedSessionId: null,
      selectedAgentName: null,
    })
  })
})

// ════════════════════════════════════════════════════════════════════
// § Chat State Machine
// ════════════════════════════════════════════════════════════════════

/** Mirrors the stateful logic inside useChat without React hooks */
function createChatStateMachine(selectedAgent: string | null = null) {
  const sessions = new Map<string, string>()       // agentName → sessionId
  const messagesMap = new Map<string, ChatMessage[]>() // agentName → msgs
  const streamingMap = new Map<string, string>()       // sessionId → text
  let sending = false
  let creatingSession = false
  let totalTokens = 0
  let estimatedCost = 0
  let model: string | null = null
  let error: string | null = null
  let _selectedAgent = selectedAgent
  let _msgIdCounter = 0

  function nextMsgId(): string {
    return `msg-${Date.now()}-${++_msgIdCounter}`
  }

  return {
    get selectedAgent() { return _selectedAgent },
    set selectedAgent(v: string | null) { _selectedAgent = v },

    get sessionId(): string | null {
      return _selectedAgent ? sessions.get(_selectedAgent) ?? null : null
    },
    get messages(): ChatMessage[] {
      return _selectedAgent ? messagesMap.get(_selectedAgent) ?? [] : []
    },
    get streamingText(): string {
      const sid = _selectedAgent ? sessions.get(_selectedAgent) ?? null : null
      return sid ? streamingMap.get(sid) ?? '' : ''
    },
    get sending() { return sending || creatingSession },
    get usage(): UsageStats { return { totalTokens, estimatedCost, model } },
    get error() { return error },

    nextMsgId,

    async createSession(agentName: string, mockResult?: { ok: boolean; data?: { sessionId: string }; error?: string }) {
      if (!agentName) {
        error = 'Select an agent before starting a session'
        return
      }
      creatingSession = true
      error = null
      try {
        const res = mockResult ?? { ok: false, error: 'No mock provided' }
        if (res.ok && res.data) {
          sessions.set(agentName, res.data.sessionId)
        } else {
          error = res.error ?? 'Failed to create session'
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to create session'
      } finally {
        creatingSession = false
      }
    },

    async sendMessage(text: string, mockResult?: { ok: boolean; error?: string }) {
      if (!_selectedAgent || !this.sessionId) return
      sending = true
      error = null

      // Add user message immediately
      const agentMsgs = [...(messagesMap.get(_selectedAgent!) ?? [])]
      agentMsgs.push({
        id: nextMsgId(),
        role: 'user',
        text,
        timestamp: Date.now(),
      })
      messagesMap.set(_selectedAgent!, agentMsgs)

      try {
        const res = mockResult ?? { ok: true }
        if (!res.ok) {
          error = res.error ?? 'Failed to send message'
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to send message'
      } finally {
        sending = false
      }
    },

    /** Simulate a stream delta arriving */
    receiveStreamDelta(sessionId: string, delta: string) {
      streamingMap.set(sessionId, (streamingMap.get(sessionId) ?? '') + delta)
    },

    /** Simulate usage event completing a stream */
    receiveUsageEvent(event: { sessionId: string; inputTokens: number; outputTokens: number; model: string }) {
      totalTokens += event.inputTokens + event.outputTokens
      estimatedCost += event.inputTokens * 0.000003 + event.outputTokens * 0.000015
      if (event.model) model = event.model

      // Commit streamed text as assistant message
      const agentEntry = Array.from(sessions.entries()).find(([, sid]) => sid === event.sessionId)
      if (agentEntry) {
        const [agName] = agentEntry
        const text = streamingMap.get(event.sessionId)
        if (text) {
          const agentMsgs = [...(messagesMap.get(agName) ?? [])]
          agentMsgs.push({
            id: nextMsgId(),
            role: 'assistant',
            text,
            agentName: agName,
            timestamp: Date.now(),
          })
          messagesMap.set(agName, agentMsgs)
        }
        streamingMap.delete(event.sessionId)
      }
    },

    clearError() { error = null },
  }
}

describe('useChat state machine', () => {
  // ── Message ID generation ──

  it('nextMsgId generates unique IDs', () => {
    const chat = createChatStateMachine()
    const id1 = chat.nextMsgId()
    const id2 = chat.nextMsgId()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^msg-\d+-\d+$/)
  })

  // ── Session creation ──

  it('createSession stores agent→session mapping', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-abc' } })
    expect(chat.sessionId).toBe('sess-abc')
    expect(chat.error).toBeNull()
  })

  it('createSession with empty agent sets error', async () => {
    const chat = createChatStateMachine()
    await chat.createSession('', undefined)
    expect(chat.error).toBe('Select an agent before starting a session')
  })

  it('createSession with failed result sets error', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: false, error: 'SDK down' })
    expect(chat.error).toBe('SDK down')
    expect(chat.sessionId).toBeNull()
  })

  it('createSession with ok:false and no error message uses default', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: false })
    expect(chat.error).toBe('Failed to create session')
  })

  // ── Message sending ──

  it('sendMessage adds user message to correct agent', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-1' } })
    await chat.sendMessage('Hello', { ok: true })

    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].role).toBe('user')
    expect(chat.messages[0].text).toBe('Hello')
  })

  it('sendMessage is a no-op without selected agent', async () => {
    const chat = createChatStateMachine(null)
    await chat.sendMessage('Hello')
    expect(chat.messages).toHaveLength(0)
  })

  it('sendMessage is a no-op without session', async () => {
    const chat = createChatStateMachine('dutch')
    // No createSession call
    await chat.sendMessage('Hello')
    expect(chat.messages).toHaveLength(0)
  })

  it('sendMessage with failed result sets error', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-1' } })
    await chat.sendMessage('Hello', { ok: false, error: 'Rate limited' })

    expect(chat.messages).toHaveLength(1) // user message still added
    expect(chat.error).toBe('Rate limited')
  })

  it('sendMessage with ok:false and no error uses default', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-1' } })
    await chat.sendMessage('Hi', { ok: false })
    expect(chat.error).toBe('Failed to send message')
  })

  // ── Streaming ──

  it('stream deltas accumulate per session', () => {
    const chat = createChatStateMachine('dutch')
    chat.receiveStreamDelta('sess-1', 'Hello ')
    chat.receiveStreamDelta('sess-1', 'world')
    // Direct check — need a session mapping for streamingText getter
    expect(chat.streamingText).toBe('') // no session mapped yet
  })

  it('streamingText returns accumulated text for active session', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-1' } })
    chat.receiveStreamDelta('sess-1', 'Thinking...')
    expect(chat.streamingText).toBe('Thinking...')
  })

  // ── Usage event completes stream ──

  it('usage event commits streamed text as assistant message', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-1' } })

    chat.receiveStreamDelta('sess-1', 'The answer is 42')
    chat.receiveUsageEvent({
      sessionId: 'sess-1',
      inputTokens: 100,
      outputTokens: 50,
      model: 'claude-sonnet-4-20250514',
    })

    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].role).toBe('assistant')
    expect(chat.messages[0].text).toBe('The answer is 42')
    expect(chat.streamingText).toBe('') // cleared after commit
  })

  // ── Usage tracking ──

  it('usage tracking accumulates tokens and cost', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-1' } })

    chat.receiveUsageEvent({ sessionId: 'sess-1', inputTokens: 1000, outputTokens: 500, model: 'claude-sonnet-4-20250514' })
    chat.receiveUsageEvent({ sessionId: 'sess-1', inputTokens: 2000, outputTokens: 1000, model: 'claude-sonnet-4-20250514' })

    expect(chat.usage.totalTokens).toBe(4500) // 1000+500+2000+1000
    expect(chat.usage.model).toBe('claude-sonnet-4-20250514')
    expect(chat.usage.estimatedCost).toBeGreaterThan(0)
  })

  it('usage cost calculation matches expected formula', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-1' } })

    chat.receiveUsageEvent({ sessionId: 'sess-1', inputTokens: 1_000_000, outputTokens: 1_000_000, model: 'test' })

    // $3/MTok input + $15/MTok output = $18 total
    expect(chat.usage.estimatedCost).toBeCloseTo(18, 2)
  })

  // ── Error handling ──

  it('clearError resets error to null', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: false, error: 'Boom' })
    expect(chat.error).toBe('Boom')

    chat.clearError()
    expect(chat.error).toBeNull()
  })

  // ── Multi-agent isolation ──

  it('messages are isolated per agent', async () => {
    const chat = createChatStateMachine('dutch')
    await chat.createSession('dutch', { ok: true, data: { sessionId: 'sess-d' } })
    await chat.sendMessage('Hello Dutch', { ok: true })

    chat.selectedAgent = 'blain'
    await chat.createSession('blain', { ok: true, data: { sessionId: 'sess-b' } })
    await chat.sendMessage('Hello Blain', { ok: true })

    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].text).toBe('Hello Blain')

    chat.selectedAgent = 'dutch'
    expect(chat.messages).toHaveLength(1)
    expect(chat.messages[0].text).toBe('Hello Dutch')
  })

  // ── Initial / computed values ──

  it('returns empty messages when no agent is selected', () => {
    const chat = createChatStateMachine(null)
    expect(chat.messages).toEqual([])
    expect(chat.sessionId).toBeNull()
    expect(chat.streamingText).toBe('')
  })

  it('initial usage is zero', () => {
    const chat = createChatStateMachine()
    expect(chat.usage.totalTokens).toBe(0)
    expect(chat.usage.estimatedCost).toBe(0)
    expect(chat.usage.model).toBeNull()
  })
})
