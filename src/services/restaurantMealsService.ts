import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type {
  ImportedMenuMeal,
  RestaurantMeal,
  RestaurantMealInput,
  RestaurantMealSlot,
} from '../types'

type RestaurantMealRow = {
  id: string
  user_id: string
  restaurant_name: string
  meal_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_size: string
  estimated_price: number
  confidence_score: number
  source: string
  entry_mode: RestaurantMeal['entryMode']
  meal_date: string
  meal_slot: RestaurantMealSlot
  external_ref: Record<string, unknown>
  created_at: string
  updated_at: string
}

function mapRestaurantMeal(row: RestaurantMealRow): RestaurantMeal {
  return {
    id: row.id,
    userId: row.user_id,
    restaurantName: row.restaurant_name,
    mealName: row.meal_name,
    calories: Number(row.calories ?? 0),
    protein: Number(row.protein ?? 0),
    carbs: Number(row.carbs ?? 0),
    fat: Number(row.fat ?? 0),
    servingSize: row.serving_size,
    estimatedPrice: Number(row.estimated_price ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    source: row.source,
    entryMode: row.entry_mode,
    mealDate: row.meal_date,
    mealSlot: row.meal_slot,
    externalRef: row.external_ref ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toPayload(userId: string, input: RestaurantMealInput) {
  return {
    user_id: userId,
    restaurant_name: input.restaurantName.trim(),
    meal_name: input.mealName.trim(),
    calories: Math.max(0, input.calories),
    protein: Math.max(0, input.protein),
    carbs: Math.max(0, input.carbs),
    fat: Math.max(0, input.fat),
    serving_size: input.servingSize.trim() || '1 serving',
    estimated_price: Math.max(0, input.estimatedPrice),
    confidence_score: Math.min(100, Math.max(0, input.confidenceScore)),
    source: input.source,
    entry_mode: input.entryMode,
    meal_date: input.mealDate,
    meal_slot: input.mealSlot,
    external_ref: input.externalRef ?? {},
  }
}

export function importedMenuMealToInput(meal: ImportedMenuMeal, mealDate: string, mealSlot: RestaurantMealSlot): RestaurantMealInput {
  return {
    restaurantName: meal.restaurantName,
    mealName: meal.mealName,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    servingSize: meal.servingSize,
    estimatedPrice: meal.estimatedPrice,
    confidenceScore: meal.confidenceScore,
    source: meal.source,
    entryMode: 'imported_menu',
    mealDate,
    mealSlot,
    externalRef: meal.externalRef,
  }
}

export async function getRestaurantMealsForUser(userId: string): Promise<RestaurantMeal[]> {
  const { data, error } = await supabase
    .from('restaurant_meals')
    .select('*')
    .eq('user_id', userId)
    .order('meal_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRestaurantMeal(row as RestaurantMealRow))
}

export async function createRestaurantMeal(userId: string, input: RestaurantMealInput): Promise<RestaurantMeal> {
  const payload = {
    id: uuidv4(),
    ...toPayload(userId, input),
  }

  const { data, error } = await supabase.from('restaurant_meals').insert(payload).select('*').single()
  if (error) throw error
  return mapRestaurantMeal(data as RestaurantMealRow)
}

export async function updateRestaurantMeal(userId: string, mealId: string, input: RestaurantMealInput): Promise<RestaurantMeal> {
  const payload = {
    ...toPayload(userId, input),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('restaurant_meals')
    .update(payload)
    .eq('id', mealId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return mapRestaurantMeal(data as RestaurantMealRow)
}

export async function deleteRestaurantMeal(userId: string, mealId: string): Promise<void> {
  const { error } = await supabase
    .from('restaurant_meals')
    .delete()
    .eq('id', mealId)
    .eq('user_id', userId)

  if (error) throw error
}
