import type { ReactNode } from 'react'

export type Feature = {
  icon: string
  title: string
  description: string
}

export type Step = {
  icon: ReactNode
  title: string
  description: string
}

export type Meal = {
  id: string
  userId: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  photoUrl?: string | null
  photoPath?: string | null
  notes?: string
  createdAt: string
  updatedAt?: string
}

export type NutritionGoal = {
  id: string
  user_id: string
  calories: number
  protein: number
  carbs: number
  fat: number
  active: boolean
  created_at: string
}

export type Profile = {
  id: string
  email?: string
  display_name?: string
  daily_calories_goal?: number
  daily_protein_goal?: number
  daily_carbs_goal?: number
  daily_fat_goal?: number
}

export type NutritionSummary = {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

export type IngredientCatalogItem = {
  id: string
  createdBy: string | null
  canonicalName: string
  aliases: string[]
  category: string
  defaultUnit: string
  commonPackageSize: number
  estimatedPricePerUnit: number
  currency: string
  caloriesPerUnit: number
  proteinPerUnit: number
  carbsPerUnit: number
  fatPerUnit: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type IngredientCatalogInput = {
  canonicalName: string
  aliases: string[]
  category: string
  defaultUnit: string
  commonPackageSize: number
  estimatedPricePerUnit: number
  currency: string
  caloriesPerUnit: number
  proteinPerUnit: number
  carbsPerUnit: number
  fatPerUnit: number
  metadata?: Record<string, unknown>
}

export type RecipeIngredient = {
  id: string
  recipeId: string
  ingredientId: string | null
  displayName: string
  quantity: number
  unit: string
  notes?: string | null
  estimatedCost: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type RecipeIngredientDraft = {
  ingredientId: string | null
  displayName: string
  quantity: number
  unit: string
  notes?: string
  estimatedCost: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type RecipeNutrition = {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  perServing: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export type Recipe = {
  id: string
  userId: string
  title: string
  description?: string | null
  servings: number
  cookingTimeMinutes?: number | null
  instructions: string
  estimatedCost: number
  isFavorite: boolean
  nutrition: RecipeNutrition
  ingredients: RecipeIngredient[]
  createdAt: string
  updatedAt: string
}

export type RecipeDraft = {
  title: string
  description?: string
  servings: number
  cookingTimeMinutes?: number | null
  instructions: string
  isFavorite: boolean
  ingredients: RecipeIngredientDraft[]
}

export type OptimizationGoal =
  | 'lowest_cost'
  | 'healthiest'
  | 'balanced'
  | 'muscle_gain'
  | 'fat_loss'
  | 'student_budget'
  | 'family_budget'
  | 'fastest_cooking'
  | 'lowest_food_waste'

export type OptimizationScoreBreakdown = {
  total: number
  costScore: number
  healthScore: number
  speedScore: number
  proteinDensityScore: number
  wasteScore: number
}

export type OptimizationRecommendation = {
  recipe: Recipe
  score: OptimizationScoreBreakdown
  rationale: string
}

export type OptimizationRequest = {
  goal: OptimizationGoal
  recipes: Recipe[]
  maxBudgetPerRecipe?: number
  maxCookingMinutes?: number
  limit?: number
}

export type StoreKey = 'lidl' | 'kaufland' | 'tesco' | 'carrefour' | 'aldi'

export type GroceryStore = {
  key: StoreKey
  name: string
}

export type StoreInventoryNutrition = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type StoreInventoryItem = {
  id: string
  store: GroceryStore
  ingredientId: string | null
  name: string
  brand: string
  category: string
  packageSize: number
  packageUnit: string
  nutrition: StoreInventoryNutrition
  estimatedPrice: number
  currency: string
  availability: boolean
  lastUpdated: string
}

export type StoreInventoryQuery = {
  ingredientNames?: string[]
  storeKeys?: StoreKey[]
  categories?: string[]
  onlyAvailable?: boolean
}

export type StoreInventoryProvider = {
  getInventory: (query?: StoreInventoryQuery) => Promise<StoreInventoryItem[]>
}

export type WeeklyMealPlanEntry = {
  recipeId: string
  plannedServings: number
}

export type WeeklyMealPlan = {
  entries: WeeklyMealPlanEntry[]
}

export type GroceryRequirement = {
  key: string
  ingredientName: string
  quantity: number
  unit: string
  category: string
}

export type GroceryOptimizationGoal =
  | 'lowest_total_cost'
  | 'highest_nutrition'
  | 'best_nutrition_per_dollar'
  | 'lowest_food_waste'
  | 'fastest_shopping'
  | 'single_store_only'
  | 'multi_store_optimized'

export type ShoppingPlanItem = {
  requirementKey: string
  ingredientName: string
  category: string
  requiredQuantity: number
  requiredUnit: string
  productName: string
  brand: string
  packageSize: number
  packageUnit: string
  packageCount: number
  estimatedTotalPrice: number
  wasteQuantity: number
  nutrition: StoreInventoryNutrition
  store: GroceryStore
}

export type ShoppingPlanByStore = {
  store: GroceryStore
  items: ShoppingPlanItem[]
  totalCost: number
  nutritionScore: number
}

export type GroceryOptimizationRequest = {
  goal: GroceryOptimizationGoal
  recipes: Recipe[]
  ingredientCatalog: IngredientCatalogItem[]
  weeklyMealPlan: WeeklyMealPlan
  inventoryProvider: StoreInventoryProvider
  allowedStoreKeys?: StoreKey[]
  pantry?: PantryItem[]
}

export type GroceryOptimizationSummary = {
  strategyLabel: string
  storesToVisit: number
  totalExpectedCost: number
  expectedSavings: number
  expectedNutritionScore: number
}

export type GroceryOptimizationResult = {
  requirements: GroceryRequirement[]
  plansByStore: ShoppingPlanByStore[]
  storesToVisit: GroceryStore[]
  totalExpectedCost: number
  expectedNutritionScore: number
  expectedSavings: number
  baselineCost: number
  summary: GroceryOptimizationSummary
  printableShoppingList: string
}

export type DietaryStyle =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'mediterranean'
  | 'pescatarian'
  | 'paleo'

export type FitnessGoal = 'muscle_gain' | 'fat_loss' | 'maintenance'

export type UserOptimizationProfile = {
  id: string
  userId: string
  budget: number
  healthPriority: number
  tastePriority: number
  conveniencePriority: number
  cookingSkill: number
  cookingTimeAvailable: number
  favoriteCuisines: string[]
  dislikedFoods: string[]
  allergies: string[]
  dietaryStyle: DietaryStyle
  fitnessGoal: FitnessGoal
  familySize: number
  createdAt: string
  updatedAt: string
}

export type UserOptimizationProfileInput = {
  budget: number
  healthPriority: number
  tastePriority: number
  conveniencePriority: number
  cookingSkill: number
  cookingTimeAvailable: number
  favoriteCuisines: string[]
  dislikedFoods: string[]
  allergies: string[]
  dietaryStyle: DietaryStyle
  fitnessGoal: FitnessGoal
  familySize: number
}

export type PantryItem = {
  id: string
  userId: string
  ingredientId: string | null
  ingredientName: string
  category: string
  quantity: number
  unit: string
  expirationDate: string | null
  createdAt: string
  updatedAt: string
}

export type PantryItemInput = {
  ingredientId?: string | null
  ingredientName: string
  category: string
  quantity: number
  unit: string
  expirationDate?: string | null
}

export type AIRecommendationKind =
  | 'cheaper_alternative'
  | 'healthier_alternative'
  | 'reduce_waste'
  | 'use_at_home_ingredients'
  | 'fit_user_goal'

export type AIRecommendation = {
  id: string
  kind: AIRecommendationKind
  title: string
  detail: string
  recipeId?: string
  impactScore: number
}

export type WeeklyInsights = {
  estimatedWeeklyGroceryCost: number
  nutritionScore: number
  foodWasteScore: number
  pantryUtilization: number
  moneySaved: number
  weeklyOptimizationScore: number
}

export type AIRecommendationRequest = {
  profile: UserOptimizationProfile
  recipes: Recipe[]
  ingredients: IngredientCatalogItem[]
  pantry: PantryItem[]
  groceryResult: GroceryOptimizationResult
}

export type AIRecommendationResult = {
  recommendations: AIRecommendation[]
  weeklyInsights: WeeklyInsights
}

export type RestaurantMealSlot = 'breakfast' | 'lunch' | 'dinner'

export type RestaurantMeal = {
  id: string
  userId: string
  restaurantName: string
  mealName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  estimatedPrice: number
  confidenceScore: number
  source: string
  entryMode: 'manual' | 'imported_menu' | 'api'
  mealDate: string
  mealSlot: RestaurantMealSlot
  externalRef: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type RestaurantMealInput = {
  restaurantName: string
  mealName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  estimatedPrice: number
  confidenceScore: number
  source: string
  entryMode: 'manual' | 'imported_menu' | 'api'
  mealDate: string
  mealSlot: RestaurantMealSlot
  externalRef?: Record<string, unknown>
}

export type EatingOutPlanSlot = {
  id: string
  userId: string
  slotDate: string
  mealSlot: RestaurantMealSlot
  isEatingOut: boolean
  plannedRestaurant: string | null
  createdAt: string
  updatedAt: string
}

export type ImportedMenuMeal = {
  restaurantName: string
  mealName: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  estimatedPrice: number
  confidenceScore: number
  source: string
  externalRef?: Record<string, unknown>
}

export type RestaurantProviderKey =
  | 'mcdonalds'
  | 'starbucks'
  | 'subway'
  | 'local_restaurant'
  | 'delivery_platform'

export type RestaurantMenuAdapter = {
  provider: RestaurantProviderKey
  searchMeals: (query: string) => Promise<ImportedMenuMeal[]>
}

export type DailyReoptimizationInput = {
  date: string
  nutritionGoal: NutritionGoal | null
  recipes: Recipe[]
  restaurantMeals: RestaurantMeal[]
}

export type DailyReoptimizationResult = {
  target: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  spent: {
    calories: number
    protein: number
    carbs: number
    fat: number
    price: number
  }
  remaining: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  dailyNutritionImpact: {
    caloriesUsedPercent: number
    proteinUsedPercent: number
    carbsUsedPercent: number
    fatUsedPercent: number
  }
  remainingRecipeRecommendations: OptimizationRecommendation[]
}

export type WeeklyRealWorldMetrics = {
  homeCookedRatio: number
  restaurantRatio: number
  moneySpentEatingOut: number
  nutritionImpact: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  nutritionImpactScore: number
  optimizationAdjustments: {
    groceryReduction: number
    shoppingReductionPercent: number
  }
}
