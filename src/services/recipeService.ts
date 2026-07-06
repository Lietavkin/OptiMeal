import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type {
  MealOptimizationMode,
  MealPlan,
  MealSlot,
  PlannedMeal,
  Profile,
  Recipe,
  RecipeFilters,
  RecipeInput,
  RecipeIngredient,
  ShoppingCategory,
} from '../types'

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']

export const OPTIMIZATION_MODES: { id: MealOptimizationMode; label: string; description: string }[] = [
  { id: 'cheapest', label: 'Cheapest', description: 'Lowest cost per serving' },
  { id: 'highest_protein', label: 'Highest Protein', description: 'Maximize protein content' },
  { id: 'lowest_calories', label: 'Lowest Calories', description: 'Minimize calories' },
  { id: 'muscle_gain', label: 'Muscle Gain', description: 'High protein with balanced calories' },
  { id: 'fat_loss', label: 'Fat Loss', description: 'Lean meals with high protein ratio' },
  { id: 'balanced', label: 'Balanced', description: 'Even mix of cost, macros, and prep time' },
  { id: 'mediterranean', label: 'Mediterranean', description: 'Olive oil, fish, grains, and fresh produce' },
  { id: 'student_budget', label: 'Student Budget', description: 'Affordable and quick to prepare' },
]

function mapIngredientRow(row: Record<string, unknown>): RecipeIngredient {
  return {
    id: row.id as string,
    recipeId: row.recipe_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    quantity: Number(row.quantity),
    unit: row.unit as string,
    category: row.category as ShoppingCategory,
    estimatedPrice: Number(row.estimated_price),
    createdAt: row.created_at as string,
  }
}

function mapRecipeRow(row: Record<string, unknown>, ingredients: RecipeIngredient[]): Recipe {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    instructions: (row.instructions as string | null) ?? null,
    servings: Number(row.servings),
    prepTimeMinutes: Number(row.prep_time_minutes),
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    estimatedCost: Number(row.estimated_cost),
    isFavorite: Boolean(row.is_favorite),
    tags: (row.tags as string[]) ?? [],
    ingredients,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string | undefined,
  }
}

export function inferIngredientCategory(name: string): ShoppingCategory {
  const n = name.toLowerCase()
  if (/chicken|turkey|beef|salmon|fish|meat|egg/i.test(n)) return 'meat'
  if (/milk|cheese|yogurt|butter|cream/i.test(n)) return 'dairy'
  if (/rice|oats|quinoa|pasta|bread|tortilla|grain/i.test(n)) return 'grains'
  if (/frozen|berry/i.test(n)) return 'frozen'
  if (/oil|spice|salt|pepper|powder|sauce|vinegar/i.test(n)) return 'pantry'
  if (/spinach|tomato|avocado|banana|broccoli|bean|potato|greens|produce|onion|garlic|lemon/i.test(n)) return 'produce'
  return 'other'
}

export function computeRecipeTotals(ingredients: RecipeInput['ingredients']) {
  const estimatedCost = ingredients.reduce((sum, item) => sum + item.estimatedPrice, 0)
  return { estimatedCost: Math.round(estimatedCost * 100) / 100 }
}

export function scoreRecipeForMode(recipe: Recipe, mode: MealOptimizationMode, profile?: Profile | null): number {
  const costPerServing = recipe.estimatedCost / Math.max(recipe.servings, 1)
  const proteinPerCalorie = recipe.calories > 0 ? recipe.protein / recipe.calories : 0
  const mediterraneanBoost =
    recipe.tags.includes('mediterranean') ||
    recipe.ingredients.some((i) => /olive|salmon|feta|quinoa|tomato|fish/i.test(i.name))
      ? 1
      : 0

  switch (mode) {
    case 'cheapest':
      return 1000 - costPerServing
    case 'highest_protein':
      return recipe.protein
    case 'lowest_calories':
      return 10000 - recipe.calories
    case 'muscle_gain': {
      const goalProtein = profile?.daily_protein_goal ?? 100
      return recipe.protein * 2 - Math.abs(recipe.calories - goalProtein * 4)
    }
    case 'fat_loss':
      return recipe.protein * 3 - recipe.calories - recipe.fat * 2
    case 'mediterranean':
      return mediterraneanBoost * 100 + recipe.protein - costPerServing
    case 'student_budget':
      return 500 - costPerServing - recipe.prepTimeMinutes * 0.5
    case 'balanced':
    default:
      return recipe.protein - costPerServing * 0.3 - recipe.prepTimeMinutes * 0.1 - recipe.calories * 0.01
  }
}

export function rankRecipesForMode(recipes: Recipe[], mode: MealOptimizationMode, profile?: Profile | null): Recipe[] {
  return [...recipes].sort((a, b) => scoreRecipeForMode(b, mode, profile) - scoreRecipeForMode(a, mode, profile))
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  return recipes.filter((recipe) => {
    if (filters.favoritesOnly && !recipe.isFavorite) return false
    if (filters.search && !recipe.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.maxCalories !== undefined && recipe.calories > filters.maxCalories) return false
    if (filters.minProtein !== undefined && recipe.protein < filters.minProtein) return false
    if (filters.maxCarbs !== undefined && recipe.carbs > filters.maxCarbs) return false
    if (filters.maxFat !== undefined && recipe.fat > filters.maxFat) return false
    if (filters.maxPrepTime !== undefined && recipe.prepTimeMinutes > filters.maxPrepTime) return false
    return true
  })
}

export function recipeMatchesSlot(recipe: Recipe, slot: MealSlot): boolean {
  if (slot === 'breakfast') return recipe.calories <= 550 || recipe.prepTimeMinutes <= 25
  if (slot === 'lunch') return recipe.calories >= 300 && recipe.calories <= 750
  return recipe.calories >= 350
}

