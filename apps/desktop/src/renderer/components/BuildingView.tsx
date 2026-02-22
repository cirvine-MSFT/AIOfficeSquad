interface Squad {
  name: string
  memberCount: number
}

interface BuildingViewProps {
  squads: Squad[]
  onSelectSquad: (name: string) => void
}

export default function BuildingView({ squads, onSelectSquad }: BuildingViewProps) {
  if (squads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center animate-fade-in">
        <div className="text-center px-6">
          <div className="text-4xl mb-4">🏢</div>
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
      <h2 className="text-xl font-semibold text-text-primary mb-4">Squads</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {squads.map((squad) => (
          <button
            key={squad.name}
            onClick={() => onSelectSquad(squad.name)}
            className="text-left rounded-lg bg-bg-surface border border-border shadow-elevation-1 p-5 transition-default hover:bg-bg-hover hover:shadow-elevation-2 focus-visible:ring-2 focus-visible:ring-border-focus animate-fade-in-up"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">👥</span>
              <h3 className="text-md font-semibold text-text-primary">{squad.name}</h3>
            </div>
            <p className="text-sm text-text-secondary">
              {squad.memberCount} member{squad.memberCount !== 1 ? 's' : ''}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
