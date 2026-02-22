import AgentCard, { type AgentInfo } from './AgentCard'

interface PodViewProps {
  squadName: string
  agents: AgentInfo[]
  selectedAgent: string | null
  onSelectAgent: (name: string) => void
}

export default function PodView({
  squadName,
  agents,
  selectedAgent,
  onSelectAgent,
}: PodViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{squadName}</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {agents.length} member{agents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Agent grid */}
      {agents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-text-tertiary">No agents in this squad.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              selected={selectedAgent === agent.name}
              onClick={() => onSelectAgent(agent.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
