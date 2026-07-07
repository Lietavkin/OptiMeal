import type {
  GroceryOptimizationGoal,
  GroceryOptimizationRequest,
  GroceryOptimizationResult,
  GroceryRequirement,
  GroceryStore,
  ShoppingPlanByStore,
  ShoppingPlanItem,
  StoreInventoryItem,
} from '../types'

type GoalWeights = {
  cost: number
  nutrition: number
  waste: number
  storePenalty: number
}

const defaultStorePenalty = 3.25

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function namesMatch(a: string, b: string) {
  const left = normalizeName(a)
  const right = normalizeName(b)
  return left.includes(right) || right.includes(left)
}

function nutritionScore(item: StoreInventoryItem) {
  const macroDensity = item.nutrition.protein * 2 + item.nutrition.carbs * 0.5 + item.nutrition.fat * 0.8
  return item.nutrition.calories * 0.35 + macroDensity
}

function getGoalWeights(goal: GroceryOptimizationGoal): GoalWeights {
  switch (goal) {
    case 'lowest_total_cost':
      return { cost: 3, nutrition: 0.7, waste: 1, storePenalty: 1.2 }
    case 'highest_nutrition':
      return { cost: 0.8, nutrition: 3, waste: 1, storePenalty: 0.8 }
    case 'best_nutrition_per_dollar':
      return { cost: 1.6, nutrition: 2.4, waste: 1, storePenalty: 1 }
    case 'lowest_food_waste':
      return { cost: 1.4, nutrition: 1.2, waste: 3, storePenalty: 1 }
    case 'fastest_shopping':
      return { cost: 1.1, nutrition: 1, waste: 1, storePenalty: 3.2 }
    case 'single_store_only':
      return { cost: 1.2, nutrition: 1.4, waste: 1, storePenalty: 4 }
    case 'multi_store_optimized':
      return { cost: 2.2, nutrition: 1.5, waste: 1.4, storePenalty: 0.8 }
    default:
      return { cost: 1.5, nutrition: 1.5, waste: 1.5, storePenalty: 1.5 }
  }
}

function computeRequiredIngredients(request: GroceryOptimizationRequest): GroceryRequirement[] {
  const recipeMap = new Map(request.recipes.map((recipe) => [recipe.id, recipe]))
  const requirements = new Map<string, GroceryRequirement>()

  request.weeklyMealPlan.entries.forEach((entry) => {
    const recipe = recipeMap.get(entry.recipeId)
    if (!recipe) return

    const multiplier = entry.plannedServings / Math.max(1, recipe.servings)
    recipe.ingredients.forEach((ingredient) => {
      const normalized = normalizeName(ingredient.displayName)
      const key = `${normalized}:${ingredient.unit}`
      const quantity = Math.max(0, ingredient.quantity * multiplier)
      if (quantity <= 0) return

      const catalogMatch = request.ingredientCatalog.find(
        (catalogItem) => normalizeName(catalogItem.canonicalName) === normalized,
      )

      const existing = requirements.get(key)
      if (existing) {
        existing.quantity += quantity
        return
      }

      requirements.set(key, {
        key,
        ingredientName: ingredient.displayName,
        quantity,
        unit: ingredient.unit,
        category: catalogMatch?.category ?? 'General',
      })
    })
  })

  const pantry = request.pantry ?? []

  const adjusted = Array.from(requirements.values()).map((requirement) => {
    const pantryQuantity = pantry
      .filter((item) => namesMatch(item.ingredientName, requirement.ingredientName))
      .reduce((sum, item) => sum + Math.max(0, item.quantity), 0)

    return {
      ...requirement,
      quantity: Math.max(0, requirement.quantity - pantryQuantity),
    }
  })

  return adjusted.filter((requirement) => requirement.quantity > 0)
}

