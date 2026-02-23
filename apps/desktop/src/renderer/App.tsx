import { useState, useEffect, useCallback } from 'react'
import type { SquadMember, AgentStatus, SquadConfig, SessionDetail } from './types'
import type { SessionSummary } from './components/floor/types'
import { useNavigation, type SquadLookup, type BreadcrumbItem } from './hooks/useNavigation'
import { useChat } from './hooks/useChat'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import BuildingView from './components/BuildingView'
import { FloorView } from './components/floor'
import { OfficeView } from './components/office'
import ChatPanel from './components/ChatPanel'
import StatusBar from './components/StatusBar'
import DecisionsTimeline from './components/DecisionsTimeline'
import CostDashboard from './components/CostDashboard'
import HooksPanel from './components/HooksPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import AgentDetailPanel from './components/AgentDetailPanel'
import type { AgentInfo } from './components/AgentCard'

function mergeAgentInfo(members: SquadMember[], statuses: AgentStatus[]): AgentInfo[] {
  const statusMap = new Map(
    statuses
      .filter((s) => s && typeof s.name === 'string')
      .map((s) => [s.name.toLowerCase(), s])
  )
  return members.map((m) => {
    const s = statusMap.get(m.name.toLowerCase())
    return {
      name: m.name,
      role: m.role,
      status: (s?.status === 'busy' ? 'working' : s?.status ?? 'idle') as AgentInfo['status'],
      lastActivity: s?.lastActivity,
      sessionId: s?.sessionId,
    }
  })
}

/** Map raw SDK session data to SessionSummary for FloorView */
function mapSessions(data: any[]): SessionSummary[] {
  return data.map((s: any) => ({
    id: s.sessionId ?? s.id ?? '',
    name: s.summary ?? `Session ${(s.sessionId ?? '').slice(0, 8)}`,
    status: 'active' as const,
    task: s.summary ?? '',
    memberIds: [],
    workingCount: 0,
    idleCount: 0,
  }))
}

