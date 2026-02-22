import { useRef, useEffect } from 'react'

// ── Types ──

export interface TerminalPanelProps {
  /** Raw streaming text from the pipeline */
  text: string
  /** Whether the stream is currently active */
  active?: boolean
}

// ── Helpers ──

interface ParsedLine {
  prefix: string
  text: string
  isSuccess: boolean
}

/**
 * Parse a raw text blob into styled terminal lines.
 * Lines starting with known markers get special prefixes.
 */
function parseLines(raw: string): ParsedLine[] {
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map((line) => {
    const trimmed = line.trim()
    // Success markers
    if (trimmed.startsWith('✓') || trimmed.startsWith('✅') || /^(PASS|OK|Done)/i.test(trimmed)) {
      return { prefix: '✓', text: trimmed.replace(/^[✓✅]\s*/, ''), isSuccess: true }
    }
    // Error markers
    if (trimmed.startsWith('✗') || trimmed.startsWith('❌') || /^(FAIL|ERROR)/i.test(trimmed)) {
      return { prefix: '✗', text: trimmed.replace(/^[✗❌]\s*/, ''), isSuccess: false }
    }
    // Default: command/output line
    return { prefix: '▶', text: trimmed, isSuccess: false }
  })
}

// ── Component ──

/**
 * Live streaming terminal output panel.
 *
 * Renders StreamingPipeline content with styled line prefixes
 * (▶ for commands, ✓ for success). Auto-scrolls to bottom.
 * Dark terminal aesthetic with monospace font.
 */
export default function TerminalPanel({ text, active = false }: TerminalPanelProps) {
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new content
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [text])

  const lines = parseLines(text)

  return (
    <div className="border-t-2 border-border bg-bg flex flex-col max-h-60">
      {/* Header */}
      <div className="px-4 py-2.5 bg-bg-raised border-b border-border flex items-center gap-2 text-2xs font-semibold text-text-secondary uppercase tracking-wider shrink-0">
        {active && (
          <span className="w-1.5 h-1.5 rounded-full bg-status-working animate-pulse" />
        )}
        Live Output
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-2xs leading-relaxed text-text-secondary scrollbar-thin"
      >
        {lines.length === 0 ? (
          <span className="text-text-tertiary italic">Waiting for output…</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="mb-1">
              <span className={`mr-1.5 ${line.isSuccess ? 'text-status-active' : 'text-accent'}`}>
                {line.prefix}
              </span>
              <span className={line.isSuccess ? 'text-status-active' : undefined}>
                {line.text}
              </span>
            </div>
          ))
        )}
        {/* Blinking cursor when active */}
        {active && (
          <span className="inline-block w-1.5 h-3.5 bg-accent animate-pulse align-middle ml-0.5" />
        )}
      </div>
    </div>
  )
}
