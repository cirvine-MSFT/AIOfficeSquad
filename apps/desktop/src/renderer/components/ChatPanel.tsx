import { useState, useRef, useEffect, useCallback } from 'react'
import { ROLE_COLORS, getAvatarColor, type AgentRole } from '../styles/design-tokens'
import StreamingOutput from './StreamingOutput'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  agentName?: string
  timestamp: number
}

interface ChatPanelProps {
  agentName: string
  agentRole: string
  sessionId: string | null
  messages: ChatMessage[]
  streamingText: string
  onSend: (text: string) => void
  onCreateSession: () => void
  sending: boolean
}

function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleKey(role: string): AgentRole | null {
  const normalized = role.toLowerCase().replace(/\s+/g, '')
  if (normalized in ROLE_COLORS) return normalized as AgentRole
  if (normalized === 'squadexpert') return 'expert'
  return null
}

export default function ChatPanel({
  agentName,
  agentRole,
  sessionId,
  messages,
  streamingText,
  onSend,
  onCreateSession,
  sending,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const roleKey = getRoleKey(agentRole)
  const avatarBg = roleKey ? ROLE_COLORS[roleKey].accent : getAvatarColor(agentName)

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = input.trim()
      if (!trimmed || sending) return
      onSend(trimmed)
      setInput('')
    },
    [input, sending, onSend]
  )

  return (
    <aside className="flex flex-col w-80 min-w-panel-min bg-bg-raised border-l border-border animate-slide-in-right shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0">
        <div
          className="flex items-center justify-center rounded-full w-8 h-8 text-base font-semibold text-white shrink-0"
          style={{ backgroundColor: avatarBg }}
        >
          {getInitials(agentName)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary truncate">{agentName}</div>
          <div
            className="text-2xs font-medium"
            style={{ color: roleKey ? ROLE_COLORS[roleKey].text : undefined }}
          >
            {roleKey ? ROLE_COLORS[roleKey].label : agentRole}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {!sessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-3xl mb-3">💬</div>
            <p className="text-sm text-text-secondary mb-4">
              Start a conversation with {agentName}
            </p>
            <button
              onClick={onCreateSession}
              className="h-8 px-4 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed transition-default"
            >
              Start conversation
            </button>
          </div>
        ) : messages.length === 0 && !streamingText ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-text-tertiary">
              Send a message to begin.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex animate-fade-in-up ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="flex items-center justify-center rounded-full w-6 h-6 text-2xs font-semibold text-white shrink-0 mr-2 mt-0.5"
                    style={{ backgroundColor: avatarBg }}
                  >
                    {getInitials(agentName)}
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-accent text-white'
                      : 'bg-bg-surface text-text-primary'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Streaming output */}
            {streamingText && (
              <div className="flex justify-start animate-fade-in">
                <div
                  className="flex items-center justify-center rounded-full w-6 h-6 text-2xs font-semibold text-white shrink-0 mr-2 mt-0.5"
                  style={{ backgroundColor: avatarBg }}
                >
                  {getInitials(agentName)}
                </div>
                <div className="max-w-[85%] rounded-lg px-3 py-2 bg-bg-surface">
                  <StreamingOutput text={streamingText} />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      {sessionId && (
        <form onSubmit={handleSubmit} className="p-3 border-t border-border shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message…"
              disabled={sending}
              className="flex-1 h-8 px-3 text-sm bg-bg border border-border rounded-md text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:ring-1 focus:ring-border-focus disabled:opacity-50 transition-default"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="h-8 px-3 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed disabled:opacity-50 transition-default"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </aside>
  )
}
