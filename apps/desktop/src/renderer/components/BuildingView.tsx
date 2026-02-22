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
        <div className="text-center px-6">
          <div className="text-4xl mb-4">🏫</div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">No squads found</h2>
          <p className="text-sm text-text-secondary max-w-sm">
            Open a project with a <code>.squad/</code> directory to get started.
          </p>
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
            className="text-left rounded-lg bg-bg-surface border border-border shadow-elevation-1 p-5 transition-default hover:bg-bg-hover hover:shadow-elevation-2 focus-visible:ring-2 focus-visible:ring-border-focus animate-fade-in-up"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏢</span>
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
          </button>
        ))}
      </div>
    </div>
  )
}
