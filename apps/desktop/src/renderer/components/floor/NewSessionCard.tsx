// ── Types ──

export interface NewSessionCardProps {
  /** Called when the card is clicked to start a new session */
  onClick: () => void
}

// ── Component ──

/**
 * Dashed "+" card for starting a new session.
 * Sits alongside SessionCards in the FloorView grid.
 */
export default function NewSessionCard({ onClick }: NewSessionCardProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-full rounded-lg border-2 border-dashed border-border
        bg-transparent min-h-[120px]
        flex flex-col items-center justify-center gap-2
        cursor-pointer transition-all duration-200
        hover:border-accent hover:bg-accent/5
        focus-visible:ring-2 focus-visible:ring-border-focus
      "
    >
      <span className="text-2xl text-text-tertiary">＋</span>
      <span className="text-sm text-text-secondary">New session</span>
    </button>
  )
}
