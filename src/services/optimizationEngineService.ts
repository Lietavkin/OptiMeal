import type {
  GroceryOptimizationGoal,
  GroceryRequirement,
  GroceryStore,
  ObjectiveWeightMap,
  OptimizationConstraintSet,
  OptimizationGoal,
  OptimizationObjectiveKey,
  OptimizationRecommendation,
  OptimizationScoreBreakdown,
  PantryItem,
  Recipe,
  ShoppingPlanItem,
  StoreInventoryItem,
  StoreInventoryNutrition,
  WeeklyMealPlan,
} from '../types'

type RecipeServingDecision = {
  recipe: Recipe
  servings: number
}

type ObjectiveMetrics = {
  totalCost: number
  totalNutrition: number
  totalProtein: number
  totalWaste: number
  totalCookingMinutes: number
  storeTrips: number
}

type ObjectiveEvaluator = (metrics: ObjectiveMetrics, weights?: Partial<ObjectiveWeightMap>) => number

type GroceryCandidatePlan = {
  decisions: RecipeServingDecision[]
  requirements: GroceryRequirement[]
  items: ShoppingPlanItem[]
  storesToVisit: GroceryStore[]
  totalCost: number
  totalNutrition: number
  totalProtein: number
  totalWaste: number
  totalCookingMinutes: number
  objectiveScore: number
}

const UNIT_TO_BASE_FACTOR: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  unit: 1,
  pcs: 1,
  piece: 1,
}

const objectiveEvaluators = new Map<string, ObjectiveEvaluator>([
  ['minimize_cost', (m) => -m.totalCost],
  ['maximize_nutrition', (m) => m.totalNutrition - m.totalCost * 0.2],
  ['maximize_protein', (m) => m.totalProtein * 2 - m.totalCost * 0.25],
  ['minimize_food_waste', (m) => -(m.totalWaste * 2 + m.totalCost * 0.3)],
  ['minimize_cooking_time', (m) => -(m.totalCookingMinutes + m.totalCost * 0.2)],
  ['minimize_store_travel', (m) => -(m.storeTrips * 18 + m.totalCost * 0.2)],
  [
    'balanced',
    (m, w) => {
      const weights: Partial<ObjectiveWeightMap> = {
        minimize_cost: 1,
        maximize_nutrition: 1,
        maximize_protein: 1,
        minimize_food_waste: 1,
        minimize_cooking_time: 1,
        minimize_store_travel: 1,
        ...w,
      }

      return (
        (weights.minimize_cost ?? 1) * -m.totalCost +
        (weights.maximize_nutrition ?? 1) * m.totalNutrition +
        (weights.maximize_protein ?? 1) * m.totalProtein * 1.2 +
        (weights.minimize_food_waste ?? 1) * -m.totalWaste * 1.1 +
        (weights.minimize_cooking_time ?? 1) * -m.totalCookingMinutes * 0.12 +
        (weights.minimize_store_travel ?? 1) * -m.storeTrips * 12
      )
    },
  ],
])

