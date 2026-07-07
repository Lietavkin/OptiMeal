import type { OnboardingData } from '../types'

type OnboardingInsights = {
  summary: string
  weeklyStrategy: string
}

const aiApiBaseUrl = (import.meta.env.VITE_AI_API_BASE_URL as string | undefined)?.trim()

function goalLabel(goal: OnboardingData['primaryGoal']) {
  switch (goal) {
    case 'fat_loss':
      return 'fat loss'
    case 'muscle_gain':
      return 'muscle gain'
    case 'performance':
      return 'performance'
    case 'general_health':
      return 'general health'
    default:
      return 'maintenance'
  }
}

function fallbackInsights(input: OnboardingData): OnboardingInsights {
  const cuisineSummary = input.favoriteCuisines.length
    ? input.favoriteCuisines.slice(0, 3).join(', ')
    : 'balanced home-cooked meals'

  const sportLabel = input.sport?.trim() ? `${input.sport} training` : 'daily consistency'
  const proteinPerMeal = Math.max(20, Math.round(input.macroGoal.protein / Math.max(3, input.mealFrequency)))

  return {
    summary: `${input.age}-year-old user focused on ${goalLabel(input.primaryGoal)} with a ${input.activityLevel.replace('_', ' ')} routine. Prefers ${cuisineSummary}, has ${input.cookingSkill} cooking confidence, and can dedicate about ${input.cookingTimeMinutes} minutes per day. Strategy should prioritize ${sportLabel}, respect dietary style (${input.dietaryStyle}), and avoid flagged dislikes/allergies.`,
    weeklyStrategy: `Week 1 strategy: target ${input.macroGoal.calories} kcal/day and split intake across ${input.mealFrequency} meals with approximately ${proteinPerMeal}g protein per meal. Batch prep two anchor meals based on ${cuisineSummary}, keep grocery spend near $${input.groceryBudgetWeekly}/week, and reserve one low-friction backup meal for busy schedule windows (${input.dailySchedule}). Review adherence after day 3 and adjust carbs around activity demands.`,
  }
}

async function postAi<T>(path: string, body: unknown): Promise<T> {
  if (!aiApiBaseUrl) throw new Error('AI API base URL not configured')

  const response = await fetch(`${aiApiBaseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`AI API request failed with status ${response.status}`)
  return (await response.json()) as T
}

export async function generateOnboardingInsights(input: OnboardingData): Promise<OnboardingInsights> {
  try {
    if (!aiApiBaseUrl) return fallbackInsights(input)

    return await postAi<OnboardingInsights>('/onboarding-insights', {
      onboarding: input,
    })
  } catch {
    return fallbackInsights(input)
  }
}
