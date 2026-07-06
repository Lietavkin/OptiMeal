import { type ChangeEvent, useState } from 'react'
import { useNutrition } from '../contexts/NutritionContext'
import { uploadMealPhoto } from '../services/storageService'
import useAuth from '../hooks/useAuth'
import { analyzeFoodImage, type FoodAnalysis } from '../services/aiService'

export default function FoodPhotoUploader({ mealId, mealName, currentUrl }: { mealId: string; mealName: string; currentUrl?: string | null }) {
  const { updateMeal } = useNutrition()
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [imageBroken, setImageBroken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null)

  const { user } = useAuth()

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      if (!user) throw new Error('Not authenticated')
      const { publicUrl, storagePath } = await uploadMealPhoto(user.id, mealId, file as File)
      setImageBroken(false)
      setPreview(publicUrl)
      await updateMeal(mealId, { photoUrl: publicUrl, photoPath: storagePath })
      setAnalysis(await analyzeFoodImage({ mealName, fileName: file.name, imageUrl: publicUrl }))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to upload photo', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">Food photo</p>
        <p className="mt-1 text-sm text-slate-500">Upload a photo and get instant AI analysis.</p>
      </div>
      <input type="file" accept="image/*" onChange={handleFile} className="w-full text-sm text-slate-700" />
      {loading ? <p className="text-sm text-slate-500">Uploading…</p> : null}
      {preview && !imageBroken ? (
        <img
          src={preview}
          alt="preview"
          className="mt-2 w-full max-h-44 rounded-3xl object-cover"
          onError={() => setImageBroken(true)}
        />
      ) : null}
      {preview && imageBroken ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Photo could not be loaded. Try uploading the image again.</p>
      ) : null}
      {analysis ? (
        <div className="rounded-3xl bg-white p-4 text-sm text-slate-700 shadow-sm">
          <p className="font-semibold text-slate-900">AI analysis</p>
          <p className="mt-2 text-slate-600">{analysis.note}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <span className="rounded-2xl bg-slate-100 px-3 py-2">Calories: {analysis.calories} kcal</span>
            <span className="rounded-2xl bg-slate-100 px-3 py-2">Protein: {analysis.protein} g</span>
            <span className="rounded-2xl bg-slate-100 px-3 py-2">Carbs: {analysis.carbs} g</span>
            <span className="rounded-2xl bg-slate-100 px-3 py-2">Fat: {analysis.fat} g</span>
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Confidence: {analysis.confidence}</p>
        </div>
      ) : null}
    </div>
  )
}
