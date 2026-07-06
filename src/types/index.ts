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

export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export type PlannedMeal = {
  id: string
  planId: string
  userId: string
  dayIndex: number
  mealSlot: MealSlot
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description?: string | null
  recipeId?: string | null
  createdAt: string
  updatedAt?: string
}

export type MealPlan = {
  id: string
  userId: string
  weekStart: string
  meals: PlannedMeal[]
  createdAt: string
  updatedAt?: string
}

export type ShoppingCategory = 'produce' | 'meat' | 'dairy' | 'grains' | 'frozen' | 'pantry' | 'other'

export type OptimizerMode = 'cheapest' | 'balanced' | 'healthiest'

export type ShoppingListItem = {
  id: string
  listId: string
  userId: string
  name: string
  category: ShoppingCategory
  quantity: number
  unit: string
  basePrice: number
  estimatedPrice: number
  nutritionValue: number
  purchased: boolean
  notes?: string | null
  createdAt: string
  updatedAt?: string
}

export type ShoppingList = {
  id: string
  userId: string
  planId?: string | null
  weeklyBudget: number
  optimizerMode: OptimizerMode
  items: ShoppingListItem[]
  createdAt: string
  updatedAt?: string
}

export type ShoppingSummary = {
  estimatedTotal: number
  remainingBudget: number
  nutritionScore: number
  savingsVsHealthiest: number
  healthiestTotal: number
}

export type MealOptimizationMode =
  | 'cheapest'
  | 'highest_protein'
  | 'lowest_calories'
  | 'muscle_gain'
  | 'fat_loss'
  | 'balanced'
  | 'mediterranean'
  | 'student_budget'

export type RecipeIngredient = {
  id: string
  recipeId: string
  userId: string
  name: string
  quantity: number
  unit: string
  category: ShoppingCategory
  estimatedPrice: number
  createdAt: string
}

export type Recipe = {
  id: string
  userId: string
  name: string
  instructions?: string | null
  servings: number
  prepTimeMinutes: number
  calories: number
  protein: number
  carbs: number
  fat: number
  estimatedCost: number
  isFavorite: boolean
  tags: string[]
  ingredients: RecipeIngredient[]
  createdAt: string
  updatedAt?: string
}

export type RecipeFilters = {
  search: string
  maxCalories?: number
  minProtein?: number
  maxCarbs?: number
  maxFat?: number
  maxPrepTime?: number
  favoritesOnly: boolean
}

export type RecipeInput = {
  name: string
  instructions?: string
  servings: number
  prepTimeMinutes: number
  calories: number
  protein: number
  carbs: number
  fat: number
  estimatedCost: number
  isFavorite?: boolean
  tags?: string[]
  ingredients: Omit<RecipeIngredient, 'id' | 'recipeId' | 'userId' | 'createdAt'>[]
}
