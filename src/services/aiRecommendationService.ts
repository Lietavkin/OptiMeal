import type {
  AIRecommendation,
  AIRecommendationRequest,
  AIRecommendationResult,
  GroceryOptimizationResult,
  PantryItem,
  Recipe,
  UserOptimizationProfile,
  WeeklyInsights,
} from '../types'

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function recipeFitsDietaryStyle(recipe: Recipe, style: UserOptimizationProfile['dietaryStyle']) {
  const ingredientNames = recipe.ingredients.map((ingredient) => normalizeText(ingredient.displayName))

  if (style === 'vegan') {
    return !ingredientNames.some((name) =>
      ['chicken', 'beef', 'pork', 'egg', 'milk', 'cheese', 'yogurt', 'salmon', 'fish', 'turkey'].some((token) =>
        name.includes(token),
      ),
    )
  }

  if (style === 'vegetarian') {
    return !ingredientNames.some((name) =>
      ['chicken', 'beef', 'pork', 'salmon', 'fish', 'turkey'].some((token) => name.includes(token)),
    )
  }

  if (style === 'keto') {
    return recipe.nutrition.perServing.carbs <= 20
  }

  return true
}

function recipeViolatesProfile(recipe: Recipe, profile: UserOptimizationProfile) {
  const ingredientNames = recipe.ingredients.map((ingredient) => normalizeText(ingredient.displayName))
  const disliked = profile.dislikedFoods.map(normalizeText)
  const allergies = profile.allergies.map(normalizeText)

  return ingredientNames.some((name) =>
    [...disliked, ...allergies].some((token) => token && name.includes(token)),
  )
}

function pantryCoverage(recipe: Recipe, pantry: PantryItem[]) {
  if (recipe.ingredients.length === 0) return 0
  const pantryNames = new Set(pantry.map((item) => normalizeText(item.ingredientName)))

  const matches = recipe.ingredients.filter((ingredient) => {
    const target = normalizeText(ingredient.displayName)
    for (const pantryName of pantryNames) {
      if (pantryName.includes(target) || target.includes(pantryName)) {
        return true
      }
    }
    return false
  }).length

  return matches / recipe.ingredients.length
}

function makeRecommendation(idSuffix: string, kind: AIRecommendation['kind'], title: string, detail: string, impactScore: number, recipeId?: string): AIRecommendation {
  return {
    id: `${kind}-${idSuffix}`,
    kind,
    title,
    detail,
    impactScore,
    recipeId,
  }
}

function getCheaperAlternative(recipes: Recipe[], groceryResult: GroceryOptimizationResult): AIRecommendation | null {
  if (recipes.length < 2) return null

  const sorted = [...recipes].sort((a, b) => a.estimatedCost - b.estimatedCost)
  const cheapest = sorted[0]
  const expensive = sorted[sorted.length - 1]
  if (!cheapest || !expensive || cheapest.id === expensive.id) return null

  const savings = Math.max(0, expensive.estimatedCost - cheapest.estimatedCost)
  if (savings < 0.5) return null

  return makeRecommendation(
    'cheap-swap',
    'cheaper_alternative',
    `Swap ${expensive.title} for ${cheapest.title}`,
    `Estimated weekly savings of $${(savings + groceryResult.expectedSavings * 0.25).toFixed(2)} while keeping similar meal volume.`,
    Math.min(100, 50 + savings * 8),
    cheapest.id,
  )
}

function getHealthierAlternative(recipes: Recipe[]): AIRecommendation | null {
  if (recipes.length < 2) return null

  const scored = recipes
    .map((recipe) => ({
      recipe,
      score: recipe.nutrition.perServing.protein * 1.6 + Math.max(0, 600 - recipe.nutrition.perServing.calories) * 0.1,
    }))
    .sort((a, b) => b.score - a.score)

  const healthiest = scored[0]?.recipe
  const weakest = scored[scored.length - 1]?.recipe

  if (!healthiest || !weakest || healthiest.id === weakest.id) return null

  return makeRecommendation(
    'health-swap',
    'healthier_alternative',
    `Prefer ${healthiest.title} over ${weakest.title}`,
    `${healthiest.title} offers better protein-to-calorie balance for your weekly targets.`,
    74,
    healthiest.id,
  )
}

function getWasteReductionRecommendation(recipes: Recipe[], pantry: PantryItem[]): AIRecommendation | null {
  if (pantry.length === 0 || recipes.length === 0) return null

  const urgentPantry = pantry
    .filter((item) => item.expirationDate)
    .sort((a, b) => new Date(a.expirationDate ?? '').getTime() - new Date(b.expirationDate ?? '').getTime())

  const nextExpiring = urgentPantry[0]
  if (!nextExpiring) return null

  const matchedRecipe = recipes.find((recipe) =>
    recipe.ingredients.some((ingredient) => {
      const pantryName = normalizeText(nextExpiring.ingredientName)
      const ingredientName = normalizeText(ingredient.displayName)
      return pantryName.includes(ingredientName) || ingredientName.includes(pantryName)
    }),
  )

  if (!matchedRecipe) return null

  return makeRecommendation(
    'waste-cut',
    'reduce_waste',
    `Use ${nextExpiring.ingredientName} in ${matchedRecipe.title}`,
    `This ingredient expires soon. Scheduling ${matchedRecipe.title} earlier can reduce waste and stretch your budget.`,
    78,
    matchedRecipe.id,
  )
}