function selectBestProduct(
  requirement: GroceryRequirement,
  candidates: StoreInventoryItem[],
  goal: GroceryOptimizationGoal,
): ShoppingPlanItem | null {
  if (candidates.length === 0) return null

  const weights = getGoalWeights(goal)
  const scored = candidates
    .filter((item) => item.availability)
    .map((item) => {
      const packageCount = Math.max(1, Math.ceil(requirement.quantity / Math.max(item.packageSize, 1)))
      const totalCost = item.estimatedPrice * packageCount
      const wasteQuantity = Math.max(0, packageCount * item.packageSize - requirement.quantity)
      const totalNutrition = nutritionScore(item) * packageCount
      const nutritionPerDollar = totalCost > 0 ? totalNutrition / totalCost : 0

      const score =
        weights.nutrition * (goal === 'best_nutrition_per_dollar' ? nutritionPerDollar : totalNutrition) -
        weights.cost * totalCost -
        weights.waste * wasteQuantity

      return {
        item,
        packageCount,
        totalCost,
        wasteQuantity,
        totalNutrition,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)

  const winner = scored[0]
  if (!winner) return null

  return {
    requirementKey: requirement.key,
    ingredientName: requirement.ingredientName,
    category: requirement.category,
    requiredQuantity: requirement.quantity,
    requiredUnit: requirement.unit,
    productName: winner.item.name,
    brand: winner.item.brand,
    packageSize: winner.item.packageSize,
    packageUnit: winner.item.packageUnit,
    packageCount: winner.packageCount,
    estimatedTotalPrice: winner.totalCost,
    wasteQuantity: winner.wasteQuantity,
    nutrition: {
      calories: winner.item.nutrition.calories * winner.packageCount,
      protein: winner.item.nutrition.protein * winner.packageCount,
      carbs: winner.item.nutrition.carbs * winner.packageCount,
      fat: winner.item.nutrition.fat * winner.packageCount,
    },
    store: winner.item.store,
  }
}

function buildPerStorePlans(items: ShoppingPlanItem[]): ShoppingPlanByStore[] {
  const grouped = new Map<string, ShoppingPlanByStore>()

  items.forEach((item) => {
    const existing = grouped.get(item.store.key)
    if (!existing) {
      grouped.set(item.store.key, {
        store: item.store,
        items: [item],
        totalCost: item.estimatedTotalPrice,
        nutritionScore: nutritionScore({
          id: 'aggregate',
          store: item.store,
          name: 'aggregate',
          brand: 'aggregate',
          category: 'aggregate',
          packageSize: 1,
          packageUnit: 'unit',
          nutrition: item.nutrition,
          estimatedPrice: item.estimatedTotalPrice,
          currency: 'USD',
          availability: true,
          lastUpdated: new Date().toISOString(),
          ingredientId: null,
        }),
      })
      return
    }

    existing.items.push(item)
    existing.totalCost += item.estimatedTotalPrice
    existing.nutritionScore += item.nutrition.calories * 0.35 + item.nutrition.protein * 2 + item.nutrition.carbs * 0.5 + item.nutrition.fat * 0.8
  })

  return Array.from(grouped.values()).sort((a, b) => a.totalCost - b.totalCost)
}

function buildPrintableList(plansByStore: ShoppingPlanByStore[], summary: GroceryOptimizationResult['summary']) {
  const header = [
    'OptiMeal Grocery Plan',
    `Strategy: ${summary.strategyLabel}`,
    `Stores: ${summary.storesToVisit}`,
    `Expected Total: $${summary.totalExpectedCost.toFixed(2)}`,
    `Expected Savings: $${summary.expectedSavings.toFixed(2)}`,
    `Nutrition Score: ${summary.expectedNutritionScore.toFixed(1)}`,
    '',
  ]

  const lines = plansByStore.flatMap((storePlan) => {
    const aisleGroups = new Map<string, ShoppingPlanItem[]>()
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

function chooseSingleStorePlan(requirements: GroceryRequirement[], inventory: StoreInventoryItem[], goal: GroceryOptimizationGoal) {
  const byStore = new Map<string, StoreInventoryItem[]>()
  inventory.forEach((item) => {
    const list = byStore.get(item.store.key) ?? []
    list.push(item)
    byStore.set(item.store.key, list)
  })

  let bestItems: ShoppingPlanItem[] = []
  let bestStore: GroceryStore | null = null
  let bestScore = Number.NEGATIVE_INFINITY

  byStore.forEach((storeItems) => {
    const current: ShoppingPlanItem[] = []
    let missingCount = 0

    requirements.forEach((requirement) => {
      const candidates = storeItems.filter((item) => normalizeName(item.name).includes(normalizeName(requirement.ingredientName)))
      const best = selectBestProduct(requirement, candidates, goal)
      if (!best) {
        missingCount += 1
      } else {
        current.push(best)
      }
    })

    const cost = current.reduce((sum, item) => sum + item.estimatedTotalPrice, 0)
    const nutrition = current.reduce((sum, item) => sum + nutritionScore({
      id: 'nutrition',
      store: item.store,
      name: item.productName,
      brand: item.brand,
      category: item.category,
      packageSize: item.packageSize,
      packageUnit: item.packageUnit,
      nutrition: item.nutrition,
      estimatedPrice: item.estimatedTotalPrice,
      currency: 'USD',
      availability: true,
      lastUpdated: new Date().toISOString(),
      ingredientId: null,
    }), 0)

    const weightedScore = nutrition - cost * 2.2 - missingCount * 100
    if (weightedScore > bestScore) {
      bestScore = weightedScore
      bestItems = current
      bestStore = current[0]?.store ?? storeItems[0]?.store ?? null
    }
  })

  return { items: bestItems, store: bestStore }
}

export async function optimizeWeeklyGroceryPlan(request: GroceryOptimizationRequest): Promise<GroceryOptimizationResult> {
  const requirements = computeRequiredIngredients(request)
  if (requirements.length === 0) {
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
      printableShoppingList: 'OptiMeal Grocery Plan\nNo shopping items were generated.',
    }
  }

  const inventory = await request.inventoryProvider.getInventory({
    ingredientNames: requirements.map((item) => item.ingredientName),
    onlyAvailable: true,
    storeKeys: request.allowedStoreKeys,
  })

  let selectedItems: ShoppingPlanItem[] = []

  const singleStoreMode = request.goal === 'single_store_only' || request.goal === 'fastest_shopping'

  if (singleStoreMode) {
    const chosen = chooseSingleStorePlan(requirements, inventory, request.goal)
    selectedItems = chosen.items
  } else {
    requirements.forEach((requirement) => {
      const candidates = inventory.filter((item) => normalizeName(item.name).includes(normalizeName(requirement.ingredientName)))
      const best = selectBestProduct(requirement, candidates, request.goal)
      if (best) selectedItems.push(best)
    })
  }

  if (selectedItems.length === 0) {
    return {
      requirements,
      plansByStore: [],
      storesToVisit: [],
      totalExpectedCost: 0,
      expectedNutritionScore: 0,
      expectedSavings: 0,
      baselineCost: 0,
      summary: {
        strategyLabel: 'No matching inventory',
        storesToVisit: 0,
        totalExpectedCost: 0,
        expectedSavings: 0,
        expectedNutritionScore: 0,
      },
      printableShoppingList: 'OptiMeal Grocery Plan\nNo matching inventory found for this weekly plan.',
    }
  }

  const plansByStore = buildPerStorePlans(selectedItems)
  const storesToVisit = plansByStore.map((plan) => plan.store)
  const totalExpectedCost = selectedItems.reduce((sum, item) => sum + item.estimatedTotalPrice, 0)
  const expectedNutritionScore = selectedItems.reduce((sum, item) => sum + item.nutrition.calories * 0.35 + item.nutrition.protein * 2 + item.nutrition.carbs * 0.5 + item.nutrition.fat * 0.8, 0)

  const baselineCost = requirements.reduce((sum, requirement) => {
    const candidates = inventory.filter((item) => normalizeName(item.name).includes(normalizeName(requirement.ingredientName)))
    if (candidates.length === 0) return sum
    const expensive = [...candidates].sort((a, b) => b.estimatedPrice - a.estimatedPrice)[0]
    const packageCount = Math.max(1, Math.ceil(requirement.quantity / Math.max(expensive.packageSize, 1)))
    return sum + expensive.estimatedPrice * packageCount
  }, 0)

  const weights = getGoalWeights(request.goal)
  const totalWithStorePenalty = totalExpectedCost + Math.max(0, storesToVisit.length - 1) * weights.storePenalty * defaultStorePenalty

  const expectedSavings = Math.max(0, baselineCost - totalWithStorePenalty)

  const strategyLabel = {
    lowest_total_cost: 'Lowest total cost',
    highest_nutrition: 'Highest nutrition',
    best_nutrition_per_dollar: 'Best nutrition per dollar',
    lowest_food_waste: 'Lowest food waste',
    fastest_shopping: 'Fastest shopping',
    single_store_only: 'Single-store only',
    multi_store_optimized: 'Multi-store optimized',
  }[request.goal]

  const summary = {
    strategyLabel,
    storesToVisit: storesToVisit.length,
    totalExpectedCost,
    expectedSavings,
    expectedNutritionScore,
  }

  return {
    requirements,
    plansByStore,
    storesToVisit,
    totalExpectedCost,
    expectedNutritionScore,
    expectedSavings,
    baselineCost,
    summary,
    printableShoppingList: buildPrintableList(plansByStore, summary),
  }
}
