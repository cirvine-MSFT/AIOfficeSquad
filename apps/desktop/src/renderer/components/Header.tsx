import Breadcrumb from './shared/Breadcrumb'
import type { BreadcrumbItem } from '../hooks/useNavigation'

interface HeaderProps {
  breadcrumbs: BreadcrumbItem[]
  onNavigate: (item: BreadcrumbItem) => void
  connected: boolean
}

export default function Header({ breadcrumbs, onNavigate, connected }: HeaderProps) {
  return (
    <header role="banner" className="flex items-center justify-between h-header px-4 bg-bg-raised border-b border-border app-drag select-none shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">🏫</span>
        <h1 className="text-md font-semibold text-text-primary">Squad Campus</h1>
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
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-status-active shadow-[0_0_6px_rgba(74,222,128,0.4)]' : 'bg-status-idle'}`} />
          <span className="text-text-secondary">{connected ? 'Connected' : 'Offline'}</span>
        </div>
      </div>
    </header>
  )
}
