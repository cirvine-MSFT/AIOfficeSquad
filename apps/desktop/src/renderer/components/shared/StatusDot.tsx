// ── Types ──

export interface StatusDotProps {
  /** Agent status level */
  status: 'active' | 'idle' | 'error' | 'working'
  /** Whether to show a pulsing animation (defaults to true for 'active' and 'working') */
  pulse?: boolean
}

// ── Status metadata ──

/** Human-readable labels for each status */
export const STATUS_LABELS: Record<StatusDotProps['status'], string> = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
  working: 'Working',
}

/** Tailwind badge classes for status pill rendering (bg + text color) */
export const STATUS_BADGE_CLASSES: Record<StatusDotProps['status'], string> = {
  active: 'bg-status-active/15 text-status-active',
  idle: 'bg-status-idle/15 text-status-idle',
  error: 'bg-status-error/15 text-status-error',
  working: 'bg-status-working/15 text-status-working',
}

// ── Component ──

/**
 * Tiny colored dot indicator for agent status.
 *
 * Uses the existing `status-dot` / `status-dot-{status}` CSS classes
 * defined in globals.css. Adds optional pulse animation.
 */
export default function StatusDot({ status, pulse }: StatusDotProps) {
  const shouldPulse = pulse ?? (status === 'active' || status === 'working')

  return (
    <span
      className={`status-dot status-dot-${status} shrink-0${shouldPulse ? ' animate-pulse' : ''}`}
      role="img"
      aria-label={STATUS_LABELS[status]}
    />
  )
}
