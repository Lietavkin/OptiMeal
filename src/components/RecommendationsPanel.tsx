import { useEffect, useState } from 'react'
import { useNutrition } from '../contexts/NutritionContext'
import useProfile from '../hooks/useProfile'
import { getMealRecommendations, type MealRecommendation } from '../services/aiService'
import Button from './Button'

export default function RecommendationsPanel() {
  const { summary, addMeal } = useNutrition()
  const { profile } = useProfile()
  const [saving, setSaving] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getMealRecommendations(profile, summary)
      .then((items) => {
        if (!cancelled) setRecommendations(items)
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to get recommendations', error)
        if (!cancelled) setRecommendations([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [profile, summary])

  async function handleAdd(recommendationName: string, calories: number, protein: number, carbs: number, fat: number) {
    setSaving(recommendationName)
    try {
      await addMeal({
        name: recommendationName,
        calories,
        protein,
        carbs,
        fat,
        notes: 'AI suggestion to round out your day',
        photoUrl: null,
        photoPath: null,
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add recommendation', error)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">AI meal recommendations</p>
          <p className="mt-1 text-sm text-slate-500">Smart suggestions based on your goals and today's intake.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {loading ? 'Loading...' : `${recommendations.length} suggestions`}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {!loading && recommendations.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No recommendations available right now.</p>
        ) : null}
        {recommendations.map((item) => (
          <div key={item.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              </div>
              <Button
                variant="solid"
                onClick={() => handleAdd(item.name, item.calories, item.protein, item.carbs, item.fat)}
                disabled={saving === item.name}
              >
                {saving === item.name ? 'Adding…' : 'Add'}
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 sm:grid-cols-4">
              <span>{item.calories} kcal</span>
              <span>{item.protein}g protein</span>
              <span>{item.carbs}g carbs</span>
              <span>{item.fat}g fat</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
