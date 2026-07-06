import { useState } from 'react'
import { useNutrition } from '../contexts/NutritionContext'
import FoodPhotoUploader from './FoodPhotoUploader'
import MealEditorDialog from './MealEditorDialog'

export default function MealList() {
  const { meals, removeMeal } = useNutrition()
  const [activeMeal, setActiveMeal] = useState<null | typeof meals[number]>(null)
  const [isEditing, setIsEditing] = useState(false)

  function handleEdit(meal: typeof meals[number]) {
    setActiveMeal(meal)
    setIsEditing(true)
  }

  return (
    <>
      <MealEditorDialog meal={activeMeal} open={isEditing} onClose={() => setIsEditing(false)} />
      {meals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600 shadow-sm">
          <p className="text-lg font-semibold text-slate-900">No meals added yet</p>
          <p className="mt-2 text-sm">Start building your day with a nutritious meal and track your macros instantly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meals.map((meal) => (
            <div key={meal.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-sm font-semibold text-emerald-700">
                    {meal.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{meal.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{meal.calories} kcal · {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <button type="button" onClick={() => handleEdit(meal)} className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMeal(meal.id)}
                    className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {meal.notes ? <p className="mt-4 text-sm leading-6 text-slate-700">{meal.notes}</p> : null}

              <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
                <FoodPhotoUploader mealId={meal.id} mealName={meal.name} currentUrl={meal.photoUrl} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
