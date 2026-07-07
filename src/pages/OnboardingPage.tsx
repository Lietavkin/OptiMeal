import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import useAuth from '../hooks/useAuth'
import useProfile from '../hooks/useProfile'
import type { OnboardingData, OnboardingPrimaryGoal } from '../types'
import { completeOnboarding } from '../services/onboardingService'

type StepErrorMap = Record<string, string>

const STEP_TITLES = [
  'Body Metrics',
  'Lifestyle',
  'Food Preferences',
  'Shopping and Habits',
  'Goals and Macros',
  'Review',
]

const defaultOnboardingData: OnboardingData = {
  age: 28,
  sex: 'prefer_not_to_say',
  heightCm: 170,
  weightKg: 70,
  targetWeightKg: 68,
  activityLevel: 'moderate',
  sport: null,
  athleteType: null,
  dailySchedule: 'Standard daytime schedule with one busy block.',
  cookingSkill: 'intermediate',
  cookingTimeMinutes: 35,
  groceryBudgetWeekly: 120,
  favoriteCuisines: ['Mediterranean'],
  dislikedFoods: [],
  allergies: [],
  dietaryStyle: 'omnivore',
  preferredGroceryStores: ['Lidl'],
  preferredRestaurants: [],
  pantryHabits: 'mixed',
  mealFrequency: 3,
  macroGoal: {
    calories: 2200,
    protein: 140,
    carbs: 240,
    fat: 75,
  },
  primaryGoal: 'general_health',
}

const primaryGoalOptions: Array<{ value: OnboardingPrimaryGoal; label: string; helper: string }> = [
  { value: 'fat_loss', label: 'Fat Loss', helper: 'Reduce body fat while preserving muscle.' },
  { value: 'maintenance', label: 'Maintenance', helper: 'Maintain weight with stable energy.' },
  { value: 'muscle_gain', label: 'Muscle Gain', helper: 'Support lean mass growth and recovery.' },
  { value: 'performance', label: 'Performance', helper: 'Fuel training quality and output.' },
  { value: 'general_health', label: 'General Health', helper: 'Prioritize consistency and wellbeing.' },
]

const multiValueHints = {
  favoriteCuisines: 'Example: Mediterranean, Japanese, Mexican',
  dislikedFoods: 'Example: Mushrooms, liver, mayonnaise',
  allergies: 'Example: Peanuts, shellfish, sesame',
  preferredRestaurants: 'Example: Chipotle, Sweetgreen, local deli',
}

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatList(items: string[]) {
  return items.join(', ')
}

function validationForStep(step: number, data: OnboardingData): StepErrorMap {
  if (step === 0) {
    const errors: StepErrorMap = {}
    if (data.age < 13 || data.age > 99) errors.age = 'Age must be between 13 and 99.'
    if (data.heightCm < 120 || data.heightCm > 230) errors.heightCm = 'Height should be between 120 and 230 cm.'
    if (data.weightKg < 30 || data.weightKg > 300) errors.weightKg = 'Weight should be between 30 and 300 kg.'
    if (data.targetWeightKg < 30 || data.targetWeightKg > 300) errors.targetWeightKg = 'Target weight should be between 30 and 300 kg.'
    return errors
  }

  if (step === 1) {
    const errors: StepErrorMap = {}
    if (!data.dailySchedule.trim()) errors.dailySchedule = 'Daily schedule is required.'
    if (data.cookingTimeMinutes < 10 || data.cookingTimeMinutes > 180) errors.cookingTimeMinutes = 'Cooking time should be between 10 and 180 minutes.'
    if (data.groceryBudgetWeekly < 20 || data.groceryBudgetWeekly > 2000) errors.groceryBudgetWeekly = 'Budget should be between $20 and $2000 per week.'
    return errors
  }

  if (step === 2) {
    const errors: StepErrorMap = {}
    if (data.favoriteCuisines.length === 0) errors.favoriteCuisines = 'Add at least one favorite cuisine.'
    return errors
  }

  if (step === 3) {
    const errors: StepErrorMap = {}
    if (data.preferredGroceryStores.length === 0) errors.preferredGroceryStores = 'Select at least one preferred grocery store.'
    if (data.mealFrequency < 2 || data.mealFrequency > 8) errors.mealFrequency = 'Meal frequency should be between 2 and 8.'
    return errors
  }

  if (step === 4) {
    const errors: StepErrorMap = {}
    if (data.macroGoal.calories < 1200 || data.macroGoal.calories > 5000) errors.calories = 'Calories should be between 1200 and 5000.'
    if (data.macroGoal.protein < 40 || data.macroGoal.protein > 350) errors.protein = 'Protein should be between 40 and 350g.'
    if (data.macroGoal.carbs < 50 || data.macroGoal.carbs > 700) errors.carbs = 'Carbs should be between 50 and 700g.'
    if (data.macroGoal.fat < 20 || data.macroGoal.fat > 250) errors.fat = 'Fat should be between 20 and 250g.'
    return errors
  }

  return {}
}

