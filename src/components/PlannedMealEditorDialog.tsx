import { useEffect, useState } from 'react'
import type { PlannedMeal } from '../types'
import Button from './Button'

export default function PlannedMealEditorDialog({
  meal,
  open,
  onClose,
  onSave,
}: {
  meal: PlannedMeal | null
  open: boolean
  onClose: () => void
  onSave: (id: string, patch: Partial<PlannedMeal>) => Promise<void>
}) {
  const [name, setName] = useState(meal?.name ?? '')
  const [calories, setCalories] = useState(meal?.calories ?? 0)
  const [protein, setProtein] = useState(meal?.protein ?? 0)
  const [carbs, setCarbs] = useState(meal?.carbs ?? 0)
  const [fat, setFat] = useState(meal?.fat ?? 0)
  const [description, setDescription] = useState(meal?.description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(meal?.name ?? '')
    setCalories(meal?.calories ?? 0)
    setProtein(meal?.protein ?? 0)
    setCarbs(meal?.carbs ?? 0)
    setFat(meal?.fat ?? 0)
    setDescription(meal?.description ?? '')
  }, [meal])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!meal) return
    setError('')
    if (!name.trim()) {
      setError('Meal name is required.')
      return
    }
    if ([calories, protein, carbs, fat].some((v) => Number.isNaN(v) || v < 0)) {
      setError('Calories and macros must be zero or positive numbers.')
      return
    }
    setSubmitting(true)
    try {
      await onSave(meal.id, { name: name.trim(), calories, protein, carbs, fat, description })
      onClose()
    } catch {
      setError('Could not save meal changes. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !meal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Edit planned meal</h3>
            <p className="text-sm text-slate-500">Update meal details and macros.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 transition hover:text-slate-900">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          <div>
            <label className="block text-sm font-medium text-slate-700">Meal name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" required />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Calories', value: calories, setter: setCalories },
              { label: 'Protein', value: protein, setter: setProtein },
              { label: 'Carbs', value: carbs, setter: setCarbs },
              { label: 'Fat', value: fat, setter: setFat },
            ].map((item) => (
              <div key={item.label}>
                <label className="block text-sm text-slate-600">{item.label}</label>
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => item.setter(Number(e.target.value))}
                  min={0}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
            <button type="button" onClick={onClose} className="w-full rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 sm:w-auto">
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
