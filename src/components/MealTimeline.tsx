import type { Meal } from '../types'

function formatMealTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getMealPeriod(createdAt: string) {
  const hour = new Date(createdAt).getHours()
  if (hour < 11) return 'Morning'
  if (hour < 16) return 'Afternoon'
  return 'Evening'
}

export default function MealTimeline({ meals }: { meals: Meal[] }) {
  if (meals.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
        Your meals timeline will appear here once you add your first meal.
      </div>
    )
  }

  const sortedMeals = [...meals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Daily meal timeline</p>
            <p className="mt-1 text-sm text-slate-500">Track your meals by time and macro balance.</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {sortedMeals.map((meal) => (
          <div key={meal.id} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-semibold text-emerald-700">
              {formatMealTime(meal.createdAt)}
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{meal.name}</p>
                  <p className="text-sm text-slate-500">{getMealPeriod(meal.createdAt)}</p>
                </div>
                <p className="text-sm text-slate-600">
                  {meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
                </p>
              </div>
              {meal.notes ? <p className="mt-3 text-sm text-slate-600">{meal.notes}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
