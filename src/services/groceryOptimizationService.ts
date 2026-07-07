import type {
  GroceryOptimizationRequest,
  GroceryOptimizationResult,
  GroceryRequirement,
  ShoppingPlanByStore,
} from '../types'
import {
  createOptimizationExplanation,
  objectiveFromGroceryGoal,
  optimizeGroceryWithConstraints,
} from './optimizationEngineService'

function buildPerStorePlans(items: GroceryOptimizationResult['plansByStore'][number]['items']): ShoppingPlanByStore[] {
  const grouped = new Map<string, ShoppingPlanByStore>()

  items.forEach((item) => {
    const existing = grouped.get(item.store.key)
    const nutritionScore = item.nutrition.calories * 0.35 + item.nutrition.protein * 2 + item.nutrition.carbs * 0.5 + item.nutrition.fat * 0.8

    if (!existing) {
      grouped.set(item.store.key, {
        store: item.store,
        items: [item],
        totalCost: item.estimatedTotalPrice,
        nutritionScore,
      })
      return
    }

    existing.items.push(item)
    existing.totalCost += item.estimatedTotalPrice
    existing.nutritionScore += nutritionScore
  })

  return Array.from(grouped.values()).sort((a, b) => a.totalCost - b.totalCost)
}

function buildPrintableList(
  plansByStore: ShoppingPlanByStore[],
  summary: GroceryOptimizationResult['summary'],
  optimizationExplanation?: string,
  comparison?: GroceryOptimizationResult['planComparison'],
) {
  const header = [
    'OptiMeal Grocery Plan',
    `Strategy: ${summary.strategyLabel}`,
    `Stores: ${summary.storesToVisit}`,
    `Expected Total: $${summary.totalExpectedCost.toFixed(2)}`,
    `Expected Savings: $${summary.expectedSavings.toFixed(2)}`,
    `Nutrition Score: ${summary.expectedNutritionScore.toFixed(1)}`,
  ]

  if (optimizationExplanation) {
    header.push('', `Why this is optimal: ${optimizationExplanation}`)
  }

  if (comparison) {
    header.push(
      '',
      'Optimized vs heuristic baseline',
      `Cost difference: $${comparison.costDifference.toFixed(2)}`,
      `Nutrition difference: ${comparison.nutritionDifference.toFixed(1)}`,
      `Protein difference: ${comparison.proteinDifference.toFixed(1)} g`,
      `Waste difference: ${comparison.wasteDifference.toFixed(2)}`,
    )
  }

  header.push('')

  const lines = plansByStore.flatMap((storePlan) => {
    const aisleGroups = new Map<string, typeof storePlan.items>()
    storePlan.items.forEach((item) => {
      const category = item.category || 'General'
      const existing = aisleGroups.get(category) ?? []
      existing.push(item)
      aisleGroups.set(category, existing)
    })

    const storeLines: string[] = [`${storePlan.store.name}`, `Subtotal: $${storePlan.totalCost.toFixed(2)}`]

    aisleGroups.forEach((items, category) => {
      storeLines.push(`  ${category}`)
      items.forEach((item) => {
        storeLines.push(
          `    - ${item.productName} (${item.brand}) x${item.packageCount} | $${item.estimatedTotalPrice.toFixed(2)} | need ${item.requiredQuantity.toFixed(2)} ${item.requiredUnit}`,
        )
      })
    })

    storeLines.push('')
    return storeLines
  })

  return [...header, ...lines].join('\n')
}

function strategyLabelForGoal(goal: GroceryOptimizationRequest['goal']) {
  return {
    lowest_total_cost: 'Lowest total cost',
    highest_nutrition: 'Highest nutrition',
    best_nutrition_per_dollar: 'Best nutrition per dollar',
    lowest_food_waste: 'Lowest food waste',
    fastest_shopping: 'Fastest shopping',
    single_store_only: 'Single-store only',
    multi_store_optimized: 'Multi-store optimized',
  }[goal]
}

function collectIngredientNames(request: GroceryOptimizationRequest) {
  const recipeById = new Map(request.recipes.map((recipe) => [recipe.id, recipe]))
  const names = new Set<string>()

  request.weeklyMealPlan.entries.forEach((entry) => {
    const recipe = recipeById.get(entry.recipeId)
    if (!recipe) return

    recipe.ingredients.forEach((ingredient) => {
      if (ingredient.displayName.trim()) {
        names.add(ingredient.displayName.trim())
      }
    })
  })

  return Array.from(names)
}