export default function App() {
  // ── Squad data (future: useSquadData hook) ──
  const [config, setConfig] = useState<SquadConfig | null>(null)
  const [roster, setRoster] = useState<SquadMember[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [sdkConnected, setSdkConnected] = useState(false)
  const [sessions, setSessions] = useState<SessionSummary[]>([])

  // ── Derived data for hooks ──
  const squads: SquadLookup[] = config ? [{ id: config.name, name: config.name }] : []
  const agents = mergeAgentInfo(roster, agentStatuses)

  // ── Navigation (3-level state machine) ──
  const navigation = useNavigation(squads, [])

  // ── Agent selection (local state for floor-level compat; nav hook handles office level) ──
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'none' | 'decisions' | 'cost' | 'hooks'>('none')
  const [showChat, setShowChat] = useState(false)
  const effectiveAgent =
    navigation.state.level === 'office'
      ? navigation.state.selectedAgentName
      : selectedAgent

  // ── Chat (scoped to effective agent) ──
  const chat = useChat(effectiveAgent)
  const selectedAgentInfo = agents.find((a) => a.name === effectiveAgent)

  // Clear local agent selection on level change
  useEffect(() => {
    setSelectedAgent(null)
  }, [navigation.state.level])

  // ── Agent selection handler ──
  const handleSelectAgent = useCallback(
    (name: string) => {
      if (navigation.state.level === 'office') {
        navigation.selectAgent(name)
      } else {
        setSelectedAgent((prev) => {
          const next = prev === name ? null : name
          if (next !== prev) setShowChat(false)
          return next
        })
      }
    },
    [navigation]
  )

  // ── Initial data load ──
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [configRes, rosterRes, statusRes] = await Promise.all([
          window.squadAPI.loadConfig(),
          window.squadAPI.getRoster(),
          window.squadAPI.getAgentStatuses(),
        ])

        const configResult = configRes as { ok: boolean; data?: SquadConfig; error?: string }
        const rosterResult = rosterRes as { ok: boolean; data?: SquadMember[]; error?: string }
        const statusResult = statusRes as { ok: boolean; data?: AgentStatus[]; error?: string }

        if (configResult.ok && configResult.data) setConfig(configResult.data)
        if (rosterResult.ok && rosterResult.data) setRoster(rosterResult.data)
        if (statusResult.ok && statusResult.data) setAgentStatuses(statusResult.data)

        // Check SDK connection
        const connRes = await window.squadAPI.getConnectionInfo().catch(() => ({ ok: false }))
        const connResult = connRes as { ok: boolean; data?: { connected: boolean } }
        if (connResult.ok && connResult.data) setSdkConnected(connResult.data.connected)

        // Load live sessions
        const sessRes = await window.squadAPI.listSessions().catch(() => ({ ok: false }))
        const sessResult = sessRes as { ok: boolean; data?: any[] }
        if (sessResult.ok && Array.isArray(sessResult.data)) {
          setSessions(mapSessions(sessResult.data))
        }
      } catch (_err) {
        // Errors surface via chat.error when relevant
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // ── Event subscription: refresh agent statuses ──
  useEffect(() => {
    const unsubEvent = window.squadAPI.onEvent(() => {
      window.squadAPI.getAgentStatuses().then((res) => {
        const result = res as { ok: boolean; data?: AgentStatus[] }
        if (result.ok && result.data) setAgentStatuses(result.data)
      }).catch(() => { /* swallow — status refresh is best-effort */ })
    })
    return () => { unsubEvent() }
  }, [])

  // ── Connection state push events ──
  useEffect(() => {
    if (!window.squadAPI.onConnectionState) return  // guard until preload is updated
    const unsub = window.squadAPI.onConnectionState((state: { connected: boolean }) => {
      setSdkConnected(state.connected)
      // Refresh sessions when connection state changes
      if (state.connected) {
        window.squadAPI.listSessions().then((res) => {
          const result = res as { ok: boolean; data?: any[] }
          if (result.ok && Array.isArray(result.data)) {
            setSessions(mapSessions(result.data))
          }
        }).catch(() => {})
      }
    })
    return () => { unsub() }
  }, [])

  // ── Periodic session refresh when SDK connected ──
  useEffect(() => {
    if (!sdkConnected) return
    const interval = setInterval(() => {
      window.squadAPI.listSessions().then((res) => {
        const result = res as { ok: boolean; data?: any[] }
        if (result.ok && Array.isArray(result.data)) {
          setSessions(mapSessions(result.data))
        }
      }).catch(() => {})
    }, 15000) // every 15 seconds
    return () => clearInterval(interval)
  }, [sdkConnected])

  // ── Breadcrumb navigation ──
  const handleBreadcrumbNavigate = useCallback(
    (item: BreadcrumbItem) => {
      if (item.level === 'hub') {
        if (navigation.state.level === 'office') {
          navigation.back() // office → floor
          navigation.back() // floor → building
        } else {
          navigation.back()
        }
      } else if (item.level === 'floor' && item.id) {
        navigation.selectSquad(item.id)
      }
    },
    [navigation]
  )

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        // Clear agent selection first, then navigate back
        if (effectiveAgent) {
          if (navigation.state.level === 'office') {
            navigation.selectAgent(null)
          } else {
            setSelectedAgent(null)
          }
        } else {
          navigation.back()
        }
        return
      }

      // Number keys 1-9 to quick-select agents on floor view
      if (navigation.state.level === 'floor') {
        const num = parseInt(e.key, 10)
        if (num >= 1 && num <= 9 && num <= agents.length) {
          handleSelectAgent(agents[num - 1].name)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [effectiveAgent, navigation, agents, handleSelectAgent])

  // ── Build session detail for office view ──
  const currentSessionDetail: SessionDetail | null =
    navigation.state.selectedSessionId
      ? {
          id: navigation.state.selectedSessionId,
          name: navigation.state.selectedSessionId,
          status: 'active',
          squadId: navigation.state.selectedSquadId ?? '',
          squadName: config?.name ?? '',
          agents: agents.map((a) => ({
            name: a.name,
            role: a.role,
            status:
              a.status === 'working'
                ? ('active' as const)
                : (a.status as 'active' | 'idle' | 'error'),
          })),
          createdAt: Date.now(),
        }
      : null

  // ── Loading splash ──
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-bg text-text-primary items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce" style={{ animationDuration: '2s' }}>🏫</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Squad Campus</h1>
          <p className="text-sm text-text-secondary mb-6">Loading your AI team's workspace…</p>
          <div className="inline-block w-8 h-8 border-4 border-border border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text-primary overflow-hidden">
      <Header
        breadcrumbs={navigation.breadcrumbs}
        onNavigate={handleBreadcrumbNavigate}
        connected={sdkConnected}
      />

      {/* Toolbar with panel toggles */}
      <div className="flex items-center gap-1 px-4 py-1 bg-bg-raised border-b border-border shrink-0">
        <button
          onClick={() => setActivePanel((p) => (p === 'decisions' ? 'none' : 'decisions'))}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-default ${
            activePanel === 'decisions'
              ? 'bg-accent/20 text-accent border border-accent/40'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent'
          }`}
        >
          📋 Decisions
        </button>
        <button
          onClick={() => setActivePanel((p) => (p === 'cost' ? 'none' : 'cost'))}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-default ${
            activePanel === 'cost'
              ? 'bg-accent/20 text-accent border border-accent/40'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent'
          }`}
        >
          💰 Cost
        </button>
        <button
          onClick={() => setActivePanel((p) => (p === 'hooks' ? 'none' : 'hooks'))}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-default ${
            activePanel === 'hooks'
              ? 'bg-accent/20 text-accent border border-accent/40'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent'
          }`}
        >
          🛡️ Hooks
        </button>
      </div>

      {/* Error banner */}
      {chat.error && (
        <div className="flex items-center justify-between px-4 py-2 bg-status-error/10 border-b border-status-error/20 text-sm text-status-error animate-fade-in">
          <span>{chat.error}</span>
          <button
            onClick={chat.clearError}
            className="text-status-error hover:text-text-primary transition-default ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* SDK connection banner — shown when disconnected */}
      {!loading && !sdkConnected && navigation.state.level !== 'building' && (
        <div className="flex items-center gap-3 px-4 py-2 bg-accent/5 border-b border-accent/10 text-xs text-text-secondary animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-status-warning shrink-0" />
          <span>
            <strong className="text-text-primary">Roster mode</strong> — Copilot CLI not detected. Agent cards show team info; live status &amp; chat require{' '}
            <code className="text-accent/80">squad start</code> running.
          </span>
        </div>
      )}

      {/* Main three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          hubName={config?.name ?? 'Squad Campus'}
          squads={squads.map((s) => ({
            id: s.id,
            name: s.name,
            floor: 1,
            memberCount: roster.length,
            activeSessionCount: sessions.length,
            status: 'connected' as const,
          }))}
          selectedSquadId={navigation.state.selectedSquadId}
          onSelectSquad={navigation.selectSquad}
          agents={agents}
          selectedAgent={effectiveAgent}
          onSelectAgent={handleSelectAgent}
          onChatWithAgent={(name) => {
            setShowChat(true)
            chat.createSession(name)
          }}
          loading={loading}
        />

        {/* Main content — 3-level conditional rendering, each wrapped in ErrorBoundary */}
        <ErrorBoundary>
          {navigation.state.level === 'building' && (
            <BuildingView
              squads={squads.map((s) => ({
                name: s.name,
                memberCount: roster.length,
              }))}
              onSelectSquad={(name) => navigation.selectSquad(name)}
              loading={loading}
            />
          )}

          {navigation.state.level === 'floor' && (
            <FloorView
              squad={{
                id: navigation.state.selectedSquadId ?? '',
                name: config?.name ?? '',
                floor: 1,
                members: roster,
                sessions: sessions,
              }}
              agents={agents}
              selectedAgent={effectiveAgent}
              onSelectAgent={handleSelectAgent}
              onSelectSession={navigation.selectSession}
              onCreateSession={() => {
                const agent = effectiveAgent ?? agents[0]?.name ?? ''
                if (agent) {
                  chat.createSession(agent)
                }
              }}
              loading={loading}
              sdkConnected={sdkConnected}
            />
          )}

          {navigation.state.level === 'office' && currentSessionDetail && (
            <OfficeView
              session={currentSessionDetail}
              streamingText={chat.streamingText}
              onBack={navigation.back}
              loading={loading}
            />
          )}
        </ErrorBoundary>

        {/* Agent detail panel — shows when agent selected but chat is not open */}
        {selectedAgentInfo && !showChat && (
          <ErrorBoundary>
            <AgentDetailPanel
              agent={selectedAgentInfo}
              onClose={() => setSelectedAgent(null)}
              onChat={(name) => {
                setShowChat(true)
                chat.createSession(name)
              }}
            />
          </ErrorBoundary>
        )}

        {/* Chat panel — shows when actively chatting */}
        {selectedAgentInfo && showChat && (
          <ErrorBoundary>
            <ChatPanel
              agentName={selectedAgentInfo.name}
              agentRole={selectedAgentInfo.role}
              sessionId={chat.sessionId}
              messages={chat.messages}
              streamingText={chat.streamingText}
              onSend={chat.sendMessage}
              onCreateSession={() => chat.createSession(selectedAgentInfo.name)}
              sending={chat.sending}
            />
          </ErrorBoundary>
        )}

        {/* Toggleable side panels — all wrapped in ErrorBoundary to prevent crashes */}
        {activePanel === 'decisions' && (
          <ErrorBoundary>
            <div className="w-80 border-l border-border shrink-0 animate-fade-in">
              <DecisionsTimeline />
            </div>
          </ErrorBoundary>
        )}
        {activePanel === 'cost' && (
          <ErrorBoundary>
            <div className="w-80 border-l border-border shrink-0 animate-fade-in">
              <CostDashboard
                totalTokens={chat.usage.totalTokens}
                estimatedCost={chat.usage.estimatedCost}
                model={chat.usage.model}
              />
            </div>
          </ErrorBoundary>
        )}
        {activePanel === 'hooks' && (
          <ErrorBoundary>
            <div className="w-80 border-l border-border shrink-0 animate-fade-in">
              <HooksPanel />
            </div>
          </ErrorBoundary>
        )}
      </div>

      <StatusBar
        squadRoot={config?.root ?? null}
        squadName={config?.name ?? null}
        sessionCount={sessions.length}
        totalTokens={chat.usage.totalTokens}
        estimatedCost={chat.usage.estimatedCost}
        model={chat.usage.model}
        totalMembers={roster.length}
        connected={sdkConnected}
      />

      {/* Keyboard shortcuts overlay (toggle with ?) */}
      <KeyboardShortcuts />
    </div>
  )
}

