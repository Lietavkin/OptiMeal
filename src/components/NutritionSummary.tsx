import { useMemo } from 'react'
import { useNutrition } from '../contexts/NutritionContext'

export default function NutritionSummary() {
  const { summary } = useNutrition()

  const totalMacros = useMemo(() => summary.totalProtein + summary.totalCarbs + summary.totalFat, [summary])

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h4 className="text-sm font-semibold text-slate-700">Today's nutrition</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Calories</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalCalories}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Protein</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalProtein} g</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Carbs</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalCarbs} g</p>
        </div>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${totalMacros === 0 ? 0 : Math.min(100, (summary.totalProtein / totalMacros) * 100)}%` }}
        />
      </div>
    </div>
  )
}