export function registerOptimizationObjective(name: string, evaluator: ObjectiveEvaluator) {
  objectiveEvaluators.set(name, evaluator)
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function normalizeUnit(value: string) {
  return normalizeText(value || 'unit')
}

function toBaseUnitQuantity(quantity: number, unit: string) {
  const factor = UNIT_TO_BASE_FACTOR[normalizeUnit(unit)] ?? 1
  return Math.max(0, quantity) * factor
}

function ingredientNamesMatch(left: string, right: string) {
  const a = normalizeText(left)
  const b = normalizeText(right)
  if (!a || !b) return false
  if (a.includes(b) || b.includes(a)) return true

  const aTokens = a.split(/\s+/).filter(Boolean)
  const bTokens = b.split(/\s+/).filter(Boolean)
  const overlap = bTokens.filter((token) => aTokens.includes(token)).length
  return overlap >= Math.max(1, Math.floor(bTokens.length * 0.5))
}

function toNutritionScore(nutrition: StoreInventoryNutrition) {
  return nutrition.calories * 0.35 + nutrition.protein * 2 + nutrition.carbs * 0.5 + nutrition.fat * 0.8
}

function aggregateRestaurantMacros(restaurantMeals: OptimizationConstraintSet['restaurantMeals']) {
  return (restaurantMeals ?? []).reduce(
    (acc, meal) => {
      acc.calories += meal.calories
      acc.protein += meal.protein
      acc.carbs += meal.carbs
      acc.fat += meal.fat
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

function recipeViolatesHardRestrictions(recipe: Recipe, constraints: OptimizationConstraintSet) {
  const ingredientNames = recipe.ingredients.map((ingredient) => normalizeText(ingredient.displayName))

  const allergies = (constraints.allergies ?? []).map(normalizeText)
  if (allergies.some((token) => token && ingredientNames.some((name) => name.includes(token)))) {
    return true
  }

  const restrictionTokens = (constraints.dietaryRestrictions ?? []).map(normalizeText)
  if (restrictionTokens.includes('vegan')) {
    const veganBlocked = ['chicken', 'beef', 'pork', 'egg', 'milk', 'cheese', 'yogurt', 'fish', 'salmon', 'turkey']
    if (ingredientNames.some((name) => veganBlocked.some((token) => name.includes(token)))) {
      return true
    }
  }

  if (restrictionTokens.includes('vegetarian')) {
    const vegetarianBlocked = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey']
    if (ingredientNames.some((name) => vegetarianBlocked.some((token) => name.includes(token)))) {
      return true
    }
  }

  if (restrictionTokens.includes('keto') && recipe.nutrition.perServing.carbs > 20) {
    return true
  }

  if (
    constraints.maxCookingMinutesPerRecipe !== undefined &&
    (recipe.cookingTimeMinutes ?? 0) > constraints.maxCookingMinutesPerRecipe
  ) {
    return true
  }

  return false
}

function buildRequirements(decisions: RecipeServingDecision[], pantry: PantryItem[] = []): GroceryRequirement[] {
  const byRequirement = new Map<string, GroceryRequirement>()

  decisions.forEach((decision) => {
    const ratio = decision.servings / Math.max(1, decision.recipe.servings)
    decision.recipe.ingredients.forEach((ingredient) => {
      const quantity = Math.max(0, ingredient.quantity * ratio)
      if (quantity <= 0) return

      const key = `${normalizeText(ingredient.displayName)}:${normalizeUnit(ingredient.unit)}`
      const existing = byRequirement.get(key)
      if (existing) {
        existing.quantity += quantity
      } else {
        byRequirement.set(key, {
          key,
          ingredientName: ingredient.displayName,
          quantity,
          unit: ingredient.unit,
          category: 'General',
        })
      }
    })
  })

  const adjusted = Array.from(byRequirement.values()).map((requirement) => {
    const pantryQuantity = pantry
      .filter((item) => ingredientNamesMatch(item.ingredientName, requirement.ingredientName))
      .reduce((sum, item) => sum + toBaseUnitQuantity(item.quantity, item.unit), 0)

    const requiredBaseQuantity = toBaseUnitQuantity(requirement.quantity, requirement.unit)
    const adjustedBase = Math.max(0, requiredBaseQuantity - pantryQuantity)

    return {
      ...requirement,
      quantity: adjustedBase / Math.max(UNIT_TO_BASE_FACTOR[normalizeUnit(requirement.unit)] ?? 1, 1),
    }
  })

  return adjusted.filter((requirement) => requirement.quantity > 0)
}

function scoreItemForObjective(
  item: StoreInventoryItem,
  requirement: GroceryRequirement,
  objective: OptimizationObjectiveKey,
  balancedWeights?: Partial<ObjectiveWeightMap>,
) {
  const requirementBase = toBaseUnitQuantity(requirement.quantity, requirement.unit)
  const packageBase = toBaseUnitQuantity(item.packageSize, item.packageUnit)
  if (packageBase <= 0) return null

  const packageCount = Math.max(1, Math.ceil(requirementBase / packageBase))
  const totalCost = item.estimatedPrice * packageCount
  const covered = packageCount * packageBase
  const waste = Math.max(0, covered - requirementBase)
  const nutrition = {
    calories: item.nutrition.calories * packageCount,
    protein: item.nutrition.protein * packageCount,
    carbs: item.nutrition.carbs * packageCount,
    fat: item.nutrition.fat * packageCount,
  }

  const metrics: ObjectiveMetrics = {
    totalCost,
    totalNutrition: toNutritionScore(nutrition),
    totalProtein: nutrition.protein,
    totalWaste: waste,
    totalCookingMinutes: 0,
    storeTrips: 1,
  }

  const evaluator = objectiveEvaluators.get(objective) ?? objectiveEvaluators.get('balanced')
  const score = evaluator ? evaluator(metrics, balancedWeights) : -totalCost

  return {
    packageCount,
    totalCost,
    waste,
    nutrition,
    score,
  }
}

function macroConstraintsSatisfied(
  decisions: RecipeServingDecision[],
  constraints: OptimizationConstraintSet,
) {
  if (!constraints.macroTargets) return true

  const fromRecipes = decisions.reduce(
    (acc, decision) => {
      const ratio = decision.servings / Math.max(1, decision.recipe.servings)
      acc.calories += decision.recipe.nutrition.totalCalories * ratio
      acc.protein += decision.recipe.nutrition.totalProtein * ratio
      acc.carbs += decision.recipe.nutrition.totalCarbs * ratio
      acc.fat += decision.recipe.nutrition.totalFat * ratio
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const restaurant = aggregateRestaurantMacros(constraints.restaurantMeals)
  const total = {
    calories: fromRecipes.calories + restaurant.calories,
    protein: fromRecipes.protein + restaurant.protein,
    carbs: fromRecipes.carbs + restaurant.carbs,
    fat: fromRecipes.fat + restaurant.fat,
  }

  const target = constraints.macroTargets

  return (
    total.calories >= target.calories * 0.8 &&
    total.calories <= target.calories * 1.2 &&
    total.protein >= target.protein * 0.9 &&
    total.protein <= target.protein * 1.4 &&
    total.carbs >= target.carbs * 0.85 &&
    total.carbs <= target.carbs * 1.4 &&
    total.fat >= target.fat * 0.85 &&
    total.fat <= target.fat * 1.4
  )
}

function objectiveFromRecipeGoal(goal: OptimizationGoal): OptimizationObjectiveKey {
  switch (goal) {
    case 'lowest_cost':
    case 'student_budget':
    case 'family_budget':
      return 'minimize_cost'
    case 'healthiest':
      return 'maximize_nutrition'
    case 'muscle_gain':
      return 'maximize_protein'
    case 'fastest_cooking':
      return 'minimize_cooking_time'
    case 'lowest_food_waste':
      return 'minimize_food_waste'
    case 'fat_loss':
    case 'balanced':
    default:
      return 'balanced'
  }
}

export function objectiveFromGroceryGoal(goal: GroceryOptimizationGoal): OptimizationObjectiveKey {
  switch (goal) {
    case 'lowest_total_cost':
      return 'minimize_cost'
    case 'highest_nutrition':
      return 'maximize_nutrition'
    case 'best_nutrition_per_dollar':
      return 'balanced'
    case 'lowest_food_waste':
      return 'minimize_food_waste'
    case 'fastest_shopping':
    case 'single_store_only':
      return 'minimize_store_travel'
    case 'multi_store_optimized':
    default:
      return 'balanced'
  }
}

function toScoreBreakdown(recipe: Recipe, objective: OptimizationObjectiveKey): OptimizationScoreBreakdown {
  const costPerServing = recipe.servings > 0 ? recipe.estimatedCost / recipe.servings : recipe.estimatedCost
  const costScore = Math.max(0, 100 - costPerServing * 12)
  const proteinDensity = recipe.nutrition.perServing.calories > 0
    ? (recipe.nutrition.perServing.protein * 4) / recipe.nutrition.perServing.calories
    : 0
  const proteinDensityScore = Math.min(100, proteinDensity * 220)
  const macroBalance =
    Math.abs(recipe.nutrition.perServing.protein - recipe.nutrition.perServing.carbs) +
    Math.abs(recipe.nutrition.perServing.fat * 2 - recipe.nutrition.perServing.protein)
  const healthScore = Math.max(0, 100 - macroBalance * 0.7)
  const speedScore = Math.max(0, 100 - (recipe.cookingTimeMinutes ?? 45) * 1.7)
  const wasteScore = Math.max(0, 100 - recipe.ingredients.length * 2.2)

  const metrics: ObjectiveMetrics = {
    totalCost: recipe.estimatedCost,
    totalNutrition: toNutritionScore(recipe.nutrition.perServing),
    totalProtein: recipe.nutrition.perServing.protein,
    totalWaste: recipe.ingredients.length,
    totalCookingMinutes: recipe.cookingTimeMinutes ?? 0,
    storeTrips: 1,
  }

  const evaluator = objectiveEvaluators.get(objective) ?? objectiveEvaluators.get('balanced')

  return {
    total: evaluator ? evaluator(metrics) : costScore,
    costScore,
    healthScore,
    speedScore,
    proteinDensityScore,
    wasteScore,
  }
}

export function rankRecipesWithOptimization(args: {
  goal: OptimizationGoal
  recipes: Recipe[]
  limit: number
  constraints?: Pick<OptimizationConstraintSet, 'budget' | 'maxCookingMinutesPerRecipe' | 'allergies' | 'dietaryRestrictions'>
}): OptimizationRecommendation[] {
  const objective = objectiveFromRecipeGoal(args.goal)

  const feasibleRecipes = args.recipes.filter((recipe) =>
    !recipeViolatesHardRestrictions(recipe, {
      allergies: args.constraints?.allergies,
      dietaryRestrictions: args.constraints?.dietaryRestrictions,
      maxCookingMinutesPerRecipe: args.constraints?.maxCookingMinutesPerRecipe,
    }),
  )

  const withBudget = feasibleRecipes.filter((recipe) =>
    args.constraints?.budget !== undefined ? recipe.estimatedCost <= args.constraints.budget : true,
  )

  const scored = withBudget
    .map((recipe) => {
      const score = toScoreBreakdown(recipe, objective)
      return {
        recipe,
        score,
        rationale: `Optimized with ${objective.replaceAll('_', ' ')} objective under active hard constraints.`,
      }
    })
    .sort((a, b) => b.score.total - a.score.total)

  return scored.slice(0, Math.max(1, args.limit))
}

function evaluateGroceryPlan(args: {
  decisions: RecipeServingDecision[]
  inventory: StoreInventoryItem[]
  objective: OptimizationObjectiveKey
  balancedWeights?: Partial<ObjectiveWeightMap>
  constraints: OptimizationConstraintSet
}): GroceryCandidatePlan | null {
  if (args.decisions.length === 0) return null

  const requirements = buildRequirements(args.decisions, args.constraints.pantryItems)
  if (requirements.length === 0) {
    return {
      decisions: args.decisions,
      requirements: [],
      items: [],
      storesToVisit: [],
      totalCost: 0,
      totalNutrition: 0,
      totalProtein: 0,
      totalWaste: 0,
      totalCookingMinutes: 0,
      objectiveScore: 0,
    }
  }

  const items: ShoppingPlanItem[] = []

  for (const requirement of requirements) {
    const candidates = args.inventory.filter((item) =>
      item.availability && ingredientNamesMatch(`${item.brand} ${item.name}`, requirement.ingredientName),
    )

    if (candidates.length === 0) return null

    const winner = candidates
      .map((item) => {
        const scored = scoreItemForObjective(item, requirement, args.objective, args.balancedWeights)
        if (!scored) return null
        return { item, ...scored }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null)
      .sort((a, b) => b.score - a.score)[0]

    if (!winner) return null

    items.push({
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
      wasteQuantity: winner.waste,
      nutrition: winner.nutrition,
      store: winner.item.store,
    })
  }

  const storesToVisit = Array.from(new Map(items.map((item) => [item.store.key, item.store])).values())
  const maxTrips = args.constraints.maxShoppingTrips
  if (maxTrips !== undefined && storesToVisit.length > maxTrips) {
    return null
  }

  const totalCost = items.reduce((sum, item) => sum + item.estimatedTotalPrice, 0)
  if (args.constraints.budget !== undefined && totalCost > args.constraints.budget) {
    return null
  }

  if (!macroConstraintsSatisfied(args.decisions, args.constraints)) {
    return null
  }

  const totalCookingMinutes = args.decisions.reduce(
    (sum, decision) => sum + (decision.recipe.cookingTimeMinutes ?? 0),
    0,
  )

  if (
    args.constraints.maxTotalCookingMinutes !== undefined &&
    totalCookingMinutes > args.constraints.maxTotalCookingMinutes
  ) {
    return null
  }

  const metrics: ObjectiveMetrics = {
    totalCost,
    totalNutrition: items.reduce((sum, item) => sum + toNutritionScore(item.nutrition), 0),
    totalProtein: items.reduce((sum, item) => sum + item.nutrition.protein, 0),
    totalWaste: items.reduce((sum, item) => sum + item.wasteQuantity, 0),
    totalCookingMinutes,
    storeTrips: storesToVisit.length,
  }

  const evaluator = objectiveEvaluators.get(args.objective) ?? objectiveEvaluators.get('balanced')
  const objectiveScore = evaluator ? evaluator(metrics, args.balancedWeights) : -metrics.totalCost

  return {
    decisions: args.decisions,
    requirements,
    items,
    storesToVisit,
    totalCost,
    totalNutrition: metrics.totalNutrition,
    totalProtein: metrics.totalProtein,
    totalWaste: metrics.totalWaste,
    totalCookingMinutes,
    objectiveScore,
  }
}

function buildHeuristicBaseline(args: {
  decisions: RecipeServingDecision[]
  inventory: StoreInventoryItem[]
  constraints: OptimizationConstraintSet
}) {
  const requirements = buildRequirements(args.decisions, args.constraints.pantryItems)
  const items: ShoppingPlanItem[] = []

  for (const requirement of requirements) {
    const best = args.inventory
      .filter((item) => item.availability && ingredientNamesMatch(`${item.brand} ${item.name}`, requirement.ingredientName))
      .map((item) => {
        const requirementBase = toBaseUnitQuantity(requirement.quantity, requirement.unit)
        const packageBase = toBaseUnitQuantity(item.packageSize, item.packageUnit)
        if (packageBase <= 0) return null

        const packageCount = Math.max(1, Math.ceil(requirementBase / packageBase))
        const totalPrice = item.estimatedPrice * packageCount
        const wasteQuantity = Math.max(0, packageCount * packageBase - requirementBase)

        return {
          item,
          packageCount,
          totalPrice,
          wasteQuantity,
        }
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null)
      .sort((a, b) => a.totalPrice - b.totalPrice)[0]

    if (!best) continue

    items.push({
      requirementKey: requirement.key,
      ingredientName: requirement.ingredientName,
      category: requirement.category,
      requiredQuantity: requirement.quantity,
      requiredUnit: requirement.unit,
      productName: best.item.name,
      brand: best.item.brand,
      packageSize: best.item.packageSize,
      packageUnit: best.item.packageUnit,
      packageCount: best.packageCount,
      estimatedTotalPrice: best.totalPrice,
      wasteQuantity: best.wasteQuantity,
      nutrition: {
        calories: best.item.nutrition.calories * best.packageCount,
        protein: best.item.nutrition.protein * best.packageCount,
        carbs: best.item.nutrition.carbs * best.packageCount,
        fat: best.item.nutrition.fat * best.packageCount,
      },
      store: best.item.store,
    })
  }

  return {
    totalCost: items.reduce((sum, item) => sum + item.estimatedTotalPrice, 0),
    totalNutrition: items.reduce((sum, item) => sum + toNutritionScore(item.nutrition), 0),
    totalProtein: items.reduce((sum, item) => sum + item.nutrition.protein, 0),
    totalWaste: items.reduce((sum, item) => sum + item.wasteQuantity, 0),
  }
}

function buildExplanation(args: {
  objective: OptimizationObjectiveKey
  plan: GroceryCandidatePlan
  constraints: OptimizationConstraintSet
  feasibleCount: number
}) {
  const notes: string[] = []

  notes.push(`Objective ${args.objective.replaceAll('_', ' ')} produced the highest feasible score among ${args.feasibleCount} candidate plans.`)

  if (args.constraints.budget !== undefined) {
    notes.push(`Budget constraint: ${args.plan.totalCost.toFixed(2)} / ${args.constraints.budget.toFixed(2)}.`)
  }

  if (args.constraints.maxShoppingTrips !== undefined) {
    notes.push(`Store trips constraint: ${args.plan.storesToVisit.length} / ${args.constraints.maxShoppingTrips}.`)
  }

  if (args.constraints.maxTotalCookingMinutes !== undefined) {
    notes.push(`Cooking time constraint: ${args.plan.totalCookingMinutes.toFixed(0)} / ${args.constraints.maxTotalCookingMinutes.toFixed(0)} minutes.`)
  }

  if (args.constraints.macroTargets) {
    notes.push('Macro targets were treated as hard constraints with bounded tolerance for feasibility.')
  }

  return notes.join(' ')
}

export function optimizeGroceryWithConstraints(args: {
  objective: OptimizationObjectiveKey
  balancedWeights?: Partial<ObjectiveWeightMap>
  recipes: Recipe[]
  weeklyMealPlan: WeeklyMealPlan
  inventory: StoreInventoryItem[]
  constraints: OptimizationConstraintSet
}): {
  bestPlan: GroceryCandidatePlan | null
  baseline: ReturnType<typeof buildHeuristicBaseline>
  feasibleCount: number
} {
  const recipeById = new Map(args.recipes.map((recipe) => [recipe.id, recipe]))
  const filteredInventory =
    args.constraints.preferredStores && args.constraints.preferredStores.length > 0
      ? args.inventory.filter((item) => args.constraints.preferredStores?.includes(item.store.key))
      : args.inventory

  const entryDecisions = args.weeklyMealPlan.entries
    .map((entry) => {
      const recipe = recipeById.get(entry.recipeId)
      if (!recipe) return null
      if (recipeViolatesHardRestrictions(recipe, args.constraints)) return null
      const servingOptions = Array.from(
        new Set([
          0,
          Math.max(1, Math.round(entry.plannedServings - 1)),
          Math.max(1, Math.round(entry.plannedServings)),
          Math.max(1, Math.round(entry.plannedServings + 1)),
        ]),
      ).sort((a, b) => a - b)

      return { recipe, servingOptions }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)

  if (entryDecisions.length === 0) {
    return {
      bestPlan: null,
      baseline: { totalCost: 0, totalNutrition: 0, totalProtein: 0, totalWaste: 0 },
      feasibleCount: 0,
    }
  }

  const mealFrequencyMin = Math.max(0, args.constraints.mealFrequency?.min ?? 0)
  const mealFrequencyMax = Math.max(mealFrequencyMin, args.constraints.mealFrequency?.max ?? entryDecisions.length)

  let bestPlan: GroceryCandidatePlan | null = null
  let feasibleCount = 0
  const current: RecipeServingDecision[] = []

  function search(index: number) {
    if (index >= entryDecisions.length) {
      const selectedCount = current.filter((entry) => entry.servings > 0).length
      if (selectedCount < mealFrequencyMin || selectedCount > mealFrequencyMax) {
        return
      }

      const decisions = current.filter((entry) => entry.servings > 0)
      const evaluated = evaluateGroceryPlan({
        decisions,
        inventory: filteredInventory,
        objective: args.objective,
        balancedWeights: args.balancedWeights,
        constraints: args.constraints,
      })

      if (!evaluated) return

      feasibleCount += 1
      if (!bestPlan || evaluated.objectiveScore > bestPlan.objectiveScore) {
        bestPlan = evaluated
      }
      return
    }

    const option = entryDecisions[index]
    for (const servings of option.servingOptions) {
      current.push({ recipe: option.recipe, servings })
      search(index + 1)
      current.pop()
    }
  }

  search(0)

  const baselineDecisions = entryDecisions.map((entry) => ({
    recipe: entry.recipe,
    servings: Math.max(1, Math.round(entry.servingOptions.find((value) => value > 0) ?? 1)),
  }))

  const baseline = buildHeuristicBaseline({
    decisions: baselineDecisions,
    inventory: filteredInventory,
    constraints: args.constraints,
  })

  return {
    bestPlan,
    baseline,
    feasibleCount,
  }
}

export function createOptimizationExplanation(args: {
  objective: OptimizationObjectiveKey
  plan: GroceryCandidatePlan | null
  constraints: OptimizationConstraintSet
  feasibleCount: number
}) {
  if (!args.plan) {
    return 'No feasible optimized plan was found under the active hard constraints. Falling back to the heuristic baseline.'
  }

  return buildExplanation({
    objective: args.objective,
    plan: args.plan,
    constraints: args.constraints,
    feasibleCount: args.feasibleCount,
  })
}
