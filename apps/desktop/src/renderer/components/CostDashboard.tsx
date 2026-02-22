interface CostDashboardProps {
  totalTokens: number
  estimatedCost: number
  model: string | null
}

export default function CostDashboard({ totalTokens, estimatedCost, model }: CostDashboardProps) {
  return (
    <div className="flex flex-col h-full bg-bg-sunken p-4 overflow-y-auto">
      {/* Header */}
      <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
        💰 Cost Dashboard
      </h2>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-3">
        {/* Total tokens */}
        <div className="bg-bg-raised border border-border rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Total Tokens</div>
          <div className="text-2xl font-bold text-text-primary font-mono">
            {totalTokens.toLocaleString()}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Cumulative input + output tokens
          </div>
        </div>

        {/* Estimated cost */}
        <div className="bg-bg-raised border border-border rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Estimated Cost</div>
          <div className="text-2xl font-bold font-mono" style={{ color: estimatedCost > 1 ? '#f87171' : '#4ade80' }}>
            ${estimatedCost.toFixed(2)}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Based on ~$3/MTok input, ~$15/MTok output
          </div>
        </div>

        {/* Current model */}
        <div className="bg-bg-raised border border-border rounded-lg p-4">
          <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Current Model</div>
          <div className="text-lg font-semibold text-accent font-mono">
            {model ?? '—'}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {model ? 'Active model for SDK sessions' : 'No model selected yet'}
          </div>
        </div>
      </div>

      {/* Skeleton placeholder */}
      <div className="mt-4 p-3 bg-bg-raised border border-border/50 rounded-lg border-dashed">
        <p className="text-xs text-text-tertiary text-center">
          📊 Detailed breakdowns coming when SDK connects
        </p>
      </div>
    </div>
  )
}
