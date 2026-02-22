/**
 * Shared types for floor-level components.
 * Mirrors Dutch's architecture doc §C.5 interfaces.
 */

/** Summary of a session displayed as a room card on the floor */
export interface SessionSummary {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  task: string
  memberIds: string[]
  workingCount: number
  idleCount: number
}

/** Full squad detail for the floor view */
export interface SquadDetail {
  id: string
  name: string
  floor: number
  members: import('../../types').SquadMember[]
  sessions: SessionSummary[]
}
