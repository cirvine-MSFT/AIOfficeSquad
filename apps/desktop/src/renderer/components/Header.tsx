import Breadcrumb from './shared/Breadcrumb'
import type { BreadcrumbItem } from '../hooks/useNavigation'

interface HeaderProps {
  breadcrumbs: BreadcrumbItem[]
  onNavigate: (item: BreadcrumbItem) => void
  connected: boolean
}

export default function Header({ breadcrumbs, onNavigate, connected }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-header px-4 bg-bg-raised border-b border-border app-drag select-none shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">🏢</span>
        <h1 className="text-md font-semibold text-text-primary">Squad Office</h1>
        {breadcrumbs.length > 0 && (
          <>
            <span className="text-text-tertiary">·</span>
            <div className="app-no-drag">
              <Breadcrumb items={breadcrumbs} onNavigate={onNavigate} />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 app-no-drag">
        <div className="flex items-center gap-2 text-sm">
          <span className={`status-dot ${connected ? 'status-dot-active' : 'status-dot-idle'}`} />
          <span className="text-text-secondary">{connected ? 'Ready' : 'Loading…'}</span>
        </div>
      </div>
    </header>
  )
}
