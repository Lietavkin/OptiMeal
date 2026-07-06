import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import Button from '../components/Button'
import DashboardLayout from '../components/DashboardLayout'
import PlannedMealEditorDialog from '../components/PlannedMealEditorDialog'
import { PlannerProvider } from '../contexts/PlannerContext'
import usePlanner from '../hooks/usePlanner'
import { formatMealSlot, getDayLabel } from '../services/plannerService'
import type { PlannedMeal } from '../types'

function PlannerContent() {
  const { plan, loading, generating, regeneratingId, generatePlan, regenerateMeal, updatePlannedMeal } = usePlanner()
  const [editingMeal, setEditingMeal] = useState<PlannedMeal | null>(null)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setError('')
    try {
      await generatePlan()
    } catch {
      setError('Could not generate your meal plan. Please try again.')
    }
  }

  async function handleRegenerate(meal: PlannedMeal) {
    setError('')
    try {
      await regenerateMeal(meal)
    } catch {
      setError('Could not regenerate this meal. Please try again.')
    }
  }

  const mealsByDay = Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    label: getDayLabel(dayIndex),
    meals: (plan?.meals ?? []).filter((m) => m.dayIndex === dayIndex),
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-sky-500 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100">Weekly planner</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your 7-day meal plan</h1>
            <p className="mt-3 max-w-2xl text-sm text-emerald-100/90">
              AI-powered meals tailored to your goals. Generate, edit, or refresh individual slots anytime.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="bg-white text-slate-950 hover:bg-slate-100"
          >
            {generating ? 'Generating…' : plan ? 'Regenerate week' : 'Generate plan'}
          </Button>
        </div>
        {plan ? (
          <p className="text-sm text-emerald-100/90">
            Week of {new Date(plan.weekStart + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        ) : null}
      </div>

      {error ? <p className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your plan…</p>
      ) : !plan ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No meal plan yet</p>
          <p className="mt-2 text-sm text-slate-500">Generate a full week of breakfast, lunch, and dinner suggestions based on your nutrition goals.</p>
          <div className="mt-6">
            <Button type="button" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate 7-day plan'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {mealsByDay.map((day) => (
            <section key={day.dayIndex} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">{day.label}</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {day.meals.map((meal) => (
                  <article key={meal.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{formatMealSlot(meal.mealSlot)}</p>
                        <p className="mt-2 font-semibold text-slate-900">{meal.name}</p>
                      </div>
                    </div>
                    {meal.description ? <p className="mt-2 text-sm text-slate-600">{meal.description}</p> : null}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                      <span>{meal.calories} kcal</span>
                      <span>{meal.protein}g P</span>
                      <span>{meal.carbs}g C</span>
                      <span>{meal.fat}g F</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" className="px-4 py-2 text-xs" onClick={() => setEditingMeal(meal)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="gap-2 px-4 py-2 text-xs"
                        onClick={() => handleRegenerate(meal)}
                        disabled={regeneratingId === meal.id}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${regeneratingId === meal.id ? 'animate-spin' : ''}`} />
                        {regeneratingId === meal.id ? 'Refreshing…' : 'Regenerate'}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PlannedMealEditorDialog
        meal={editingMeal}
        open={Boolean(editingMeal)}
        onClose={() => setEditingMeal(null)}
        onSave={updatePlannedMeal}
      />
    </motion.div>
  )
}

export default function PlannerPage() {
  return (
    <DashboardLayout>
      <PlannerProvider>
        <PlannerContent />
      </PlannerProvider>
    </DashboardLayout>
  )
}
