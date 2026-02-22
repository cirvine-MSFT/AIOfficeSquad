import { useState, useCallback, useMemo, useEffect } from 'react'

// ── Types ──

/** Navigation hierarchy levels */
export type NavLevel = 'building' | 'floor' | 'office'

/** Breadcrumb trail item for the Header */
export interface BreadcrumbItem {
  label: string
  level: 'hub' | 'floor' | 'office'
  id?: string
}

/** Full navigation state snapshot */
export interface NavigationState {
  level: NavLevel
  selectedSquadId: string | null
  selectedSessionId: string | null
  selectedAgentName: string | null
}

/** Return type for the useNavigation hook */
export interface UseNavigationReturn {
  state: NavigationState
  selectSquad: (id: string) => void
  selectSession: (id: string) => void
  selectAgent: (name: string | null) => void
  back: () => void
  breadcrumbs: BreadcrumbItem[]
}

/** Squad lookup entry for breadcrumb label resolution */
export interface SquadLookup {
  id: string
  name: string
}

/** Session lookup entry for breadcrumb label resolution */
export interface SessionLookup {
  id: string
  name: string
}

// ── Hook ──

/**
 * 3-level navigation state machine: building → floor → office.
 *
 * Manages drill-down navigation with automatic breadcrumb generation.
 * Single-squad auto-select: if exactly one squad is provided, the hook
 * auto-navigates to floor level on mount.
 *
 * @param squads - Available squads (for auto-select and breadcrumb labels)
 * @param sessions - Available sessions (for breadcrumb labels)
 */
export function useNavigation(
  squads: SquadLookup[] = [],
  sessions: SessionLookup[] = []
): UseNavigationReturn {
  const [state, setState] = useState<NavigationState>({
    level: 'building',
    selectedSquadId: null,
    selectedSessionId: null,
    selectedAgentName: null,
  })

  // ── Single-squad auto-select ──
  useEffect(() => {
    if (squads.length === 1 && state.level === 'building' && !state.selectedSquadId) {
      setState({
        level: 'floor',
        selectedSquadId: squads[0].id,
        selectedSessionId: null,
        selectedAgentName: null,
      })
    }
  }, [squads, state.level, state.selectedSquadId])

  // ── State transitions ──

  const selectSquad = useCallback((id: string) => {
    setState({
      level: 'floor',
      selectedSquadId: id,
      selectedSessionId: null,
      selectedAgentName: null,
    })
  }, [])

  const selectSession = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      level: 'office',
      selectedSessionId: id,
      selectedAgentName: null,
    }))
  }, [])

  const selectAgent = useCallback((name: string | null) => {
    setState((prev) => {
      if (prev.level !== 'office') return prev
      return {
        ...prev,
        selectedAgentName: prev.selectedAgentName === name ? null : name,
      }
    })
  }, [])

  const back = useCallback(() => {
    setState((prev) => {
      switch (prev.level) {
        case 'office':
          return {
            ...prev,
            level: 'floor',
            selectedSessionId: null,
            selectedAgentName: null,
          }
        case 'floor':
          return {
            level: 'building',
            selectedSquadId: null,
            selectedSessionId: null,
            selectedAgentName: null,
          }
        case 'building':
        default:
          return prev
      }
    })
  }, [])

  // ── Breadcrumb generation ──

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
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
  }, [state.selectedSquadId, state.selectedSessionId, squads, sessions])

  return { state, selectSquad, selectSession, selectAgent, back, breadcrumbs }
}
