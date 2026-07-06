import { useEffect, useMemo, useState } from 'react'
import { useNutrition } from '../contexts/NutritionContext'
import useProfile from '../hooks/useProfile'

export default function GoalsSummary() {
  const { summary } = useNutrition()
  const { profile, loading, saveProfile } = useProfile()
  const [editing, setEditing] = useState(false)
  const [goals, setGoals] = useState({
    calories: profile?.daily_calories_goal ?? 2000,
    protein: profile?.daily_protein_goal ?? 100,
    carbs: profile?.daily_carbs_goal ?? 250,
    fat: profile?.daily_fat_goal ?? 70,
  })

  useEffect(() => {
    setGoals({
      calories: profile?.daily_calories_goal ?? 2000,
      protein: profile?.daily_protein_goal ?? 100,
      carbs: profile?.daily_carbs_goal ?? 250,
      fat: profile?.daily_fat_goal ?? 70,
    })
  }, [profile])

  const activeGoals = useMemo(
    () => ({
      calories: profile?.daily_calories_goal ?? goals.calories,
      protein: profile?.daily_protein_goal ?? goals.protein,
      carbs: profile?.daily_carbs_goal ?? goals.carbs,
      fat: profile?.daily_fat_goal ?? goals.fat,
    }),
    [profile, goals],
  )

  const progress = useMemo(
    () => ({
      calories: Math.min(100, (summary.totalCalories / activeGoals.calories) * 100),
      protein: Math.min(100, (summary.totalProtein / activeGoals.protein) * 100),
      carbs: Math.min(100, (summary.totalCarbs / activeGoals.carbs) * 100),
      fat: Math.min(100, (summary.totalFat / activeGoals.fat) * 100),
    }),
    [summary, activeGoals],
  )

  async function handleSaveGoals() {
    try {
      await saveProfile({
        daily_calories_goal: goals.calories,
        daily_protein_goal: goals.protein,
        daily_carbs_goal: goals.carbs,
        daily_fat_goal: goals.fat,
      })
      setEditing(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save goals', error)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Daily goals</h4>
          <p className="mt-1 text-sm text-slate-500">Update your macro targets and watch progress toward them.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {(
          [
            { label: 'Calories', key: 'calories' as const },
            { label: 'Protein', key: 'protein' as const },
            { label: 'Carbs', key: 'carbs' as const },
            { label: 'Fat', key: 'fat' as const },
          ] as const
        ).map((item) => {
          const value = activeGoals[item.key]
          const current = summary[`total${item.label}` as keyof typeof summary] as number
          return (
            <div key={item.key}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-500">{current} of {value} {item.key === 'calories' ? '' : 'g'}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{Math.round(progress[item.key])}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress[item.key]}%` }} />
              </div>
              {editing ? (
                <input
                  type="number"
                  value={goals[item.key]}
                  onChange={(e) => setGoals((prev) => ({ ...prev, [item.key]: Number(e.target.value) }))}
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2"
                />
              ) : null}
            </div>
          )
        })}
      </div>

      {editing ? (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSaveGoals}
            disabled={loading}
            className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save goals'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
