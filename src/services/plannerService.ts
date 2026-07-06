import { v4 as uuidv4 } from 'uuid'
import { getMealRecommendations } from './aiService'
import { supabase } from './supabaseClient'
import type { MealPlan, MealSlot, PlannedMeal, Profile } from '../types'

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner']
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function mapPlannedMealRow(row: Record<string, unknown>): PlannedMeal {
  return {
    id: row.id as string,
    planId: row.plan_id as string,
    userId: row.user_id as string,
    dayIndex: row.day_index as number,
    mealSlot: row.meal_slot as MealSlot,
    calories: row.calories as number,
    protein: row.protein as number,
    carbs: row.carbs as number,
    fat: row.fat as number,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    recipeId: (row.recipe_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string | undefined,
  }
}

export function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function getDayLabel(dayIndex: number): string {
  return DAY_LABELS[dayIndex] ?? `Day ${dayIndex + 1}`
}

export function formatMealSlot(slot: MealSlot): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1)
}

function slotMacroFraction(slot: MealSlot): number {
  if (slot === 'breakfast') return 0.25
  if (slot === 'lunch') return 0.35
  return 0.4
}

export async function generatePlannedMealsForWeek(profile: Profile | null): Promise<Omit<PlannedMeal, 'id' | 'planId' | 'userId' | 'createdAt' | 'updatedAt'>[]> {
  const goals = {
    calories: profile?.daily_calories_goal ?? 2000,
    protein: profile?.daily_protein_goal ?? 100,
    carbs: profile?.daily_carbs_goal ?? 250,
    fat: profile?.daily_fat_goal ?? 70,
  }

  const planned: Omit<PlannedMeal, 'id' | 'planId' | 'userId' | 'createdAt' | 'updatedAt'>[] = []

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    let dayCalories = 0
    let dayProtein = 0
    let dayCarbs = 0
    let dayFat = 0

    for (const mealSlot of MEAL_SLOTS) {
      const summary = {
        totalCalories: dayCalories,
        totalProtein: dayProtein,
        totalCarbs: dayCarbs,
        totalFat: dayFat,
      }
      const recommendations = await getMealRecommendations(profile, summary)
      const pick = recommendations[(dayIndex * MEAL_SLOTS.length + MEAL_SLOTS.indexOf(mealSlot)) % recommendations.length]
      const fraction = slotMacroFraction(mealSlot)
      const meal = pick ?? {
        name: `${formatMealSlot(mealSlot)} Bowl`,
        calories: Math.round(goals.calories * fraction),
        protein: Math.round(goals.protein * fraction),
        carbs: Math.round(goals.carbs * fraction),
        fat: Math.round(goals.fat * fraction),
        description: `Balanced ${mealSlot} for ${getDayLabel(dayIndex)}.`,
      }

      planned.push({
        dayIndex,
        mealSlot,
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        description: meal.description,
      })

      dayCalories += meal.calories
      dayProtein += meal.protein
      dayCarbs += meal.carbs
      dayFat += meal.fat
    }
  }

  return planned
}

