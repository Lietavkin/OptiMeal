import { type FormEvent, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import useProfile from '../hooks/useProfile'

type GoalValidationErrorMap = {
  calories?: string
  protein?: string
  carbs?: string
  fat?: string
}

function validateGoal(value: number, label: string, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return `${label} must be a valid number.`
  }
  if (value < min || value > max) {
    return `${label} must be between ${min} and ${max}.`
  }
  return ''
}

function validateGoals(calories: number, protein: number, carbs: number, fat: number): GoalValidationErrorMap {
  const errors: GoalValidationErrorMap = {}

  const caloriesError = validateGoal(calories, 'Daily calories goal', 1200, 5000)
  if (caloriesError) errors.calories = caloriesError

  const proteinError = validateGoal(protein, 'Daily protein goal', 40, 350)
  if (proteinError) errors.protein = proteinError

  const carbsError = validateGoal(carbs, 'Daily carbs goal', 50, 700)
  if (carbsError) errors.carbs = carbsError

  const fatError = validateGoal(fat, 'Daily fat goal', 20, 250)
  if (fatError) errors.fat = fatError

  return errors
}

export default function ProfilePage() {
  const { profile, loading, saveProfile } = useProfile()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [calories, setCalories] = useState<number>(profile?.daily_calories_goal ?? 2000)
  const [protein, setProtein] = useState<number>(profile?.daily_protein_goal ?? 100)
  const [carbs, setCarbs] = useState<number>(profile?.daily_carbs_goal ?? 250)
  const [fat, setFat] = useState<number>(profile?.daily_fat_goal ?? 70)
  const [errors, setErrors] = useState<GoalValidationErrorMap>({})
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(profile?.display_name ?? '')
    setCalories(profile?.daily_calories_goal ?? 2000)
    setProtein(profile?.daily_protein_goal ?? 100)
    setCarbs(profile?.daily_carbs_goal ?? 250)
    setFat(profile?.daily_fat_goal ?? 70)
  }, [profile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    const validationErrors = validateGoals(calories, protein, carbs, fat)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setFormError('Please fix the highlighted nutrition goals before saving.')
      return
    }

    setIsSaving(true)
    try {
      await saveProfile({ display_name: name.trim(), daily_calories_goal: calories, daily_protein_goal: protein, daily_carbs_goal: carbs, daily_fat_goal: fat })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save profile right now. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl rounded-2xl bg-white p-8">
        <h2 className="text-2xl font-semibold">Profile</h2>
        {loading ? <p className="text-sm text-slate-500 mt-4">Loading…</p> : null}
        {formError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p> : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Daily calories goal</label>
              <input
                type="number"
                value={calories}
                min={1200}
                max={5000}
                onChange={(e) => setCalories(e.currentTarget.valueAsNumber)}
                aria-invalid={Boolean(errors.calories)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
              {errors.calories ? <p className="mt-1 text-xs text-rose-600">{errors.calories}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Daily protein goal</label>
              <input
                type="number"
                value={protein}
                min={40}
                max={350}
                onChange={(e) => setProtein(e.currentTarget.valueAsNumber)}
                aria-invalid={Boolean(errors.protein)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
              {errors.protein ? <p className="mt-1 text-xs text-rose-600">{errors.protein}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Daily carbs goal</label>
              <input
                type="number"
                value={carbs}
                min={50}
                max={700}
                onChange={(e) => setCarbs(e.currentTarget.valueAsNumber)}
                aria-invalid={Boolean(errors.carbs)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
              {errors.carbs ? <p className="mt-1 text-xs text-rose-600">{errors.carbs}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Daily fat goal</label>
              <input
                type="number"
                value={fat}
                min={20}
                max={250}
                onChange={(e) => setFat(e.currentTarget.valueAsNumber)}
                aria-invalid={Boolean(errors.fat)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              />
              {errors.fat ? <p className="mt-1 text-xs text-rose-600">{errors.fat}</p> : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save profile'}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
