import { rankRecipesForGoal } from './optimizationService'
import type {
  DailyReoptimizationInput,
  DailyReoptimizationResult,
  NutritionGoal,
  RestaurantMeal,
  WeeklyRealWorldMetrics,
} from '../types'

function startOfDayIso(dateIso: string) {
  return new Date(dateIso).toISOString().slice(0, 10)
}

function sumRestaurantMealsForDate(meals: RestaurantMeal[], dateIso: string) {
  const day = startOfDayIso(dateIso)
  return meals
    .filter((meal) => meal.mealDate === day)
    .reduce(
      (acc, meal) => {
        acc.calories += meal.calories
        acc.protein += meal.protein
        acc.carbs += meal.carbs
        acc.fat += meal.fat
        acc.price += meal.estimatedPrice
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, price: 0 },
    )
}

export function reoptimizeDailyNutrition(input: DailyReoptimizationInput): DailyReoptimizationResult {
  const target = input.nutritionGoal ?? {
    calories: 2200,
    protein: 140,
    carbs: 230,
    fat: 70,
  }

  const spent = sumRestaurantMealsForDate(input.restaurantMeals, input.date)

  const remaining = {
    calories: Math.max(0, target.calories - spent.calories),
    protein: Math.max(0, target.protein - spent.protein),
    carbs: Math.max(0, target.carbs - spent.carbs),
    fat: Math.max(0, target.fat - spent.fat),
  }

  const remainingRecipeRecommendations = rankRecipesForGoal({
    goal: 'balanced',
    recipes: input.recipes.filter((recipe) => recipe.nutrition.perServing.calories <= remaining.calories + 200),
    limit: 3,
  })

  const dailyNutritionImpact = {
    caloriesUsedPercent: target.calories > 0 ? (spent.calories / target.calories) * 100 : 0,
    proteinUsedPercent: target.protein > 0 ? (spent.protein / target.protein) * 100 : 0,
    carbsUsedPercent: target.carbs > 0 ? (spent.carbs / target.carbs) * 100 : 0,
    fatUsedPercent: target.fat > 0 ? (spent.fat / target.fat) * 100 : 0,
  }

  return {
    target,
    spent,
    remaining,
    dailyNutritionImpact,
    remainingRecipeRecommendations,
  }
}

function isSameWeek(dateIso: string, weekStartIso: string) {
  const date = new Date(dateIso)
  const weekStart = new Date(weekStartIso)
  const weekEnd = new Date(weekStartIso)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return date >= weekStart && date <= weekEnd
}

export function buildWeeklyRealWorldMetrics(
  weekStartIso: string,
  restaurantMeals: RestaurantMeal[],
  homeCookedMealCount: number,
  groceryCost: number,
  nutritionGoal: NutritionGoal | null,
): WeeklyRealWorldMetrics {
  const weeklyMeals = restaurantMeals.filter((meal) => isSameWeek(meal.mealDate, weekStartIso))

  const restaurantMealCount = weeklyMeals.length
  const totalMeals = Math.max(1, homeCookedMealCount + restaurantMealCount)
  const restaurantSpend = weeklyMeals.reduce((sum, meal) => sum + meal.estimatedPrice, 0)

  const nutritionImpact = weeklyMeals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories
      acc.protein += meal.protein
      acc.carbs += meal.carbs
      acc.fat += meal.fat
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const target = nutritionGoal
    ? {
        calories: nutritionGoal.calories * 7,
        protein: nutritionGoal.protein * 7,
        carbs: nutritionGoal.carbs * 7,
        fat: nutritionGoal.fat * 7,
      }
    : null

  const nutritionImpactScore = target
    ? Math.max(
        0,
        100 -
          (Math.abs(nutritionImpact.calories - target.calories) / Math.max(1, target.calories)) * 50 -
          (Math.abs(nutritionImpact.protein - target.protein) / Math.max(1, target.protein)) * 25,
      )
    : 70

  const optimizationAdjustments = {
    groceryReduction: Math.min(groceryCost, restaurantSpend * 0.65),
    shoppingReductionPercent: groceryCost > 0 ? Math.min(100, (restaurantSpend * 0.65 / groceryCost) * 100) : 0,
  }

  return {
    homeCookedRatio: (homeCookedMealCount / totalMeals) * 100,
    restaurantRatio: (restaurantMealCount / totalMeals) * 100,
    moneySpentEatingOut: restaurantSpend,
    nutritionImpact,
    nutritionImpactScore,
    optimizationAdjustments,
  }
}

export function getWeekStartDate(date: Date) {
  const weekStart = new Date(date)
  const day = weekStart.getDay()
  const diff = day === 0 ? -6 : 1 - day
  weekStart.setDate(weekStart.getDate() + diff)
  return weekStart.toISOString().slice(0, 10)
}
