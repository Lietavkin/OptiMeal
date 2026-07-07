import type {
  AICoachAdviceType,
  AICoachDashboard,
  AICoachLearningSnapshot,
  AICoachRecommendation,
  AICoachRecommendationInput,
  AthleteDayType,
  OnboardingData,
  Recipe,
} from '../types'
import { getIngredientCatalogForUser } from './ingredientsService'
import { getActiveNutritionGoal } from './nutritionGoalsService'
import { optimizeWeeklyGroceryPlan } from './groceryOptimizationService'
import { getMealsForUser } from './mealsService'
import { rankRecipesForGoal } from './optimizationService'
import { getPantryForUser } from './pantryService'
import { getProfile } from './profileService'
import { getRecipesForUser } from './recipesService'
import { getRestaurantMealsForUser } from './restaurantMealsService'
import {
  createRecommendations,
  getDailyCheckin,
  getLearningSnapshot,
  getRecommendationsForDate,
  trackCoachAction,
  updateRecommendationStatus,
} from './aiCoachStoreService'
import { createSupabaseStoreInventoryProvider, seedPlaceholderStoreInventory, supportedStores } from './storeInventoryService'
import { getUserOptimizationProfile } from './userOptimizationProfileService'

function toIsoDay(date: Date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function startOfIsoDay(day: string) {
  return `${day}T00:00:00.000Z`
}

function parseOnboardingData(value: unknown): OnboardingData | null {
  if (!value || typeof value !== 'object') return null
  return value as OnboardingData
}

function activityMultiplier(level: string) {
  if (level === 'sedentary') return 1.1
  if (level === 'light') return 1.2
  if (level === 'very_active') return 1.45
  if (level === 'athlete') return 1.6
  return 1.3
}

function dayTypeBoost(dayType: AthleteDayType) {
  if (dayType === 'recovery') return 4
  if (dayType === 'rest') return 0
  if (dayType === 'match') return 8
  return 6
}

function computeWeightTrend(weightSeries: Array<number | null>) {
  const values = weightSeries.filter((item): item is number => item != null)
  if (values.length < 2) return 0
  return Number((values[values.length - 1] - values[0]).toFixed(2))
}

function computeConfidence(base: number, learning: AICoachLearningSnapshot, adviceType: AICoachAdviceType) {
  const typeStats = learning.byType[adviceType]
  const typeTotal = typeStats.accepted + typeStats.ignored
  const typeAcceptance = typeTotal > 0 ? (typeStats.accepted / typeTotal) * 100 : learning.acceptanceRate

  return Math.min(99, Math.max(40, base * 0.7 + learning.acceptanceRate * 0.2 + typeAcceptance * 0.1))
}

function pickReplacementMeal(recipes: Recipe[], currentMealName: string | null) {
  if (recipes.length === 0) return null

  const ranked = rankRecipesForGoal({
    goal: 'balanced',
    recipes,
    limit: 3,
  })

  return ranked.map((item) => item.recipe).find((recipe) => recipe.title !== currentMealName) ?? ranked[0]?.recipe ?? null
}

function buildAdviceInputs(args: {
  day: string
  mealsCompleted: number
  remaining: { calories: number; protein: number; carbs: number; fat: number }
  nutritionScore: number
  adherenceScore: number
  waterIntakeMl: number
  athleteDayType: AthleteDayType
  onboardingData: OnboardingData | null
  learning: AICoachLearningSnapshot
  recipes: Recipe[]
  groceryCost: number
  expectedSavings: number
  topRestaurant: string | null
  pantryCoverage: number
}): AICoachRecommendationInput[] {
  const schedule = args.onboardingData?.dailySchedule ?? 'your schedule'
  const sport = args.onboardingData?.sport?.trim()
  const cuisine = args.onboardingData?.favoriteCuisines?.[0] ?? 'balanced meals'
  const mealTarget = args.onboardingData?.mealFrequency ?? 3

  const dailyAdvice = `You have ${args.remaining.calories.toFixed(0)} kcal left with ${args.remaining.protein.toFixed(0)}g protein remaining. Prioritize a ${cuisine} meal that closes protein first, then carbs.`
  const dailyWhy = `Based on today's remaining macros and your ${schedule.toLowerCase()} pattern, this order improves adherence while keeping energy stable.`
  const dailyBenefit = 'Expected benefit: tighter macro alignment tonight and lower late-day hunger rebound.'

  const weeklyAdvice = `This week, aim for ${Math.max(2, mealTarget - 1)} planned meals plus one flexible recovery meal. Lock prep slots early to avoid decision fatigue.`
  const weeklyWhy = `Your adherence score is ${args.adherenceScore.toFixed(0)}. Structured planning improves consistency when adherence drops below 85.`
  const weeklyBenefit = 'Expected benefit: more consistent weekly adherence with less decision fatigue and fewer missed targets.'

  const budgetAdvice = `Projected weekly grocery cost is about $${args.groceryCost.toFixed(0)} with an estimated $${args.expectedSavings.toFixed(0)} in optimization savings.`
  const budgetWhy = `Using your pantry and optimization data lowers spend while preserving nutrient density.`
  const budgetBenefit = 'Expected benefit: lower weekly food spend while maintaining protein quality and nutrition coverage.'

  const shoppingAdvice = `Pantry coverage is ${args.pantryCoverage.toFixed(0)}%. Shop only missing ingredients and prioritize one primary store to reduce impulse spend.`
  const shoppingWhy = `This recommendation is tied to pantry availability and your preferred stores to reduce waste and travel time.`
  const shoppingBenefit = 'Expected benefit: fewer unnecessary purchases, less waste, and faster shopping trips.'

  const restaurantAdvice = args.topRestaurant
    ? `If you eat out today, choose high-protein options at ${args.topRestaurant} and keep added fats modest.`
    : 'If you eat out today, pick grilled protein + fiber-rich sides and cap sauces to keep calories predictable.'
  const restaurantWhy = `Restaurant guidance is tuned to remaining macros and your current nutrition score (${args.nutritionScore.toFixed(0)}).`
  const restaurantBenefit = 'Expected benefit: better macro control when dining out and reduced calorie overshoot risk.'

  const recoveryAdvice = `Athlete mode: ${args.athleteDayType}. Increase hydration to at least ${Math.max(2000, args.waterIntakeMl + 800)} ml and include a recovery-friendly meal.`
  const recoveryWhy = sport
    ? `Because ${sport} increases recovery load, hydration and consistent protein improve next-session performance.`
    : `Hydration and recovery-focused intake improve next-day energy and reduce adherence dropoff.`
  const recoveryBenefit = 'Expected benefit: improved readiness for the next session and lower recovery-related performance dips.'

  return [
    {
      entryDate: args.day,
      adviceType: 'daily',
      title: 'Daily Nutrition Adjustment',
      message: dailyAdvice,
      why: dailyWhy,
      expectedBenefit: dailyBenefit,
      confidence: computeConfidence(82 + dayTypeBoost(args.athleteDayType) * 0.3, args.learning, 'daily'),
    },
    {
      entryDate: args.day,
      adviceType: 'weekly',
      title: 'Weekly Coaching Plan',
      message: weeklyAdvice,
      why: weeklyWhy,
      expectedBenefit: weeklyBenefit,
      confidence: computeConfidence(78, args.learning, 'weekly'),
    },
    {
      entryDate: args.day,
      adviceType: 'budget',
      title: 'Budget Guardrail',
      message: budgetAdvice,
      why: budgetWhy,
      expectedBenefit: budgetBenefit,
      confidence: computeConfidence(75, args.learning, 'budget'),
    },
    {
      entryDate: args.day,
      adviceType: 'shopping',
      title: 'Shopping Decision',
      message: shoppingAdvice,
      why: shoppingWhy,
      expectedBenefit: shoppingBenefit,
      confidence: computeConfidence(77, args.learning, 'shopping'),
    },
    {
      entryDate: args.day,
      adviceType: 'restaurant',
      title: 'Restaurant Strategy',
      message: restaurantAdvice,
      why: restaurantWhy,
      expectedBenefit: restaurantBenefit,
      confidence: computeConfidence(74, args.learning, 'restaurant'),
    },
    {
      entryDate: args.day,
      adviceType: 'recovery',
      title: 'Recovery Guidance',
      message: recoveryAdvice,
      why: recoveryWhy,
      expectedBenefit: recoveryBenefit,
      confidence: computeConfidence(80 + dayTypeBoost(args.athleteDayType) * 0.25, args.learning, 'recovery'),
    },
  ]
}

export async function getAICoachDashboard(userId: string, entryDate = toIsoDay()): Promise<AICoachDashboard> {
  const day = entryDate
  const dayStart = new Date(startOfIsoDay(day)).getTime()

  const [
    profile,
    meals,
    nutritionGoal,
    recipes,
    pantry,
    restaurants,
    checkin,
    existingRecommendations,
    learning,
    optimizationProfile,
    ingredients,
  ] = await Promise.all([
    getProfile(userId),
    getMealsForUser(userId),
    getActiveNutritionGoal(userId),
    getRecipesForUser(userId),
    getPantryForUser(userId),
    getRestaurantMealsForUser(userId),
    getDailyCheckin(userId, day),
    getRecommendationsForDate(userId, day),
    getLearningSnapshot(userId),
    getUserOptimizationProfile(userId),
    getIngredientCatalogForUser(userId),
  ])

  const todayMeals = meals.filter((meal) => {
    const createdAt = new Date(meal.createdAt).getTime()
    return createdAt >= dayStart
  })

  const spent = todayMeals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories
      acc.protein += meal.protein
      acc.carbs += meal.carbs
      acc.fat += meal.fat
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const target = {
    calories: nutritionGoal?.calories ?? profile?.daily_calories_goal ?? 2200,
    protein: nutritionGoal?.protein ?? profile?.daily_protein_goal ?? 140,
    carbs: nutritionGoal?.carbs ?? profile?.daily_carbs_goal ?? 230,
    fat: nutritionGoal?.fat ?? profile?.daily_fat_goal ?? 70,
  }

  const remaining = {
    calories: Math.max(0, target.calories - spent.calories),
    protein: Math.max(0, target.protein - spent.protein),
    carbs: Math.max(0, target.carbs - spent.carbs),
    fat: Math.max(0, target.fat - spent.fat),
  }

  const macroDrift =
    Math.abs(target.calories - spent.calories) / Math.max(1, target.calories) +
    Math.abs(target.protein - spent.protein) / Math.max(1, target.protein)

  const onboardingData = parseOnboardingData(profile?.onboarding_data)
  const adherenceBase = 100 - macroDrift * 38 - Math.max(0, learning.ignoredRate - 30) * 0.2
  const adherenceScore = Math.max(0, Math.min(100, adherenceBase + activityMultiplier(onboardingData?.activityLevel ?? 'moderate') * 2))

  const todayRestaurantMeals = restaurants.filter((item) => item.mealDate === day)
  const topRestaurant = todayRestaurantMeals[0]?.restaurantName ?? onboardingData?.preferredRestaurants?.[0] ?? null

  const now = new Date()
  const checkinDates = [...Array(7)].map((_, index) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - index))
    return toIsoDay(d)
  })

  const recentCheckins = await Promise.all(checkinDates.map((dateItem) => getDailyCheckin(userId, dateItem)))
  const weightTrendKg = computeWeightTrend(recentCheckins.map((item) => item.weightKg))

  await seedPlaceholderStoreInventory()

  const topRecipes = rankRecipesForGoal({
    goal: optimizationProfile.fitnessGoal === 'fat_loss' ? 'fat_loss' : optimizationProfile.fitnessGoal === 'muscle_gain' ? 'muscle_gain' : 'balanced',
    recipes,
    limit: Math.min(3, recipes.length),
  }).map((item) => item.recipe)

  const groceryOptimization = topRecipes.length > 0
    ? await optimizeWeeklyGroceryPlan({
        goal: 'best_nutrition_per_dollar',
        recipes,
        ingredientCatalog: ingredients,
        weeklyMealPlan: {
          entries: topRecipes.map((recipe) => ({ recipeId: recipe.id, plannedServings: recipe.servings })),
        },
        inventoryProvider: createSupabaseStoreInventoryProvider(),
        pantry,
        allowedStoreKeys: supportedStores.map((store) => store.key),
        constraints: {
          budget: optimizationProfile.budget,
          pantryItems: pantry,
          restaurantMeals: restaurants,
          allergies: optimizationProfile.allergies,
          dietaryRestrictions: [optimizationProfile.dietaryStyle],
          mealFrequency: {
            min: 1,
            max: Math.max(1, topRecipes.length),
          },
          maxCookingMinutesPerRecipe: optimizationProfile.cookingTimeAvailable,
          maxTotalCookingMinutes: Math.max(60, optimizationProfile.cookingTimeAvailable * 7),
          preferredStores: supportedStores.map((store) => store.key),
          maxShoppingTrips: 3,
        },
      })
    : {
        totalExpectedCost: optimizationProfile.budget,
        expectedSavings: 0,
        requirements: [],
      }

  const pantryCoverage = groceryOptimization.requirements.length > 0
    ? (1 - groceryOptimization.requirements.length / Math.max(1, groceryOptimization.requirements.length + pantry.length)) * 100
    : 100

  const todayNutritionScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        macroDrift * 45 +
        (checkin.energy - 3) * 4 +
        (checkin.recovery - 3) * 3 -
        ((checkin.stress ?? 3) - 3) * 2 +
        dayTypeBoost(checkin.athleteDayType) * 0.4,
    ),
  )

  let recommendations = existingRecommendations

  if (recommendations.length === 0) {
    const generatedInputs = buildAdviceInputs({
      day,
      mealsCompleted: todayMeals.length,
      remaining,
      nutritionScore: todayNutritionScore,
      adherenceScore,
      waterIntakeMl: checkin.waterMl,
      athleteDayType: checkin.athleteDayType,
      onboardingData,
      learning,
      recipes,
      groceryCost: groceryOptimization.totalExpectedCost,
      expectedSavings: groceryOptimization.expectedSavings,
      topRestaurant,
      pantryCoverage,
    })

    recommendations = await createRecommendations(userId, generatedInputs)
  }

  return {
    todayNutritionScore,
    remaining,
    mealsCompleted: todayMeals.length,
    waterIntakeMl: checkin.waterMl,
    weightTrendKg,
    adherenceScore,
    checkin,
    recommendations,
  }
}

