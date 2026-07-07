import type {
  OptimizationGoal,
  OptimizationRecommendation,
  OptimizationRequest,
  OptimizationScoreBreakdown,
  Recipe,
} from '../types'

function getGoalWeights(goal: OptimizationGoal) {
  const defaultWeights = {
    cost: 1,
    health: 1,
    speed: 1,
    proteinDensity: 1,
    waste: 1,
  }

  switch (goal) {
    case 'lowest_cost':
      return { ...defaultWeights, cost: 2.8, speed: 1.1 }
    case 'healthiest':
      return { ...defaultWeights, health: 2.8, proteinDensity: 1.3 }
    case 'balanced':
      return { ...defaultWeights, cost: 1.2, health: 1.6, speed: 1.2, proteinDensity: 1.2, waste: 1.4 }
    case 'muscle_gain':
      return { ...defaultWeights, proteinDensity: 3, health: 1.6, cost: 1.1 }
    case 'fat_loss':
      return { ...defaultWeights, health: 2.6, proteinDensity: 2.1, cost: 1.1 }
    case 'student_budget':
      return { ...defaultWeights, cost: 3, speed: 1.6, waste: 1.8 }
    case 'family_budget':
      return { ...defaultWeights, cost: 2.6, waste: 2.2, health: 1.3 }
    case 'fastest_cooking':
      return { ...defaultWeights, speed: 3, cost: 1.2 }
    case 'lowest_food_waste':
      return { ...defaultWeights, waste: 3, cost: 1.4 }
    default:
      return defaultWeights
  }
}

function scoreRecipe(recipe: Recipe, goal: OptimizationGoal): OptimizationScoreBreakdown {
  const weights = getGoalWeights(goal)

  const nutritionPerServing = recipe.nutrition.perServing
  const costPerServing = recipe.servings > 0 ? recipe.estimatedCost / recipe.servings : recipe.estimatedCost

  const costScore = Math.max(0, 100 - costPerServing * 12)
  const proteinDensity = nutritionPerServing.calories > 0
    ? (nutritionPerServing.protein * 4) / nutritionPerServing.calories
    : 0
  const proteinScore = Math.min(100, proteinDensity * 220)

  const macroBalance = Math.abs(nutritionPerServing.protein - nutritionPerServing.carbs) + Math.abs(nutritionPerServing.fat * 2 - nutritionPerServing.protein)
  const healthScore = Math.max(0, 100 - macroBalance * 0.7)

  const cookMinutes = recipe.cookingTimeMinutes ?? 45
  const speedScore = Math.max(0, 100 - cookMinutes * 1.7)

  const ingredientCount = recipe.ingredients.length || 1
  const wasteScore = Math.max(0, 100 - ingredientCount * 2.2)

  const total =
    costScore * weights.cost +
    healthScore * weights.health +
    speedScore * weights.speed +
    proteinScore * weights.proteinDensity +
    wasteScore * weights.waste

  return {
    total,
    costScore,
    healthScore,
    speedScore,
    proteinDensityScore: proteinScore,
    wasteScore,
  }
}

export function rankRecipesForGoal(request: OptimizationRequest): OptimizationRecommendation[] {
  const filtered = request.recipes.filter((recipe) => {
    if (request.maxBudgetPerRecipe !== undefined && recipe.estimatedCost > request.maxBudgetPerRecipe) return false
    if (request.maxCookingMinutes !== undefined && (recipe.cookingTimeMinutes ?? 999) > request.maxCookingMinutes) return false
    return true
  })

  const ranked = filtered
    .map((recipe) => ({
      recipe,
      score: scoreRecipe(recipe, request.goal),
      rationale: `${request.goal} prioritization using cost, nutrition balance, protein density, speed, and waste readiness.`,
    }))
    .sort((a, b) => b.score.total - a.score.total)

  return ranked.slice(0, request.limit ?? 10)
}
