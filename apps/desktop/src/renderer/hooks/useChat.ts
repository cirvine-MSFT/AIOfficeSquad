import { useState, useCallback, useRef, useEffect } from 'react'
import type { StreamDelta, UsageEvent } from '../types'

// ── Types ──

/** A single chat message in a conversation */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  agentName?: string
  timestamp: number
}

/** Usage tracking totals */
export interface UsageStats {
  totalTokens: number
  estimatedCost: number
  model: string | null
}

/** Return type for the useChat hook */
export interface UseChatReturn {
  /** All messages for the currently selected agent */
  messages: ChatMessage[]
  /** Text being streamed for the current agent's session */
  streamingText: string
  /** Send a chat message to the selected agent */
  sendMessage: (text: string) => Promise<void>
  /** Create a new session for the specified agent */
  createSession: (agentName: string) => Promise<void>
  /** Current session ID for the selected agent (null if no session) */
  sessionId: string | null
  /** True while a message is being sent or session is being created */
  sending: boolean
  /** Cumulative usage statistics */
  usage: UsageStats
  /** Last error message, if any */
  error: string | null
  /** Clear the current error */
  clearError: () => void
}

// ── Internals ──

let msgIdCounter = 0
function nextMsgId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`
}

// ── Hook ──

/**
 * Manages chat state: sessions, messages, streaming text, and usage tracking.
 *
 * Extracted from App.tsx — owns the same Maps and event subscriptions that
 * previously lived inline. Pass `selectedAgent` so the hook can expose the
 * correct messages/session for the active conversation.
 *
 * @param selectedAgent - Name of the currently selected agent (null if none)
 */
export function useChat(selectedAgent: string | null): UseChatReturn {
  // ── Per-agent state (keyed by agent name or session ID) ──
  const [sessions, setSessions] = useState<Map<string, string>>(new Map())       // agentName → sessionId
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage[]>>(new Map()) // agentName → msgs
  const [streamingMap, setStreamingMap] = useState<Map<string, string>>(new Map())      // sessionId → text
  const [sending, setSending] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)

  // ── Usage tracking ──
  const [totalTokens, setTotalTokens] = useState(0)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [model, setModel] = useState<string | null>(null)

  // ── Error ──
  const [error, setError] = useState<string | null>(null)

  // Stable ref so subscription callbacks see current sessions
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  // ── Computed values for the selected agent ──
  const sessionId = selectedAgent ? sessions.get(selectedAgent) ?? null : null
  const messages = selectedAgent ? messagesMap.get(selectedAgent) ?? [] : []
  const streamingText = sessionId ? streamingMap.get(sessionId) ?? '' : ''

  // ── Event subscriptions (stream deltas + usage) ──
  useEffect(() => {
    const unsubDelta = window.squadAPI.onStreamDelta((delta) => {
      const d = delta as StreamDelta
      setStreamingMap((prev) => {
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

      // When usage arrives the stream is done — commit streamed text as a message
      const sessionEntries = Array.from(sessionsRef.current.entries())
      const agentEntry = sessionEntries.find(([, sid]) => sid === u.sessionId)
      if (agentEntry) {
        const [agentName] = agentEntry
        setStreamingMap((prev) => {
          const text = prev.get(u.sessionId)
          if (text) {
            setMessagesMap((msgPrev) => {
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

    return () => {
      unsubDelta()
      unsubUsage()
    }
  }, [])

  // ── Actions ──

  const createSession = useCallback(async (agentName: string) => {
    setCreatingSession(true)
    setError(null)
    try {
      const res = (await window.squadAPI.createSession(agentName)) as {
        ok: boolean
        data?: { sessionId: string }
        error?: string
      }
      if (res.ok && res.data) {
        setSessions((prev) => {
          const next = new Map(prev)
          next.set(agentName, res.data!.sessionId)
          return next
        })
      } else {
        setError(res.error ?? 'Failed to create session')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    }
    setCreatingSession(false)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!selectedAgent || !sessionId) return
      setSending(true)
      setError(null)

      // Add user message immediately
      setMessagesMap((prev) => {
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

      const res = (await window.squadAPI.sendMessage(sessionId, text)) as {
        ok: boolean
        error?: string
      }
      if (!res.ok) {
        setError(res.error ?? 'Failed to send message')
      }
      setSending(false)
    },
    [selectedAgent, sessionId]
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    messages,
    streamingText,
    sendMessage,
    createSession,
    sessionId,
    sending: sending || creatingSession,
    usage: { totalTokens, estimatedCost, model },
    error,
    clearError,
  }
}