function getAtHomeRecommendation(recipes: Recipe[], pantry: PantryItem[]): AIRecommendation | null {
  if (recipes.length === 0 || pantry.length === 0) return null

  const best = recipes
    .map((recipe) => ({ recipe, coverage: pantryCoverage(recipe, pantry) }))
    .sort((a, b) => b.coverage - a.coverage)[0]

  if (!best || best.coverage <= 0.3) return null

  return makeRecommendation(
    'pantry-use',
    'use_at_home_ingredients',
    `Cook ${best.recipe.title} with pantry items`,
    `You already have about ${(best.coverage * 100).toFixed(0)}% of required ingredients at home.`,
    Math.min(95, 40 + best.coverage * 60),
    best.recipe.id,
  )
}

function getGoalFitRecommendation(recipes: Recipe[], profile: UserOptimizationProfile): AIRecommendation | null {
  const filtered = recipes.filter((recipe) => recipeFitsDietaryStyle(recipe, profile.dietaryStyle) && !recipeViolatesProfile(recipe, profile))
  if (filtered.length === 0) return null

  const targetRecipe = [...filtered]
    .sort((a, b) => {
      if (profile.fitnessGoal === 'muscle_gain') {
        return b.nutrition.perServing.protein - a.nutrition.perServing.protein
      }
      if (profile.fitnessGoal === 'fat_loss') {
        return a.nutrition.perServing.calories - b.nutrition.perServing.calories
      }
      return a.estimatedCost - b.estimatedCost
    })[0]

  if (!targetRecipe) return null

  const goalLabel = {
    muscle_gain: 'muscle gain',
    fat_loss: 'fat loss',
    maintenance: 'maintenance',
  }[profile.fitnessGoal]

  return makeRecommendation(
    'goal-fit',
    'fit_user_goal',
    `${targetRecipe.title} fits your ${goalLabel} target`,
    `This meal aligns with your ${profile.dietaryStyle} style and stated priorities.`,
    82,
    targetRecipe.id,
  )
}

function buildWeeklyInsights(
  profile: UserOptimizationProfile,
  pantry: PantryItem[],
  groceryResult: GroceryOptimizationResult,
  recommendations: AIRecommendation[],
): WeeklyInsights {
  const pantryCoverageRatio = groceryResult.requirements.length > 0
    ? groceryResult.requirements.filter((requirement) =>
        pantry.some((item) => {
          const pantryName = normalizeText(item.ingredientName)
          const reqName = normalizeText(requirement.ingredientName)
          return pantryName.includes(reqName) || reqName.includes(pantryName)
        }),
      ).length / groceryResult.requirements.length
    : 0

  const pantryUtilization = Math.min(100, pantryCoverageRatio * 100)
  const nutritionScore = Math.min(100, groceryResult.expectedNutritionScore / Math.max(1, profile.familySize * 15))

  const wastePenalty = Math.max(0, 100 - pantryUtilization * 0.7)
  const foodWasteScore = Math.max(0, 100 - wastePenalty)

  const recommendationBoost = recommendations.reduce((sum, item) => sum + item.impactScore, 0) / Math.max(1, recommendations.length)

  const weeklyOptimizationScore = Math.min(
    100,
    nutritionScore * (profile.healthPriority / 100) +
      foodWasteScore * 0.2 +
      Math.min(100, groceryResult.expectedSavings * 5) * (profile.conveniencePriority / 250) +
      recommendationBoost * 0.2,
  )

  return {
    estimatedWeeklyGroceryCost: groceryResult.totalExpectedCost,
    nutritionScore,
    foodWasteScore,
    pantryUtilization,
    moneySaved: groceryResult.expectedSavings,
    weeklyOptimizationScore,
  }
}

export function generateAIRecommendations(request: AIRecommendationRequest): AIRecommendationResult {
  const recommendations: AIRecommendation[] = []

  const cheaper = getCheaperAlternative(request.recipes, request.groceryResult)
  if (cheaper) recommendations.push(cheaper)

  const healthier = getHealthierAlternative(request.recipes)
  if (healthier) recommendations.push(healthier)

  const waste = getWasteReductionRecommendation(request.recipes, request.pantry)
  if (waste) recommendations.push(waste)

  const atHome = getAtHomeRecommendation(request.recipes, request.pantry)
  if (atHome) recommendations.push(atHome)

  const fitGoal = getGoalFitRecommendation(request.recipes, request.profile)
  if (fitGoal) recommendations.push(fitGoal)

  const weeklyInsights = buildWeeklyInsights(request.profile, request.pantry, request.groceryResult, recommendations)

  return {
    recommendations,
    weeklyInsights,
  }
}
