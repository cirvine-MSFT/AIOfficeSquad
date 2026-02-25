interface Squad {
  name: string
  memberCount: number
  /** Number of active sessions on this floor (for lit windows) */
  activeSessionCount?: number
  /** Floor number */
  floor?: number
}

interface BuildingViewProps {
  squads: Squad[]
  onSelectSquad: (name: string) => void
  loading: boolean
  /** Hub/campus name shown on the building sign */
  hubName?: string
}

/** Number of window slots per floor row */
const WINDOWS_PER_FLOOR = 5

export default function BuildingView({ squads, onSelectSquad, loading, hubName }: BuildingViewProps) {
  const signText = (hubName ?? 'Squad Campus').toUpperCase()
  const totalMembers = squads.reduce((sum, s) => sum + s.memberCount, 0)
  const totalActive = squads.reduce((sum, s) => sum + (s.activeSessionCount ?? 0), 0)

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

  // Sort floors top-down (highest floor at top)
  const sortedSquads = [...squads].sort(
    (a, b) => (b.floor ?? 1) - (a.floor ?? 1)
  )

  return (
    <div
      className="flex-1 flex items-center justify-center p-10 animate-fade-in"
      style={{ background: 'radial-gradient(ellipse at center bottom, #1a1d27 0%, #0f1117 70%)' }}
    >
      <div className="flex flex-col items-center">
        {/* Building structure */}
        <div className="relative">
          {/* Roof */}
          <div
            className="flex items-center justify-center"
            style={{
              width: 380,
              height: 50,
              background: 'linear-gradient(135deg, #252936 0%, #1a1d27 100%)',
              border: '1px solid #2a2f3d',
              borderBottom: 'none',
              borderRadius: '12px 12px 0 0',
            }}
          >
            <span
              className="text-[11px] font-semibold tracking-widest"
              style={{
                background: '#0f1117',
                border: '1px solid #2a2f3d',
                padding: '4px 16px',
                borderRadius: 4,
                color: '#5b8def',
              }}
            >
              {signText}
            </span>
          </div>

          {/* Floor rows */}
          <div className="flex flex-col">
            {sortedSquads.map((squad, idx) => {
              const floorNum = squad.floor ?? (sortedSquads.length - idx)
              const litCount = Math.min(squad.activeSessionCount ?? 0, WINDOWS_PER_FLOOR)
              const isLast = idx === sortedSquads.length - 1

              return (
                <button
                  key={squad.name}
                  onClick={() => onSelectSquad(squad.name)}
                  aria-label={`Floor ${floorNum}: ${squad.name} — ${squad.memberCount} members`}
                  className="flex items-center cursor-pointer transition-all duration-200 relative focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:z-10"
                  style={{
                    width: 380,
                    height: 90,
                    background: 'linear-gradient(180deg, #1a1d27 0%, #151820 100%)',
                    borderLeft: '3px solid #3d4555',
                    borderRight: '3px solid #3d4555',
                    borderBottom: isLast ? '3px solid #3d4555' : 'none',
                    borderRadius: isLast ? '0 0 4px 4px' : undefined,
                    padding: '0 20px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #1f2330 0%, #1a1d27 100%)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #1a1d27 0%, #151820 100%)'
                  }}
                >
                  {/* Floor separator line */}
                  <div
                    className="absolute left-[3px] right-[3px] bottom-0 h-[2px]"
                    style={{ background: '#3d4555' }}
                  />

                  {/* Floor number */}
                  <div
                    className="flex items-center justify-center text-[11px] font-semibold text-text-secondary mr-4 shrink-0"
                    style={{
                      width: 24,
                      height: 24,
                      background: '#0f1117',
                      border: '1px solid #2a2f3d',
                      borderRadius: 4,
                    }}
                  >
                    {floorNum}
                  </div>

                  {/* Windows */}
                  <div className="flex gap-1.5 mr-4 shrink-0">
                    {Array.from({ length: WINDOWS_PER_FLOOR }).map((_, wi) => {
                      const isLit = wi < litCount
                      return (
                        <div
                          key={wi}
                          className="relative overflow-hidden transition-all duration-300"
                          style={{
                            width: 28,
                            height: 44,
                            borderRadius: 3,
                            background: isLit
                              ? 'linear-gradient(180deg, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.3) 100%)'
                              : '#0f1117',
                            border: `2px solid ${isLit ? 'rgba(251,191,36,0.5)' : '#3d4555'}`,
                            boxShadow: isLit ? '0 0 20px rgba(251,191,36,0.4)' : 'none',
                          }}
                        >
                          {/* Window cross-bars */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: '#3d4555' }} />
                          <div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: '#3d4555' }} />
                        </div>
                      )
                    })}
                  </div>

                  {/* Floor info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{squad.name}</div>
                    <div className="text-[11px] text-text-secondary">
                      {squad.memberCount} member{squad.memberCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Active badge */}
                  <div
                    className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full text-text-secondary shrink-0"
                    style={{ background: '#0f1117', borderRadius: 12 }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: litCount > 0 ? '#4ade80' : '#636a7c',
                        boxShadow: litCount > 0 ? '0 0 8px rgba(74,222,128,0.3)' : 'none',
                        animation: litCount > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                      }}
                    />
                    {litCount > 0 ? `${litCount} active` : 'Idle'}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Foundation */}
          <div
            style={{
              width: 400,
              height: 16,
              background: 'linear-gradient(180deg, #3d4555 0%, #2a2f3d 100%)',
              borderRadius: '0 0 8px 8px',
              marginTop: -1,
              marginLeft: -10,
            }}
          />
        </div>

        {/* Building label */}
        <div className="mt-6 text-center">
          <h2 className="text-[22px] font-bold text-text-primary mb-1">
            🏢 {hubName ?? 'Squad Campus'}
          </h2>
          <p className="text-[13px] text-text-secondary">
            {squads.length} floor{squads.length !== 1 ? 's' : ''} • {totalMembers} member{totalMembers !== 1 ? 's' : ''}{totalActive > 0 ? ` • ${totalActive} active session${totalActive !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