function StepProgress({ step }: { step: number }) {
  const progress = Math.round(((step + 1) / STEP_TITLES.length) * 100)

  return (
    <div aria-label="Onboarding progress" className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        <span>Step {step + 1} of {STEP_TITLES.length}</span>
        <span>{progress}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 16 }}
        />
      </div>
      <p className="text-sm font-medium text-slate-700">{STEP_TITLES[step]}</p>
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, saveProfile } = useProfile()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData)
  const [errors, setErrors] = useState<StepErrorMap>({})
  const [globalError, setGlobalError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [insightSummary, setInsightSummary] = useState('')
  const [weeklyStrategy, setWeeklyStrategy] = useState('')

  const storageKey = useMemo(() => (user ? `optimeal:onboarding:${user.id}` : ''), [user])

  useEffect(() => {
    if (!profile) return
    if (profile.onboarding_completed_at) {
      navigate('/dashboard', { replace: true })
      return
    }

    const fromProfile = profile.onboarding_data
    if (fromProfile && typeof fromProfile === 'object' && Object.keys(fromProfile).length > 0) {
      setData({
        ...defaultOnboardingData,
        ...fromProfile,
        macroGoal: {
          ...defaultOnboardingData.macroGoal,
          ...fromProfile.macroGoal,
        },
      })
    }
  }, [profile, navigate])

  useEffect(() => {
    if (!storageKey) return
    const raw = localStorage.getItem(storageKey)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as OnboardingData
      setData((prev) => ({
        ...prev,
        ...parsed,
        macroGoal: {
          ...prev.macroGoal,
          ...parsed.macroGoal,
        },
      }))
    } catch {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(data))
  }, [data, storageKey])

  function nextStep() {
    const stepErrors = validationForStep(step, data)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return
    setStep((value) => Math.min(STEP_TITLES.length - 1, value + 1))
  }

  function previousStep() {
    setStep((value) => Math.max(0, value - 1))
  }

  async function handleFinish() {
    if (!user) return

    const stepErrors = validationForStep(4, data)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) {
      setStep(4)
      return
    }

    setGlobalError('')
    setIsSubmitting(true)

    try {
      const result = await completeOnboarding(user.id, data)
      setInsightSummary(result.summary)
      setWeeklyStrategy(result.weeklyStrategy)

      await saveProfile({
        onboarding_data: data,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_ai_summary: result.summary,
        onboarding_weekly_strategy: result.weeklyStrategy,
      })

      if (storageKey) localStorage.removeItem(storageKey)
      setIsCompleted(true)
      window.setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1600)
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Unable to complete onboarding right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const cardBase = 'rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-900/5 sm:p-8'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.2),transparent_35%),#f8fafc] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <StepProgress step={step} />

        <motion.section layout className={cardBase}>
          <div className="mb-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Personalized setup</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Build your nutrition blueprint</h1>
            <p className="text-sm leading-6 text-slate-600">
              Tell us about your routine and preferences so OptiMeal can generate a strategy designed for real life.
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-5"
            >
              {step === 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      Age
                      <input
                        type="number"
                        min={13}
                        max={99}
                        value={data.age}
                        onChange={(event) => setData((prev) => ({ ...prev, age: Number(event.target.value) }))}
                        aria-invalid={Boolean(errors.age)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.age ? <span className="mt-1 block text-xs text-rose-600">{errors.age}</span> : null}
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Sex
                      <select
                        value={data.sex}
                        onChange={(event) => setData((prev) => ({ ...prev, sex: event.target.value as OnboardingData['sex'] }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="non_binary">Non-binary</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Height (cm)
                      <input
                        type="number"
                        min={120}
                        max={230}
                        value={data.heightCm}
                        onChange={(event) => setData((prev) => ({ ...prev, heightCm: Number(event.target.value) }))}
                        aria-invalid={Boolean(errors.heightCm)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.heightCm ? <span className="mt-1 block text-xs text-rose-600">{errors.heightCm}</span> : null}
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Weight (kg)
                      <input
                        type="number"
                        min={30}
                        max={300}
                        value={data.weightKg}
                        onChange={(event) => setData((prev) => ({ ...prev, weightKg: Number(event.target.value) }))}
                        aria-invalid={Boolean(errors.weightKg)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.weightKg ? <span className="mt-1 block text-xs text-rose-600">{errors.weightKg}</span> : null}
                    </label>

                    <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                      Target weight (kg)
                      <input
                        type="number"
                        min={30}
                        max={300}
                        value={data.targetWeightKg}
                        onChange={(event) => setData((prev) => ({ ...prev, targetWeightKg: Number(event.target.value) }))}
                        aria-invalid={Boolean(errors.targetWeightKg)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.targetWeightKg ? <span className="mt-1 block text-xs text-rose-600">{errors.targetWeightKg}</span> : null}
                    </label>
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      Activity level
                      <select
                        value={data.activityLevel}
                        onChange={(event) => setData((prev) => ({ ...prev, activityLevel: event.target.value as OnboardingData['activityLevel'] }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <option value="sedentary">Sedentary</option>
                        <option value="light">Lightly active</option>
                        <option value="moderate">Moderately active</option>
                        <option value="very_active">Very active</option>
                        <option value="athlete">Athlete-level</option>
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Cooking skill
                      <select
                        value={data.cookingSkill}
                        onChange={(event) => setData((prev) => ({ ...prev, cookingSkill: event.target.value as OnboardingData['cookingSkill'] }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Sport (optional)
                      <input
                        type="text"
                        value={data.sport ?? ''}
                        onChange={(event) => setData((prev) => ({ ...prev, sport: event.target.value || null }))}
                        placeholder="Running, football, crossfit..."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Athlete type (optional)
                      <input
                        type="text"
                        value={data.athleteType ?? ''}
                        onChange={(event) => setData((prev) => ({ ...prev, athleteType: event.target.value || null }))}
                        placeholder="Endurance, strength, mixed..."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                      Daily schedule
                      <textarea
                        value={data.dailySchedule}
                        onChange={(event) => setData((prev) => ({ ...prev, dailySchedule: event.target.value }))}
                        rows={3}
                        aria-invalid={Boolean(errors.dailySchedule)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.dailySchedule ? <span className="mt-1 block text-xs text-rose-600">{errors.dailySchedule}</span> : null}
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Cooking time per day (minutes)
                      <input
                        type="number"
                        min={10}
                        max={180}
                        value={data.cookingTimeMinutes}
                        onChange={(event) => setData((prev) => ({ ...prev, cookingTimeMinutes: Number(event.target.value) }))}
                        aria-invalid={Boolean(errors.cookingTimeMinutes)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.cookingTimeMinutes ? <span className="mt-1 block text-xs text-rose-600">{errors.cookingTimeMinutes}</span> : null}
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Grocery budget per week ($)
                      <input
                        type="number"
                        min={20}
                        max={2000}
                        value={data.groceryBudgetWeekly}
                        onChange={(event) => setData((prev) => ({ ...prev, groceryBudgetWeekly: Number(event.target.value) }))}
                        aria-invalid={Boolean(errors.groceryBudgetWeekly)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.groceryBudgetWeekly ? <span className="mt-1 block text-xs text-rose-600">{errors.groceryBudgetWeekly}</span> : null}
                    </label>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-4">
                  <label className="text-sm font-medium text-slate-700">
                    Favorite cuisines
                    <input
                      type="text"
                      value={formatList(data.favoriteCuisines)}
                      onChange={(event) => setData((prev) => ({ ...prev, favoriteCuisines: parseList(event.target.value) }))}
                      placeholder={multiValueHints.favoriteCuisines}
                      aria-invalid={Boolean(errors.favoriteCuisines)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    />
                    {errors.favoriteCuisines ? <span className="mt-1 block text-xs text-rose-600">{errors.favoriteCuisines}</span> : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Disliked foods
                    <input
                      type="text"
                      value={formatList(data.dislikedFoods)}
                      onChange={(event) => setData((prev) => ({ ...prev, dislikedFoods: parseList(event.target.value) }))}
                      placeholder={multiValueHints.dislikedFoods}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Allergies
                    <input
                      type="text"
                      value={formatList(data.allergies)}
                      onChange={(event) => setData((prev) => ({ ...prev, allergies: parseList(event.target.value) }))}
                      placeholder={multiValueHints.allergies}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Dietary style
                    <select
                      value={data.dietaryStyle}
                      onChange={(event) => setData((prev) => ({ ...prev, dietaryStyle: event.target.value as OnboardingData['dietaryStyle'] }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <option value="omnivore">Omnivore</option>
                      <option value="flexitarian">Flexitarian</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="keto">Keto</option>
                      <option value="mediterranean">Mediterranean</option>
                      <option value="pescatarian">Pescatarian</option>
                      <option value="paleo">Paleo</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    Preferred grocery stores
                    <input
                      type="text"
                      value={formatList(data.preferredGroceryStores)}
                      onChange={(event) => setData((prev) => ({ ...prev, preferredGroceryStores: parseList(event.target.value) }))}
                      placeholder="Lidl, Tesco, Carrefour"
                      aria-invalid={Boolean(errors.preferredGroceryStores)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    />
                    {errors.preferredGroceryStores ? <span className="mt-1 block text-xs text-rose-600">{errors.preferredGroceryStores}</span> : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    Preferred restaurants
                    <input
                      type="text"
                      value={formatList(data.preferredRestaurants)}
                      onChange={(event) => setData((prev) => ({ ...prev, preferredRestaurants: parseList(event.target.value) }))}
                      placeholder={multiValueHints.preferredRestaurants}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Pantry habits
                    <select
                      value={data.pantryHabits}
                      onChange={(event) => setData((prev) => ({ ...prev, pantryHabits: event.target.value as OnboardingData['pantryHabits'] }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <option value="fresh_often">Buy fresh often</option>
                      <option value="weekly_prep">Weekly prep</option>
                      <option value="bulk_storage">Bulk storage</option>
                      <option value="mixed">Mixed routine</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Meal frequency (meals/day)
                    <input
                      type="number"
                      min={2}
                      max={8}
                      value={data.mealFrequency}
                      onChange={(event) => setData((prev) => ({ ...prev, mealFrequency: Number(event.target.value) }))}
                      aria-invalid={Boolean(errors.mealFrequency)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    />
                    {errors.mealFrequency ? <span className="mt-1 block text-xs text-rose-600">{errors.mealFrequency}</span> : null}
                  </label>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-5">
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-slate-900">Primary goal</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {primaryGoalOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`rounded-2xl border p-4 transition ${data.primaryGoal === option.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            name="primary-goal"
                            value={option.value}
                            checked={data.primaryGoal === option.value}
                            onChange={() => setData((prev) => ({ ...prev, primaryGoal: option.value }))}
                          />
                          <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                          <p className="mt-1 text-xs text-slate-600">{option.helper}</p>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      Calories
                      <input
                        type="number"
                        min={1200}
                        max={5000}
                        value={data.macroGoal.calories}
                        onChange={(event) =>
                          setData((prev) => ({ ...prev, macroGoal: { ...prev.macroGoal, calories: Number(event.target.value) } }))
                        }
                        aria-invalid={Boolean(errors.calories)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.calories ? <span className="mt-1 block text-xs text-rose-600">{errors.calories}</span> : null}
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Protein (g)
                      <input
                        type="number"
                        min={40}
                        max={350}
                        value={data.macroGoal.protein}
                        onChange={(event) =>
                          setData((prev) => ({ ...prev, macroGoal: { ...prev.macroGoal, protein: Number(event.target.value) } }))
                        }
                        aria-invalid={Boolean(errors.protein)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.protein ? <span className="mt-1 block text-xs text-rose-600">{errors.protein}</span> : null}
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Carbs (g)
                      <input
                        type="number"
                        min={50}
                        max={700}
                        value={data.macroGoal.carbs}
                        onChange={(event) =>
                          setData((prev) => ({ ...prev, macroGoal: { ...prev.macroGoal, carbs: Number(event.target.value) } }))
                        }
                        aria-invalid={Boolean(errors.carbs)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.carbs ? <span className="mt-1 block text-xs text-rose-600">{errors.carbs}</span> : null}
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Fat (g)
                      <input
                        type="number"
                        min={20}
                        max={250}
                        value={data.macroGoal.fat}
                        onChange={(event) =>
                          setData((prev) => ({ ...prev, macroGoal: { ...prev.macroGoal, fat: Number(event.target.value) } }))
                        }
                        aria-invalid={Boolean(errors.fat)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      />
                      {errors.fat ? <span className="mt-1 block text-xs text-rose-600">{errors.fat}</span> : null}
                    </label>
                  </div>
                </div>
              ) : null}

              {step === 5 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <h2 className="text-base font-semibold text-slate-900">Review snapshot</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {data.age} years old, {data.activityLevel.replace('_', ' ')} lifestyle, goal: {data.primaryGoal.replace('_', ' ')},
                      {` `}daily target {data.macroGoal.calories} kcal ({data.macroGoal.protein}P / {data.macroGoal.carbs}C / {data.macroGoal.fat}F).
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Weekly budget ${data.groceryBudgetWeekly}, meal frequency {data.mealFrequency}, dietary style {data.dietaryStyle}.
                    </p>
                  </div>

                  <p className="text-sm text-slate-600">
                    Finish onboarding to generate your AI profile summary and first weekly strategy, then continue to your dashboard.
                  </p>

                  {insightSummary ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <h3 className="text-sm font-semibold text-emerald-900">AI Summary</h3>
                      <p className="mt-2 text-sm text-emerald-900/90">{insightSummary}</p>
                    </div>
                  ) : null}

                  {weeklyStrategy ? (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                      <h3 className="text-sm font-semibold text-sky-900">Week 1 Strategy</h3>
                      <p className="mt-2 text-sm text-sky-900/90">{weeklyStrategy}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={previousStep} disabled={step === 0 || isSubmitting || isCompleted}>
              Back
            </Button>

            {step < STEP_TITLES.length - 1 ? (
              <Button onClick={nextStep} disabled={isSubmitting || isCompleted}>Continue</Button>
            ) : (
              <Button onClick={handleFinish} disabled={isSubmitting || isCompleted}>
                {isSubmitting ? 'Creating your strategy...' : isCompleted ? 'Success! Redirecting...' : 'Finish onboarding'}
              </Button>
            )}
          </div>

          <div aria-live="polite" className="mt-3 min-h-6">
            {globalError ? <p className="text-sm text-rose-600">{globalError}</p> : null}
            {isCompleted ? <p className="text-sm text-emerald-700">Onboarding complete. Taking you to your dashboard.</p> : null}
          </div>
        </motion.section>
      </div>
    </div>
  )
}
