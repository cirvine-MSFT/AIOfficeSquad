export default function Header() {
  return (
    <header className="flex items-center justify-between h-header px-4 bg-bg-raised border-b border-border app-drag select-none shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏢</span>
        <h1 className="text-md font-semibold text-text-primary">Squad Office</h1>
      </div>

      <div className="flex items-center gap-3 app-no-drag">
        <div className="flex items-center gap-2 text-sm">
          <span className="status-dot status-dot-active" />
          <span className="text-text-secondary">Ready</span>
        </div>
      </div>
    </header>
  )
}
