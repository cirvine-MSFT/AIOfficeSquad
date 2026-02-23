interface Squad {
  name: string
  memberCount: number
}

interface BuildingViewProps {
  squads: Squad[]
  onSelectSquad: (name: string) => void
  loading: boolean
}

export default function BuildingView({ squads, onSelectSquad, loading }: BuildingViewProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center animate-fade-in">
        <div className="text-center px-6">
          <div className="inline-block w-12 h-12 border-4 border-text-tertiary border-t-accent rounded-full animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">Discovering squads...</h2>
          <p className="text-sm text-text-secondary max-w-sm">
            Loading squad data from <code>.squad/</code> directory
          </p>
        </div>
      </div>
    )
  }

  if (squads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center animate-fade-in">
        <div className="text-center px-6 max-w-md">
          <div className="text-5xl mb-4">🏫</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Welcome to Squad Campus</h2>
          <p className="text-sm text-text-secondary mb-6">
            Your AI team's home base. Open a project with a <code>.squad/</code> directory
            to see your team working in their office.
          </p>
          <div className="bg-bg-surface border border-border rounded-lg p-4 text-left">
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Quick Start</p>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>1. Navigate to a repo with a <code>.squad/</code> directory</p>
              <p>2. Run <code>npx @bradygaster/squad-cli init</code> to create one</p>
              <p>3. Your team will appear here as office buildings</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🏫</span>
        <h2 className="text-xl font-semibold text-text-primary">Squad Campus</h2>
        <span className="text-xs text-text-tertiary ml-2">
          {squads.length} building{squads.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {squads.map((squad) => (
          <button
            key={squad.name}
            onClick={() => onSelectSquad(squad.name)}
            className="text-left rounded-lg bg-bg-surface border border-border shadow-elevation-1 p-5 transition-default hover:bg-bg-hover hover:shadow-elevation-2 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-border-focus animate-fade-in-up group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🏢</span>
              <h3 className="text-md font-semibold text-text-primary">{squad.name}</h3>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                {squad.memberCount} member{squad.memberCount !== 1 ? 's' : ''}
              </p>
              <span className="text-xs text-text-tertiary bg-bg-raised px-2 py-0.5 rounded-full">
                Floor 1
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-accent flex items-center gap-1">
                Enter building →
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
