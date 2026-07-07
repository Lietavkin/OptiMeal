import { v4 as uuidv4 } from 'uuid'
import type {
  FitnessGoal,
  OnboardingData,
  OnboardingPrimaryGoal,
  UserOptimizationProfileInput,
} from '../types'
import { upsertNutritionGoal } from './nutritionGoalsService'
import { generateOnboardingInsights } from './onboardingInsightsService'
import { upsertUserOptimizationProfile } from './userOptimizationProfileService'

type CompleteOnboardingResult = {
  summary: string
  weeklyStrategy: string
}

function mapPrimaryGoalToFitnessGoal(goal: OnboardingPrimaryGoal): FitnessGoal {
  if (goal === 'fat_loss') return 'fat_loss'
  if (goal === 'muscle_gain') return 'muscle_gain'
  return 'maintenance'
}

function mapCookingSkillToScore(skill: OnboardingData['cookingSkill']) {
  switch (skill) {
    case 'beginner':
      return 25
    case 'intermediate':
      return 55
    case 'advanced':
      return 80
    case 'expert':
      return 95
    default:
      return 50
  }
}

function mapOnboardingToOptimizationProfile(input: OnboardingData): UserOptimizationProfileInput {
  return {
    budget: input.groceryBudgetWeekly,
    healthPriority: input.primaryGoal === 'general_health' ? 85 : 70,
    tastePriority: 55,
    conveniencePriority: input.cookingTimeMinutes <= 30 ? 80 : 50,
    cookingSkill: mapCookingSkillToScore(input.cookingSkill),
    cookingTimeAvailable: input.cookingTimeMinutes,
    favoriteCuisines: input.favoriteCuisines,
    dislikedFoods: input.dislikedFoods,
    allergies: input.allergies,
    dietaryStyle: input.dietaryStyle === 'flexitarian' ? 'omnivore' : input.dietaryStyle,
    fitnessGoal: mapPrimaryGoalToFitnessGoal(input.primaryGoal),
    familySize: 1,
  }
}

export async function completeOnboarding(userId: string, input: OnboardingData): Promise<CompleteOnboardingResult> {
  const insights = await generateOnboardingInsights(input)

  await upsertUserOptimizationProfile(userId, mapOnboardingToOptimizationProfile(input))

  await upsertNutritionGoal({
    id: uuidv4(),
    user_id: userId,
    calories: input.macroGoal.calories,
    protein: input.macroGoal.protein,
    carbs: input.macroGoal.carbs,
    fat: input.macroGoal.fat,
    active: true,
  })

  return insights
}
