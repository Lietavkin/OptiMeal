import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/DashboardLayout'
import Button from '../components/Button'
import useAuth from '../hooks/useAuth'
import type { AICoachAction, AICoachDashboard, AICoachRecommendation, AthleteDayType } from '../types'
import { applyCoachRecommendationAction, getAICoachDashboard } from '../services/aiCoachService'
import { upsertDailyCheckin } from '../services/aiCoachStoreService'

type CheckinDraft = {
  athleteDayType: AthleteDayType
  hunger: number
  energy: number
  sleep: number
  mood: number
  recovery: number
  stress: number | null
  waterMl: number
  weightKg: string
}

const adviceTypeLabel: Record<AICoachRecommendation['adviceType'], string> = {
  daily: 'Daily advice',
  weekly: 'Weekly advice',
  budget: 'Budget advice',
  shopping: 'Shopping advice',
  restaurant: 'Restaurant advice',
  recovery: 'Recovery advice',
}

function StatCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  )
}

function confidenceTone(value: number) {
  if (value >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (value >= 65) return 'text-sky-700 bg-sky-50 border-sky-200'
  return 'text-amber-700 bg-amber-50 border-amber-200'
}

export default function AICoachPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<AICoachDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingCheckin, setSavingCheckin] = useState(false)
  const [activeRecommendationId, setActiveRecommendationId] = useState<string | null>(null)

  const [checkinDraft, setCheckinDraft] = useState<CheckinDraft>({
    athleteDayType: 'training',
    hunger: 3,
    energy: 3,
    sleep: 3,
    mood: 3,
    recovery: 3,
    stress: null,
    waterMl: 0,
    weightKg: '',
  })

  const dateIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  async function load() {
    if (!user) return
    setLoading(true)
    setError('')

    try {
      const data = await getAICoachDashboard(user.id, dateIso)
      setDashboard(data)
      setCheckinDraft({
        athleteDayType: data.checkin.athleteDayType,
        hunger: data.checkin.hunger,
        energy: data.checkin.energy,
        sleep: data.checkin.sleep,
        mood: data.checkin.mood,
        recovery: data.checkin.recovery,
        stress: data.checkin.stress,
        waterMl: data.checkin.waterMl,
        weightKg: data.checkin.weightKg == null ? '' : String(data.checkin.weightKg),
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your AI coach at the moment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [user])

  async function handleSaveCheckin() {
    if (!user) return

    setSavingCheckin(true)
    setError('')

    try {
      await upsertDailyCheckin(user.id, {
        entryDate: dateIso,
        athleteDayType: checkinDraft.athleteDayType,
        hunger: checkinDraft.hunger,
        energy: checkinDraft.energy,
        sleep: checkinDraft.sleep,
        mood: checkinDraft.mood,
        recovery: checkinDraft.recovery,
        stress: checkinDraft.stress,
        waterMl: checkinDraft.waterMl,
        weightKg: checkinDraft.weightKg ? Number(checkinDraft.weightKg) : null,
      })

      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your check-in right now.')
    } finally {
      setSavingCheckin(false)
    }
  }

  async function handleRecommendationAction(recommendation: AICoachRecommendation, action: AICoachAction) {
    if (!user) return

    setActiveRecommendationId(recommendation.id)
    setError('')

    try {
      const created = await applyCoachRecommendationAction({
        userId: user.id,
        recommendation,
        action,
      })

      setDashboard((prev) => {
        if (!prev) return prev

        const nextStatus: AICoachRecommendation['status'] =
          action === 'accept' ? 'accepted' : action === 'ignore' ? 'ignored' : 'replaced'

        const updatedRecommendations = prev.recommendations.map((item) => {
          if (item.id !== recommendation.id) return item
          return { ...item, status: nextStatus }
        })

        return {
          ...prev,
          recommendations: [...created, ...updatedRecommendations],
        }
      })
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to process recommendation action.')
    } finally {
      setActiveRecommendationId(null)
    }
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-5 py-6 text-white shadow-xl shadow-slate-900/20 sm:px-8 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">AI Coach</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your Adaptive Nutrition Coach</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-200">
            Daily coaching built from your onboarding profile, meals, pantry, restaurants, and optimization signals.
          </p>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-600">Loading your AI coaching dashboard...</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        ) : null}

        {dashboard && !loading ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard title="Today's nutrition score" value={`${dashboard.todayNutritionScore.toFixed(0)}%`} helper="Composite score from macros, check-in, and adherence" />
              <StatCard title="Remaining calories/macros" value={`${dashboard.remaining.calories.toFixed(0)} kcal`} helper={`${dashboard.remaining.protein.toFixed(0)}P / ${dashboard.remaining.carbs.toFixed(0)}C / ${dashboard.remaining.fat.toFixed(0)}F`} />
              <StatCard title="Meals completed" value={`${dashboard.mealsCompleted}`} helper="Meals logged today" />
              <StatCard title="Water intake" value={`${dashboard.waterIntakeMl} ml`} helper="Track hydration for recovery and appetite control" />
              <StatCard title="Weight trend" value={`${dashboard.weightTrendKg >= 0 ? '+' : ''}${dashboard.weightTrendKg.toFixed(2)} kg`} helper="7-day trend from daily check-ins" />
              <StatCard title="Adherence score" value={`${dashboard.adherenceScore.toFixed(0)}%`} helper="How closely your actions match plan targets" />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Daily check-in</h2>
                  <p className="mt-1 text-sm text-slate-600">Update athlete mode and recovery inputs to personalize coaching.</p>
                </div>
                <Button onClick={handleSaveCheckin} disabled={savingCheckin}>{savingCheckin ? 'Saving...' : 'Save check-in'}</Button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Athlete mode
                  <select
                    value={checkinDraft.athleteDayType}
                    onChange={(event) => setCheckinDraft((prev) => ({ ...prev, athleteDayType: event.target.value as AthleteDayType }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <option value="training">Training day</option>
                    <option value="recovery">Recovery day</option>
                    <option value="rest">Rest day</option>
                    <option value="match">Match/Game day</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Water (ml)
                  <input
                    type="number"
                    min={0}
                    value={checkinDraft.waterMl}
                    onChange={(event) => setCheckinDraft((prev) => ({ ...prev, waterMl: Number(event.target.value) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Weight (kg)
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={checkinDraft.weightKg}
                    onChange={(event) => setCheckinDraft((prev) => ({ ...prev, weightKg: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>

                {([
                  ['hunger', 'Hunger'],
                  ['energy', 'Energy'],
                  ['sleep', 'Sleep'],
                  ['mood', 'Mood'],
                  ['recovery', 'Recovery'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="text-sm font-medium text-slate-700">
                    {label}: {checkinDraft[key]}/5
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={checkinDraft[key]}
                      onChange={(event) => setCheckinDraft((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
                      className="mt-2 w-full accent-emerald-600"
                    />
                  </label>
                ))}

                <label className="text-sm font-medium text-slate-700">
                  Stress (optional): {checkinDraft.stress == null ? 'not set' : `${checkinDraft.stress}/5`}
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={checkinDraft.stress ?? 3}
                    onChange={(event) => setCheckinDraft((prev) => ({ ...prev, stress: Number(event.target.value) }))}
                    className="mt-2 w-full accent-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setCheckinDraft((prev) => ({ ...prev, stress: null }))}
                    className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 hover:text-slate-700"
                  >
                    Clear stress
                  </button>
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Natural-language AI recommendations</h2>
                <p className="mt-1 text-sm text-slate-600">Each recommendation includes rationale and confidence, with controls to teach your coach over time.</p>
              </div>

              <div className="grid gap-4">
                {dashboard.recommendations.map((recommendation) => (
                  <article key={recommendation.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{adviceTypeLabel[recommendation.adviceType]}</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">{recommendation.title}</h3>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${confidenceTone(recommendation.confidence)}`}>
                        Confidence {recommendation.confidence.toFixed(0)}%
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-700">{recommendation.message}</p>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why this recommendation</p>
                      <p className="mt-1 text-sm text-slate-700">{recommendation.why}</p>
                    </div>

                    <div className="mt-3 rounded-2xl bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Expected benefit</p>
                      <p className="mt-1 text-sm text-emerald-900">{recommendation.expectedBenefit}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleRecommendationAction(recommendation, 'accept')}
                        disabled={activeRecommendationId === recommendation.id || recommendation.status !== 'pending'}
                        className="px-4 py-2"
                      >
                        Accept recommendation
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRecommendationAction(recommendation, 'ignore')}
                        disabled={activeRecommendationId === recommendation.id || recommendation.status !== 'pending'}
                        className="px-4 py-2"
                      >
                        Ignore
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRecommendationAction(recommendation, 'replace_meal')}
                        disabled={activeRecommendationId === recommendation.id}
                        className="px-4 py-2"
                      >
                        Replace meal
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRecommendationAction(recommendation, 'regenerate')}
                        disabled={activeRecommendationId === recommendation.id}
                        className="px-4 py-2"
                      >
                        Regenerate recommendation
                      </Button>
                    </div>

                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Status: {recommendation.status}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </motion.div>
    </DashboardLayout>
  )
}
