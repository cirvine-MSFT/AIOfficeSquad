import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  SquadMember,
  AgentStatus,
  ConnectionState,
  StreamDelta,
  UsageEvent,
  SquadConfig,
} from './types'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import BuildingView from './components/BuildingView'
import PodView from './components/PodView'
import ChatPanel, { type ChatMessage } from './components/ChatPanel'
import StatusBar from './components/StatusBar'
import type { AgentInfo } from './components/AgentCard'

function mergeAgentInfo(members: SquadMember[], statuses: AgentStatus[]): AgentInfo[] {
  const statusMap = new Map(statuses.map((s) => [s.name.toLowerCase(), s]))
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

let msgIdCounter = 0
function nextMsgId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`
}

export default function App() {
  // ── Connection state ──
  const [connectionState, setConnectionState] = useState<ConnectionState>({ connected: false })
  const [connecting, setConnecting] = useState(false)

  // ── Squad data ──
  const [config, setConfig] = useState<SquadConfig | null>(null)
  const [roster, setRoster] = useState<SquadMember[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])

  // ── Selection state ──
  const [selectedSquad, setSelectedSquad] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // ── Chat state ──
  const [sessions, setSessions] = useState<Map<string, string>>(new Map()) // agentName → sessionId
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map()) // agentName → messages
  const [streamingText, setStreamingText] = useState<Map<string, string>>(new Map()) // sessionId → text
  const [sending, setSending] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)

  // ── Usage tracking ──
  const [totalTokens, setTotalTokens] = useState(0)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [model, setModel] = useState<string | null>(null)

  // ── Error state ──
  const [error, setError] = useState<string | null>(null)

  // Ref for stable session lookup in callbacks
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  // ── Computed values ──
  const squads = config ? [config.name] : []
  const agents = mergeAgentInfo(roster, agentStatuses)
  const selectedAgentInfo = agents.find((a) => a.name === selectedAgent)
  const agentSessionId = selectedAgent ? sessions.get(selectedAgent) ?? null : null
  const agentMessages = selectedAgent ? messages.get(selectedAgent) ?? [] : []
  const agentStreamText = agentSessionId ? streamingText.get(agentSessionId) ?? '' : ''

  // ── Auto-select single squad ──
  useEffect(() => {
    if (squads.length === 1 && !selectedSquad) {
      setSelectedSquad(squads[0])
    }
  }, [squads, selectedSquad])

  // ── Initial data load ──
  useEffect(() => {
    async function loadInitialData() {
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
    }

    loadInitialData()
  }, [])

  // ── Event subscriptions ──
  useEffect(() => {
    const unsubConnection = window.squadAPI.onConnectionState((state) => {
      const cs = state as ConnectionState
      setConnectionState(cs)
      if (cs.connected) setConnecting(false)
    })

    const unsubDelta = window.squadAPI.onStreamDelta((delta) => {
      const d = delta as StreamDelta
      setStreamingText((prev) => {
        const next = new Map(prev)
        next.set(d.sessionId, (prev.get(d.sessionId) ?? '') + d.delta)
        return next
      })
    })

    const unsubUsage = window.squadAPI.onStreamUsage((usage) => {
      const u = usage as UsageEvent
      setTotalTokens((prev) => prev + u.inputTokens + u.outputTokens)
      // Rough cost estimate: ~$3/MTok input, ~$15/MTok output
      setEstimatedCost(
        (prev) => prev + u.inputTokens * 0.000003 + u.outputTokens * 0.000015
      )
      if (u.model) setModel(u.model)

      // When usage arrives, the stream is done — commit the streamed text as a message
      const sessionEntries = Array.from(sessionsRef.current.entries())
      const agentEntry = sessionEntries.find(([, sid]) => sid === u.sessionId)
      if (agentEntry) {
        const [agentName] = agentEntry
        setStreamingText((prev) => {
          const text = prev.get(u.sessionId)
          if (text) {
            setMessages((msgPrev) => {
              const agentMsgs = [...(msgPrev.get(agentName) ?? [])]
              agentMsgs.push({
                id: nextMsgId(),
                role: 'assistant',
                text,
                agentName,
                timestamp: Date.now(),
              })
              const next = new Map(msgPrev)
              next.set(agentName, agentMsgs)
              return next
            })
          }
          const next = new Map(prev)
          next.delete(u.sessionId)
          return next
        })
      }
    })

    const unsubEvent = window.squadAPI.onEvent(() => {
      // Refresh agent statuses on any event
      window.squadAPI.getAgentStatuses().then((res) => {
        const result = res as { ok: boolean; data?: AgentStatus[] }
        if (result.ok && result.data) setAgentStatuses(result.data)
      })
    })

    return () => {
      unsubConnection()
      unsubDelta()
      unsubUsage()
      unsubEvent()
    }
  }, [])

  // ── Actions ──
  const handleConnect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    const res = (await window.squadAPI.connect()) as { ok: boolean; error?: string }
    if (!res.ok) {
      setError(res.error ?? 'Connection failed')
      setConnecting(false)
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    await window.squadAPI.disconnect()
    setConnectionState({ connected: false })
  }, [])

  const handleSelectSquad = useCallback((name: string) => {
    setSelectedSquad(name)
    setSelectedAgent(null)
  }, [])

  const handleSelectAgent = useCallback((name: string) => {
    setSelectedAgent((prev) => (prev === name ? null : name))
  }, [])

  const handleCreateSession = useCallback(async () => {
    if (!selectedAgent) return
    setCreatingSession(true)
    setError(null)
    const res = (await window.squadAPI.createSession(selectedAgent)) as {
      ok: boolean
      data?: { sessionId: string }
      error?: string
    }
    if (res.ok && res.data) {
      setSessions((prev) => {
        const next = new Map(prev)
        next.set(selectedAgent, res.data!.sessionId)
        return next
      })
    } else {
      setError(res.error ?? 'Failed to create session')
    }
    setCreatingSession(false)
  }, [selectedAgent])

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!selectedAgent || !agentSessionId) return
      setSending(true)
      setError(null)

      // Add user message immediately
      setMessages((prev) => {
        const agentMsgs = [...(prev.get(selectedAgent) ?? [])]
        agentMsgs.push({
          id: nextMsgId(),
          role: 'user',
          text,
          timestamp: Date.now(),
        })
        const next = new Map(prev)
        next.set(selectedAgent, agentMsgs)
        return next
      })

      const res = (await window.squadAPI.sendMessage(agentSessionId, text)) as {
        ok: boolean
        error?: string
      }
      if (!res.ok) {
        setError(res.error ?? 'Failed to send message')
      }
      setSending(false)
    },
    [selectedAgent, agentSessionId]
  )

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        if (selectedAgent) {
          setSelectedAgent(null)
        } else if (selectedSquad) {
          setSelectedSquad(null)
        }
        return
      }

      // Number keys 1-9 to select agents
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= 9 && num <= agents.length) {
        setSelectedAgent(agents[num - 1].name)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAgent, selectedSquad, agents])

  return (
    <div className="flex flex-col h-screen bg-bg text-text-primary overflow-hidden">
      <Header
        connectionState={connectionState}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        connecting={connecting}
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2 bg-status-error/10 border-b border-status-error/20 text-sm text-status-error animate-fade-in">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-status-error hover:text-text-primary transition-default ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          squads={squads}
          selectedSquad={selectedSquad}
          onSelectSquad={handleSelectSquad}
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
        />

        {/* Main content */}
        {!selectedSquad ? (
          <BuildingView
            squads={squads.map((name) => ({
              name,
              memberCount: roster.length,
            }))}
            onSelectSquad={handleSelectSquad}
          />
        ) : (
          <PodView
            squadName={selectedSquad}
            agents={agents}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
          />
        )}

        {/* Detail panel */}
        {selectedAgent && selectedAgentInfo && (
          <ChatPanel
            agentName={selectedAgentInfo.name}
            agentRole={selectedAgentInfo.role}
            sessionId={agentSessionId}
            messages={agentMessages}
            streamingText={agentStreamText}
            onSend={handleSendMessage}
            onCreateSession={handleCreateSession}
            sending={sending || creatingSession}
          />
        )}
      </div>

      <StatusBar
        connectionState={connectionState}
        sessionCount={sessions.size}
        totalTokens={totalTokens}
        estimatedCost={estimatedCost}
        model={model}
      />
    </div>
  )
}

