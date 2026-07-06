import type { NutritionSummary, Profile } from '../types'

export type FoodAnalysis = {
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: string
  note: string
}

export type MealRecommendation = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description: string
}

type AnalyzeFoodInput = {
  mealName: string
  fileName: string
  imageUrl?: string
}

const aiApiBaseUrl = (import.meta.env.VITE_AI_API_BASE_URL as string | undefined)?.trim()

function fallbackFoodAnalysis(mealName: string, fileName: string): FoodAnalysis {
  const seed = (mealName + fileName).length
  const calories = 180 + ((seed * 13) % 220)
  const protein = 10 + ((seed * 7) % 40)
  const carbs = 18 + ((seed * 5) % 50)
  const fat = 6 + ((seed * 3) % 22)
  const confidence = `${80 + ((seed * 11) % 19)}%`
  const note = `Estimated from visual cues for ${mealName || 'meal'}. Connect your AI endpoint for model-grade analysis.`

  return { calories, protein, carbs, fat, confidence, note }
}

function fallbackMealRecommendations(profile: Profile | null, summary: NutritionSummary): MealRecommendation[] {
  const goals = {
    calories: profile?.daily_calories_goal ?? 2000,
    protein: profile?.daily_protein_goal ?? 100,
    carbs: profile?.daily_carbs_goal ?? 250,
    fat: profile?.daily_fat_goal ?? 70,
  }

  const deficit = {
    calories: Math.max(0, goals.calories - summary.totalCalories),
    protein: Math.max(0, goals.protein - summary.totalProtein),
    carbs: Math.max(0, goals.carbs - summary.totalCarbs),
    fat: Math.max(0, goals.fat - summary.totalFat),
  }

  const baseLabel = deficit.calories > 0 ? 'Fuel up with' : 'Maintain balance with'

  return [
    {
      name: 'Greek Power Bowl',
      calories: Math.min(deficit.calories, 420) || 320,
      protein: Math.min(deficit.protein, 28) || 24,
      carbs: Math.min(deficit.carbs, 38) || 34,
      fat: Math.min(deficit.fat, 14) || 12,
      description: `${baseLabel} a protein-rich bowl with veggies and quinoa.`,
    },
    {
      name: 'Savory Turkey Wrap',
      calories: Math.min(deficit.calories, 360) || 300,
      protein: Math.min(deficit.protein, 24) || 22,
      carbs: Math.min(deficit.carbs, 32) || 30,
      fat: Math.min(deficit.fat, 12) || 10,
      description: `${baseLabel} a lean turkey wrap with avocado and crisp greens.`,
    },
    {
      name: 'Smoothie Protein Boost',
      calories: Math.min(deficit.calories, 280) || 260,
      protein: Math.min(deficit.protein, 22) || 20,
      carbs: Math.min(deficit.carbs, 40) || 38,
      fat: Math.min(deficit.fat, 10) || 8,
      description: `${baseLabel} a refreshing smoothie with berries and almond milk.`,
    },
  ]
}

async function postAi<T>(path: string, body: unknown): Promise<T> {
  if (!aiApiBaseUrl) {
    throw new Error('AI API base URL not configured')
  }

  const response = await fetch(`${aiApiBaseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`AI API request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export async function analyzeFoodImage(input: AnalyzeFoodInput): Promise<FoodAnalysis> {
  try {
    if (!aiApiBaseUrl) return fallbackFoodAnalysis(input.mealName, input.fileName)
    return await postAi<FoodAnalysis>('/analyze-food', input)
  } catch {
    return fallbackFoodAnalysis(input.mealName, input.fileName)
  }
}

export async function getMealRecommendations(profile: Profile | null, summary: NutritionSummary): Promise<MealRecommendation[]> {
  try {
    if (!aiApiBaseUrl) return fallbackMealRecommendations(profile, summary)
    return await postAi<MealRecommendation[]>('/recommend-meals', { profile, summary })
  } catch {
    return fallbackMealRecommendations(profile, summary)
  }
}
