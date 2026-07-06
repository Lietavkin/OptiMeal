import { useState } from 'react'
import { useNutrition } from '../contexts/NutritionContext'

export default function MealForm() {
  const { addMeal } = useNutrition()
  const [name, setName] = useState('')
  const [calories, setCalories] = useState<number>(400)
  const [protein, setProtein] = useState<number>(20)
  const [carbs, setCarbs] = useState<number>(40)
  const [fat, setFat] = useState<number>(15)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function hasInvalidMacros() {
    return [calories, protein, carbs, fat].some((v) => Number.isNaN(v) || v < 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Meal name is required.')
      return
    }
    if (hasInvalidMacros()) {
      setError('Calories and macros must be zero or positive numbers.')
      return
    }
    setSubmitting(true)
    try {
      await addMeal({ name: name.trim(), calories, protein, carbs, fat, notes, photoUrl: null, photoPath: null })
      setName('')
      setNotes('')
      setCalories(400)
      setProtein(20)
      setCarbs(40)
      setFat(15)
    } catch (error) {
      setError('Could not add meal. Please try again.')
      // eslint-disable-next-line no-console
      console.error('Failed to add meal', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      <div>
        <label className="block text-sm font-medium text-slate-700">Meal name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Chicken salad"
          required
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-sm text-slate-600">Calories</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            min={0}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Protein (g)</label>
          <input
            type="number"
            value={protein}
            onChange={(e) => setProtein(Number(e.target.value))}
            min={0}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Carbs (g)</label>
          <input
            type="number"
            value={carbs}
            onChange={(e) => setCarbs(Number(e.target.value))}
            min={0}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Fat (g)</label>
          <input
            type="number"
            value={fat}
            onChange={(e) => setFat(Number(e.target.value))}
            min={0}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'Adding…' : 'Add meal'}
        </button>
        <button
          type="button"
          onClick={() => {
            setName('')
            setNotes('')
            setCalories(400)
            setProtein(20)
            setCarbs(40)
            setFat(15)
          }}
          className="inline-flex items-center rounded-full border px-4 py-2"
        >
          Reset
        </button>
      </div>
    </form>
  )
}