export async function applyCoachRecommendationAction(args: {
  userId: string
  recommendation: AICoachRecommendation
  action: 'accept' | 'ignore' | 'replace_meal' | 'regenerate'
}): Promise<AICoachRecommendation[]> {
  if (args.action === 'accept') {
    await updateRecommendationStatus(args.userId, args.recommendation.id, 'accepted')
    await trackCoachAction(args.userId, args.recommendation.id, 'accept')
    return []
  }

  if (args.action === 'ignore') {
    await updateRecommendationStatus(args.userId, args.recommendation.id, 'ignored')
    await trackCoachAction(args.userId, args.recommendation.id, 'ignore')
    return []
  }

  const [learning, recipes] = await Promise.all([
    getLearningSnapshot(args.userId),
    getRecipesForUser(args.userId),
  ])

  if (args.action === 'replace_meal') {
    const replacement = pickReplacementMeal(recipes, args.recommendation.linkedMealName)

    await updateRecommendationStatus(args.userId, args.recommendation.id, 'replaced')
    await trackCoachAction(args.userId, args.recommendation.id, 'replace_meal')

    if (!replacement) return []

    return createRecommendations(args.userId, [
      {
        entryDate: args.recommendation.entryDate,
        adviceType: args.recommendation.adviceType,
        title: `Alternative: ${replacement.title}`,
        message: `Switch to ${replacement.title} for a cleaner macro fit and better adherence today.`,
        why: `Generated as a replacement based on your action history and recipe optimization scores.`,
        expectedBenefit: 'Expected benefit: better macro match and a higher chance of plan adherence today.',
        confidence: Math.min(99, Math.max(40, 74 + learning.acceptanceRate * 0.2)),
        linkedMealName: replacement.title,
      },
    ])
  }

  await updateRecommendationStatus(args.userId, args.recommendation.id, 'replaced')
  await trackCoachAction(args.userId, args.recommendation.id, 'regenerate')

  return createRecommendations(args.userId, [
    {
      entryDate: args.recommendation.entryDate,
      adviceType: args.recommendation.adviceType,
      title: `${args.recommendation.title} (Regenerated)`,
      message: `${args.recommendation.message} Updated with a fresh strategy tuned to your latest behavior.`,
      why: `Regenerated after feedback to adapt recommendation framing and improve acceptance likelihood.`,
      expectedBenefit: 'Expected benefit: improved recommendation relevance based on your latest feedback patterns.',
      confidence: Math.min(99, Math.max(40, args.recommendation.confidence * 0.92 + learning.acceptanceRate * 0.12)),
      linkedMealName: args.recommendation.linkedMealName,
    },
  ])
}
