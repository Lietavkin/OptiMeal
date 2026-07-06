import type { MealOptimizationMode } from '../types'
import { OPTIMIZATION_MODES } from '../services/recipeService'

type MealOptimizationPanelProps = {
  mode: MealOptimizationMode
  onModeChange: (mode: MealOptimizationMode) => void
}

export default function MealOptimizationPanel({ mode, onModeChange }: MealOptimizationPanelProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Meal optimization</p>
      <p className="mt-1 text-sm text-slate-500">Select a mode to rank the best recipes for your goals.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {OPTIMIZATION_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onModeChange(item.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              mode === item.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <p className="font-semibold text-slate-900">{item.label}</p>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