function emptyResult(message: string): GroceryOptimizationResult {
  return {
    requirements: [],
    plansByStore: [],
    storesToVisit: [],
    totalExpectedCost: 0,
    expectedNutritionScore: 0,
    expectedSavings: 0,
    baselineCost: 0,
    summary: {
      strategyLabel: 'No requirements',
      storesToVisit: 0,
      totalExpectedCost: 0,
      expectedSavings: 0,
      expectedNutritionScore: 0,
    },
    optimizationExplanation: message,
    planComparison: {
      costDifference: 0,
      nutritionDifference: 0,
      proteinDifference: 0,
      wasteDifference: 0,
    },
    printableShoppingList: `OptiMeal Grocery Plan\n${message}`,
  }
}

export async function optimizeWeeklyGroceryPlan(request: GroceryOptimizationRequest): Promise<GroceryOptimizationResult> {
  if (request.weeklyMealPlan.entries.length === 0) {
    return emptyResult('No shopping items were generated.')
  }

  const ingredientNames = collectIngredientNames(request)
  const inventory = await request.inventoryProvider.getInventory({
    ingredientNames,
    onlyAvailable: true,
    storeKeys: request.allowedStoreKeys,
  })

  if (inventory.length === 0) {
    return emptyResult('No matching inventory found for this weekly plan.')
  }

  const objective = request.objective ?? objectiveFromGroceryGoal(request.goal)

  const constraints = {
    pantryItems: request.pantry,
    preferredStores: request.allowedStoreKeys,
    ...(request.constraints ?? {}),
  }

  const optimized = optimizeGroceryWithConstraints({
    objective,
    balancedWeights: request.objectiveWeights,
    recipes: request.recipes,
    weeklyMealPlan: request.weeklyMealPlan,
    inventory,
    constraints,
  })

  if (!optimized.bestPlan) {
    const explanation = createOptimizationExplanation({
      objective,
      plan: null,
      constraints,
      feasibleCount: optimized.feasibleCount,
    })

    return {
      ...emptyResult('No feasible optimized plan found for the selected constraints.'),
      optimizationExplanation: explanation,
      baselineCost: optimized.baseline.totalCost,
      planComparison: {
        costDifference: -optimized.baseline.totalCost,
        nutritionDifference: -optimized.baseline.totalNutrition,
        proteinDifference: -optimized.baseline.totalProtein,
        wasteDifference: -optimized.baseline.totalWaste,
      },
    }
  }

  const plansByStore = buildPerStorePlans(optimized.bestPlan.items)
  const summary = {
    strategyLabel: strategyLabelForGoal(request.goal),
    storesToVisit: optimized.bestPlan.storesToVisit.length,
    totalExpectedCost: optimized.bestPlan.totalCost,
    expectedSavings: Math.max(0, optimized.baseline.totalCost - optimized.bestPlan.totalCost),
    expectedNutritionScore: optimized.bestPlan.totalNutrition,
  }

  const explanation = createOptimizationExplanation({
    objective,
    plan: optimized.bestPlan,
    constraints,
    feasibleCount: optimized.feasibleCount,
  })

  const comparison = {
    costDifference: optimized.bestPlan.totalCost - optimized.baseline.totalCost,
    nutritionDifference: optimized.bestPlan.totalNutrition - optimized.baseline.totalNutrition,
    proteinDifference: optimized.bestPlan.totalProtein - optimized.baseline.totalProtein,
    wasteDifference: optimized.bestPlan.totalWaste - optimized.baseline.totalWaste,
  }

  return {
    requirements: optimized.bestPlan.requirements as GroceryRequirement[],
    plansByStore,
    storesToVisit: optimized.bestPlan.storesToVisit,
    totalExpectedCost: optimized.bestPlan.totalCost,
    expectedNutritionScore: optimized.bestPlan.totalNutrition,
    expectedSavings: summary.expectedSavings,
    baselineCost: optimized.baseline.totalCost,
    summary,
    optimizationExplanation: explanation,
    planComparison: comparison,
    printableShoppingList: buildPrintableList(plansByStore, summary, explanation, comparison),
  }
}
