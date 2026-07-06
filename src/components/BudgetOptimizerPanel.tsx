import type { OptimizerMode } from '../types'

const MODES: { id: OptimizerMode; label: string; description: string }[] = [
  { id: 'cheapest', label: 'Cheapest', description: 'Maximize savings with budget-friendly picks' },
  { id: 'balanced', label: 'Balanced', description: 'Balance cost and nutrition quality' },
  { id: 'healthiest', label: 'Healthiest', description: 'Prioritize nutrient-dense ingredients' },
]

type BudgetOptimizerPanelProps = {
  weeklyBudget: number
  optimizerMode: OptimizerMode
  estimatedTotal: number
  remainingBudget: number
  nutritionScore: number
  savingsVsHealthiest: number
  onBudgetChange: (budget: number) => void
  onModeChange: (mode: OptimizerMode) => void
}

export default function BudgetOptimizerPanel({
  weeklyBudget,
  optimizerMode,
  estimatedTotal,
  remainingBudget,
  nutritionScore,
  savingsVsHealthiest,
  onBudgetChange,
  onModeChange,
}: BudgetOptimizerPanelProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Budget optimizer</p>
      <p className="mt-1 text-sm text-slate-500">Choose how to balance cost, nutrition, and your weekly budget.</p>

      <div className="mt-5">
        <label className="block text-sm font-medium text-slate-700">Weekly budget ($)</label>
        <input
          type="number"
          min={0}
          step={5}
          value={weeklyBudget}
          onChange={(e) => onBudgetChange(Number(e.target.value))}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </div>

      <div className="mt-5 grid gap-3">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onModeChange(mode.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              optimizerMode === mode.id
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <p className="font-semibold text-slate-900">{mode.label}</p>
            <p className="mt-1 text-sm text-slate-600">{mode.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estimated total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">${estimatedTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Remaining budget</p>
          <p className={`mt-2 text-2xl font-semibold ${remainingBudget < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            ${remainingBudget.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nutrition score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{nutritionScore}/100</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Savings vs healthiest</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">${savingsVsHealthiest.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