export async function getRecipesForUser(userId: string): Promise<Recipe[]> {
  const { data: recipeRows, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  if (!recipeRows?.length) return []

  const recipeIds = recipeRows.map((r) => r.id)
  const { data: ingredientRows, error: ingError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .in('recipe_id', recipeIds)
  if (ingError) throw ingError

  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>()
  for (const row of ingredientRows ?? []) {
    const mapped = mapIngredientRow(row)
    const list = ingredientsByRecipe.get(mapped.recipeId) ?? []
    list.push(mapped)
    ingredientsByRecipe.set(mapped.recipeId, list)
  }

  return recipeRows.map((row) => mapRecipeRow(row, ingredientsByRecipe.get(row.id) ?? []))
}

async function replaceRecipeIngredients(recipeId: string, userId: string, ingredients: RecipeInput['ingredients']) {
  const { error: deleteError } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
  if (deleteError) throw deleteError
  if (ingredients.length === 0) return []

  const payload = ingredients.map((ingredient) => ({
    id: uuidv4(),
    recipe_id: recipeId,
    user_id: userId,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    category: ingredient.category,
    estimated_price: ingredient.estimatedPrice,
  }))

  const { data, error } = await supabase.from('recipe_ingredients').insert(payload).select()
  if (error) throw error
  return (data ?? []).map(mapIngredientRow)
}

export async function createRecipe(userId: string, input: RecipeInput): Promise<Recipe> {
  const recipeId = uuidv4()
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      id: recipeId,
      user_id: userId,
      name: input.name,
      instructions: input.instructions ?? null,
      servings: input.servings,
      prep_time_minutes: input.prepTimeMinutes,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      estimated_cost: input.estimatedCost,
      is_favorite: input.isFavorite ?? false,
      tags: input.tags ?? [],
    })
    .select()
    .single()
  if (error) throw error

  const ingredients = await replaceRecipeIngredients(recipeId, userId, input.ingredients)
  return mapRecipeRow(data, ingredients)
}

export async function updateRecipe(recipeId: string, userId: string, input: RecipeInput): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update({
      name: input.name,
      instructions: input.instructions ?? null,
      servings: input.servings,
      prep_time_minutes: input.prepTimeMinutes,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      estimated_cost: input.estimatedCost,
      is_favorite: input.isFavorite ?? false,
      tags: input.tags ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', recipeId)
    .select()
    .single()
  if (error) throw error

  const ingredients = await replaceRecipeIngredients(recipeId, userId, input.ingredients)
  return mapRecipeRow(data, ingredients)
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
  if (error) throw error
}

export async function toggleRecipeFavorite(recipeId: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq('id', recipeId)
  if (error) throw error
}

export async function getRecipeById(recipeId: string): Promise<Recipe | null> {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', recipeId).maybeSingle()
  if (error) throw error
  if (!data) return null

  const { data: ingredientRows, error: ingError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId)
  if (ingError) throw ingError

  return mapRecipeRow(data, (ingredientRows ?? []).map(mapIngredientRow))
}

export function recipeToPlannedMealFields(recipe: Recipe, dayIndex: number, mealSlot: MealSlot) {
  return {
    dayIndex,
    mealSlot,
    name: recipe.name,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    description: recipe.instructions?.slice(0, 200) ?? `Saved recipe · ${recipe.servings} servings`,
    recipeId: recipe.id,
  }
}

export function plannedMealToRecipeInput(meal: PlannedMeal): RecipeInput {
  return {
    name: meal.name,
    instructions: meal.description ?? '',
    servings: 2,
    prepTimeMinutes: 30,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    estimatedCost: 8,
    ingredients: [
      {
        name: `${meal.name} base ingredients`,
        quantity: 1,
        unit: 'set',
        category: 'other',
        estimatedPrice: 8,
      },
    ],
  }
}

export function buildWeeklyPlanFromRecipes(
  recipes: Recipe[],
  mode: MealOptimizationMode,
  profile?: Profile | null,
): Omit<PlannedMeal, 'id' | 'planId' | 'userId' | 'createdAt' | 'updatedAt'>[] {
  const ranked = rankRecipesForMode(recipes, mode, profile)
  if (ranked.length === 0) return []

  const planned: Omit<PlannedMeal, 'id' | 'planId' | 'userId' | 'createdAt' | 'updatedAt'>[] = []
  let recipeIndex = 0

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    for (const mealSlot of MEAL_SLOTS) {
      const slotMatches = ranked.filter((recipe) => recipeMatchesSlot(recipe, mealSlot))
      const pool = slotMatches.length > 0 ? slotMatches : ranked
      const recipe = pool[recipeIndex % pool.length]
      recipeIndex += 1
      planned.push(recipeToPlannedMealFields(recipe, dayIndex, mealSlot))
    }
  }

  return planned
}

export async function getRecipeIngredientsMap(recipeIds: string[]): Promise<Map<string, RecipeIngredient[]>> {
  if (recipeIds.length === 0) return new Map()
  const { data, error } = await supabase.from('recipe_ingredients').select('*').in('recipe_id', recipeIds)
  if (error) throw error

  const map = new Map<string, RecipeIngredient[]>()
  for (const row of data ?? []) {
    const ingredient = mapIngredientRow(row)
    const list = map.get(ingredient.recipeId) ?? []
    list.push(ingredient)
    map.set(ingredient.recipeId, list)
  }
  return map
}

export async function getRecipesByIds(recipeIds: string[]): Promise<Recipe[]> {
  if (recipeIds.length === 0) return []
  const uniqueIds = [...new Set(recipeIds)]
  const results = await Promise.all(uniqueIds.map((id) => getRecipeById(id)))
  return results.filter((recipe): recipe is Recipe => recipe !== null)
}
