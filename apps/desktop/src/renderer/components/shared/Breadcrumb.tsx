import type { BreadcrumbItem } from '../../hooks/useNavigation'

// ── Types ──

export interface BreadcrumbProps {
  /** Ordered breadcrumb trail items (leftmost = root) */
  items: BreadcrumbItem[]
  /** Called when a non-current breadcrumb is clicked */
  onNavigate: (item: BreadcrumbItem) => void
}

// ── Component ──

/**
 * Clickable breadcrumb trail: Hub › Floor Name › Session Name.
 *
 * The last item is rendered as non-clickable static text (current location).
 * All preceding items are clickable links that fire onNavigate.
 */
export default function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm select-none">
      {items.map((item, i) => {
        const isLast = i === items.length - 1

        return (
          <span key={`${item.level}-${item.id ?? 'root'}`} className="flex items-center gap-1.5">
            {/* Separator arrow (skip for first item) */}
            {i > 0 && (
              <span className="text-text-tertiary" aria-hidden>
                ›
              </span>
            )}

            {isLast ? (
              /* Current location — non-clickable */
              <span className="text-text-secondary font-medium">{item.label}</span>
            ) : (
              /* Ancestor — clickable */
              <button
                onClick={() => onNavigate(item)}
                className="text-text-tertiary hover:text-text-primary transition-default"
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
