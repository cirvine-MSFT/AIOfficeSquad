import { describe, it, expect } from 'vitest'
import type {
  HubStats,
  SquadInfo,
  SquadStatus,
  SessionMetadata,
  SessionDetail,
  AgentInSession,
  IpcResult
} from '../../main/types.js'

describe('Phase 1a type definitions', () => {
  it('HubStats has correct shape', () => {
    const stats: HubStats = {
      floorCount: 3,
      totalMembers: 12,
      activeSessions: 2,
      totalSessions: 5
    }
    expect(stats.floorCount).toBe(3)
    expect(stats.totalSessions).toBe(5)
  })

  it('SquadInfo has correct shape', () => {
    const info: SquadInfo = {
      id: 'squad-1',
      name: 'Alpha',
      floor: 1,
      root: '/repo',
      memberCount: 4,
      activeSessionCount: 1,
      status: 'connected'
    }
    expect(info.status).toBe('connected')
  })

  it('SquadStatus has correct shape', () => {
    const status: SquadStatus = {
      squadId: 'squad-1',
      connected: true,
      activeSessionCount: 2
    }
    expect(status.connected).toBe(true)
  })

  it('SessionMetadata has correct shape', () => {
    const meta: SessionMetadata = {
      id: 'sess-1',
      name: 'Test session',
      status: 'active',
      agentNames: ['Mac', 'Poncho'],
      createdAt: Date.now()
    }
    expect(meta.agentNames).toHaveLength(2)
  })

  it('SessionDetail has correct shape', () => {
    const agent: AgentInSession = {
      name: 'Mac',
      role: 'Backend Dev',
      status: 'active',
      model: 'claude-sonnet-4',
      activity: 'writing code'
    }
    const detail: SessionDetail = {
      id: 'sess-1',
      name: 'Feature work',
      status: 'active',
      squadId: 'squad-1',
      squadName: 'Alpha',
      agents: [agent],
      createdAt: Date.now()
    }
    expect(detail.agents[0].name).toBe('Mac')
    expect(detail.squadName).toBe('Alpha')
  })

  it('IpcResult wraps success', () => {
    const result: IpcResult<SessionDetail> = {
      ok: true,
      data: {
        id: 's1',
        name: 'test',
        status: 'idle',
        squadId: 'sq1',
        squadName: 'Alpha',
        agents: [],
        createdAt: 0
      }
    }
    expect(result.ok).toBe(true)
  })

  it('IpcResult wraps error', () => {
    const result: IpcResult<SessionDetail> = {
      ok: false,
      error: 'Session not found'
    }
    expect(result.ok).toBe(false)
  })
})