export async function generateSinglePlannedMeal(
  profile: Profile | null,
  existingMeals: PlannedMeal[],
  dayIndex: number,
  mealSlot: MealSlot,
): Promise<Omit<PlannedMeal, 'id' | 'planId' | 'userId' | 'createdAt' | 'updatedAt'>> {
  const dayMeals = existingMeals.filter((m) => m.dayIndex === dayIndex && m.mealSlot !== mealSlot)
  const summary = dayMeals.reduce(
    (acc, m) => ({
      totalCalories: acc.totalCalories + m.calories,
      totalProtein: acc.totalProtein + m.protein,
      totalCarbs: acc.totalCarbs + m.carbs,
      totalFat: acc.totalFat + m.fat,
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
  )

  const recommendations = await getMealRecommendations(profile, summary)
  const pick = recommendations[Math.floor(Math.random() * recommendations.length)]
  const goals = {
    calories: profile?.daily_calories_goal ?? 2000,
    protein: profile?.daily_protein_goal ?? 100,
    carbs: profile?.daily_carbs_goal ?? 250,
    fat: profile?.daily_fat_goal ?? 70,
  }
  const fraction = slotMacroFraction(mealSlot)

  return {
    dayIndex,
    mealSlot,
    name: pick?.name ?? `${formatMealSlot(mealSlot)} Plate`,
    calories: pick?.calories ?? Math.round(goals.calories * fraction),
    protein: pick?.protein ?? Math.round(goals.protein * fraction),
    carbs: pick?.carbs ?? Math.round(goals.carbs * fraction),
    fat: pick?.fat ?? Math.round(goals.fat * fraction),
    description: pick?.description ?? `Fresh ${mealSlot} suggestion for ${getDayLabel(dayIndex)}.`,
  }
}

export async function getLatestMealPlan(userId: string): Promise<MealPlan | null> {
  const { data: planRow, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (planError) throw planError
  if (!planRow) return null

  const { data: mealRows, error: mealError } = await supabase
    .from('planned_meals')
    .select('*')
    .eq('plan_id', planRow.id)
    .order('day_index', { ascending: true })
  if (mealError) throw mealError

  return {
    id: planRow.id,
    userId: planRow.user_id,
    weekStart: planRow.week_start,
    createdAt: planRow.created_at,
    updatedAt: planRow.updated_at,
    meals: (mealRows ?? []).map(mapPlannedMealRow),
  }
}

export async function saveMealPlan(
  userId: string,
  weekStart: string,
  meals: Omit<PlannedMeal, 'id' | 'planId' | 'userId' | 'createdAt' | 'updatedAt'>[],
): Promise<MealPlan> {
  const planId = uuidv4()

  const { data: planRow, error: planError } = await supabase
    .from('meal_plans')
    .insert({ id: planId, user_id: userId, week_start: weekStart })
    .select()
    .single()
  if (planError) throw planError

  const mealPayload = meals.map((meal) => ({
    id: uuidv4(),
    plan_id: planId,
    user_id: userId,
    day_index: meal.dayIndex,
    meal_slot: meal.mealSlot,
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    description: meal.description ?? null,
    recipe_id: meal.recipeId ?? null,
  }))

  const { data: mealRows, error: mealError } = await supabase.from('planned_meals').insert(mealPayload).select()
  if (mealError) throw mealError

  return {
    id: planRow.id,
    userId: planRow.user_id,
    weekStart: planRow.week_start,
    createdAt: planRow.created_at,
    updatedAt: planRow.updated_at,
    meals: (mealRows ?? []).map(mapPlannedMealRow),
  }
}

export async function replaceMealPlan(
  planId: string,
  userId: string,
  weekStart: string,
  meals: Omit<PlannedMeal, 'id' | 'planId' | 'userId' | 'createdAt' | 'updatedAt'>[],
): Promise<MealPlan> {
  const { error: deleteError } = await supabase.from('planned_meals').delete().eq('plan_id', planId)
  if (deleteError) throw deleteError

  const { error: planError } = await supabase
    .from('meal_plans')
    .update({ week_start: weekStart, updated_at: new Date().toISOString() })
    .eq('id', planId)
  if (planError) throw planError

  const mealPayload = meals.map((meal) => ({
    id: uuidv4(),
    plan_id: planId,
    user_id: userId,
    day_index: meal.dayIndex,
    meal_slot: meal.mealSlot,
    name: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    description: meal.description ?? null,
    recipe_id: meal.recipeId ?? null,
  }))

  const { data: mealRows, error: mealError } = await supabase.from('planned_meals').insert(mealPayload).select()
  if (mealError) throw mealError

  const { data: planRow, error: fetchError } = await supabase.from('meal_plans').select('*').eq('id', planId).single()
  if (fetchError) throw fetchError

  return {
    id: planRow.id,
    userId: planRow.user_id,
    weekStart: planRow.week_start,
    createdAt: planRow.created_at,
    updatedAt: planRow.updated_at,
    meals: (mealRows ?? []).map(mapPlannedMealRow),
  }
}

export async function updatePlannedMealById(id: string, patch: Partial<PlannedMeal>): Promise<PlannedMeal> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.calories !== undefined) dbPatch.calories = patch.calories
  if (patch.protein !== undefined) dbPatch.protein = patch.protein
  if (patch.carbs !== undefined) dbPatch.carbs = patch.carbs
  if (patch.fat !== undefined) dbPatch.fat = patch.fat
  if (patch.description !== undefined) dbPatch.description = patch.description
  if (patch.recipeId !== undefined) dbPatch.recipe_id = patch.recipeId

  const { data, error } = await supabase.from('planned_meals').update(dbPatch).eq('id', id).select().single()
  if (error) throw error
  return mapPlannedMealRow(data)
}
