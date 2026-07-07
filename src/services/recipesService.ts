import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type {
  Recipe,
  RecipeDraft,
  RecipeIngredient,
  RecipeIngredientDraft,
  RecipeNutrition,
} from '../types'

type RecipeRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  servings: number
  cooking_time_minutes: number | null
  instructions: string
  estimated_cost: number
  is_favorite: boolean
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  created_at: string
  updated_at: string
  recipe_ingredients?: any[]
}

function toNumber(value: unknown) {
  return Number(value ?? 0)
}

function mapRecipeIngredientRow(row: any): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    ingredientId: row.ingredient_id ?? null,
    displayName: row.display_name,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    notes: row.notes ?? null,
    estimatedCost: toNumber(row.estimated_cost),
    calories: toNumber(row.calories),
    protein: toNumber(row.protein),
    carbs: toNumber(row.carbs),
    fat: toNumber(row.fat),
  }
}

function calculateRecipeNutrition(ingredients: RecipeIngredientDraft[], servings: number): RecipeNutrition {
  const total = ingredients.reduce(
    (acc, ingredient) => {
      acc.calories += ingredient.calories
      acc.protein += ingredient.protein
      acc.carbs += ingredient.carbs
      acc.fat += ingredient.fat
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const safeServings = Math.max(1, servings)
  return {
    totalCalories: total.calories,
    totalProtein: total.protein,
    totalCarbs: total.carbs,
    totalFat: total.fat,
    perServing: {
      calories: total.calories / safeServings,
      protein: total.protein / safeServings,
      carbs: total.carbs / safeServings,
      fat: total.fat / safeServings,
    },
  }
}

function calculateEstimatedCost(ingredients: RecipeIngredientDraft[]) {
  return ingredients.reduce((sum, ingredient) => sum + ingredient.estimatedCost, 0)
}

function mapRecipeRow(row: RecipeRow): Recipe {
  const nutrition: RecipeNutrition = {
    totalCalories: toNumber(row.total_calories),
    totalProtein: toNumber(row.total_protein),
    totalCarbs: toNumber(row.total_carbs),
    totalFat: toNumber(row.total_fat),
    perServing: {
      calories: row.servings > 0 ? toNumber(row.total_calories) / row.servings : 0,
      protein: row.servings > 0 ? toNumber(row.total_protein) / row.servings : 0,
      carbs: row.servings > 0 ? toNumber(row.total_carbs) / row.servings : 0,
      fat: row.servings > 0 ? toNumber(row.total_fat) / row.servings : 0,
    },
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? null,
    servings: row.servings,
    cookingTimeMinutes: row.cooking_time_minutes ?? null,
    instructions: row.instructions,
    estimatedCost: toNumber(row.estimated_cost),
    isFavorite: row.is_favorite,
    nutrition,
    ingredients: (row.recipe_ingredients ?? []).map(mapRecipeIngredientRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRecipeRowPayload(userId: string, draft: RecipeDraft) {
  const nutrition = calculateRecipeNutrition(draft.ingredients, draft.servings)
  const estimatedCost = calculateEstimatedCost(draft.ingredients)

  return {
    user_id: userId,
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    servings: Math.max(1, draft.servings),
    cooking_time_minutes: draft.cookingTimeMinutes ?? null,
    instructions: draft.instructions.trim(),
    estimated_cost: estimatedCost,
    is_favorite: draft.isFavorite,
    total_calories: nutrition.totalCalories,
    total_protein: nutrition.totalProtein,
    total_carbs: nutrition.totalCarbs,
    total_fat: nutrition.totalFat,
  }
}

function toRecipeIngredientPayload(recipeId: string, ingredient: RecipeIngredientDraft) {
  return {
    id: uuidv4(),
    recipe_id: recipeId,
    ingredient_id: ingredient.ingredientId ?? null,
    display_name: ingredient.displayName,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    notes: ingredient.notes ?? null,
    estimated_cost: ingredient.estimatedCost,
    calories: ingredient.calories,
    protein: ingredient.protein,
    carbs: ingredient.carbs,
    fat: ingredient.fat,
  }
}

export async function getRecipesForUser(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRecipeRow(row as RecipeRow))
}

export async function createRecipeForUser(userId: string, draft: RecipeDraft): Promise<Recipe> {
  const recipePayload = {
    id: uuidv4(),
    ...toRecipeRowPayload(userId, draft),
  }

  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .insert(recipePayload)
    .select()
    .single()

  if (recipeError) throw recipeError

  const ingredientPayloads = draft.ingredients.map((ingredient) => toRecipeIngredientPayload(recipeData.id, ingredient))
  if (ingredientPayloads.length > 0) {
    const { error: ingredientError } = await supabase.from('recipe_ingredients').insert(ingredientPayloads)
    if (ingredientError) throw ingredientError
  }

  const { data: fullRecipe, error: fullRecipeError } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*)')
    .eq('id', recipeData.id)
    .single()

  if (fullRecipeError) throw fullRecipeError
  return mapRecipeRow(fullRecipe as RecipeRow)
}

export async function updateRecipeById(userId: string, recipeId: string, draft: RecipeDraft): Promise<Recipe> {
  const rowPayload = {
    ...toRecipeRowPayload(userId, draft),
    updated_at: new Date().toISOString(),
  }

  const { error: updateError } = await supabase
    .from('recipes')
    .update(rowPayload)
    .eq('id', recipeId)
    .eq('user_id', userId)

  if (updateError) throw updateError

  const { error: deleteIngredientsError } = await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
  if (deleteIngredientsError) throw deleteIngredientsError

  const ingredientPayloads = draft.ingredients.map((ingredient) => toRecipeIngredientPayload(recipeId, ingredient))
  if (ingredientPayloads.length > 0) {
    const { error: insertIngredientsError } = await supabase.from('recipe_ingredients').insert(ingredientPayloads)
    if (insertIngredientsError) throw insertIngredientsError
  }

  const { data, error } = await supabase.from('recipes').select('*, recipe_ingredients(*)').eq('id', recipeId).single()
  if (error) throw error

  return mapRecipeRow(data as RecipeRow)
}

export async function toggleFavoriteRecipe(userId: string, recipeId: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq('id', recipeId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteRecipeById(userId: string, recipeId: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId).eq('user_id', userId)
  if (error) throw error
}
