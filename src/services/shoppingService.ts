import { v4 as uuidv4 } from 'uuid'
import { getLatestMealPlan } from './plannerService'
import { getRecipesByIds } from './recipeService'
import { supabase } from './supabaseClient'
import type {
  MealPlan,
  OptimizerMode,
  PlannedMeal,
  ShoppingCategory,
  ShoppingList,
  ShoppingListItem,
  ShoppingSummary,
} from '../types'

export const SHOPPING_CATEGORIES: ShoppingCategory[] = ['produce', 'meat', 'dairy', 'grains', 'frozen', 'pantry', 'other']

export const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  produce: 'Produce',
  meat: 'Meat',
  dairy: 'Dairy',
  grains: 'Grains',
  frozen: 'Frozen',
  pantry: 'Pantry',
  other: 'Other',
}

const MODE_CONFIG: Record<OptimizerMode, { priceMultiplier: number; nutritionMultiplier: number }> = {
  cheapest: { priceMultiplier: 0.78, nutritionMultiplier: 0.82 },
  balanced: { priceMultiplier: 1, nutritionMultiplier: 1 },
  healthiest: { priceMultiplier: 1.32, nutritionMultiplier: 1.18 },
}

type IngredientDraft = {
  name: string
  category: ShoppingCategory
  quantity: number
  unit: string
  basePrice: number
  nutritionValue: number
}

const MEAL_TEMPLATES: Record<string, IngredientDraft[]> = {
  'greek power bowl': [
    { name: 'Quinoa', category: 'grains', quantity: 1, unit: 'cup', basePrice: 3.49, nutritionValue: 88 },
    { name: 'Chicken breast', category: 'meat', quantity: 6, unit: 'oz', basePrice: 5.29, nutritionValue: 84 },
    { name: 'Spinach', category: 'produce', quantity: 2, unit: 'cups', basePrice: 2.99, nutritionValue: 92 },
    { name: 'Cherry tomatoes', category: 'produce', quantity: 1, unit: 'cup', basePrice: 2.49, nutritionValue: 86 },
    { name: 'Feta cheese', category: 'dairy', quantity: 2, unit: 'oz', basePrice: 3.19, nutritionValue: 72 },
    { name: 'Olive oil', category: 'pantry', quantity: 1, unit: 'tbsp', basePrice: 0.45, nutritionValue: 78 },
  ],
  'savory turkey wrap': [
    { name: 'Whole wheat tortillas', category: 'grains', quantity: 2, unit: 'pcs', basePrice: 1.89, nutritionValue: 76 },
    { name: 'Turkey breast', category: 'meat', quantity: 5, unit: 'oz', basePrice: 4.79, nutritionValue: 83 },
    { name: 'Avocado', category: 'produce', quantity: 0.5, unit: 'pc', basePrice: 1.25, nutritionValue: 90 },
    { name: 'Mixed greens', category: 'produce', quantity: 1, unit: 'cup', basePrice: 1.99, nutritionValue: 88 },
    { name: 'Greek yogurt spread', category: 'dairy', quantity: 2, unit: 'tbsp', basePrice: 0.89, nutritionValue: 80 },
  ],
  'smoothie protein boost': [
    { name: 'Frozen berries', category: 'frozen', quantity: 1, unit: 'cup', basePrice: 3.29, nutritionValue: 91 },
    { name: 'Banana', category: 'produce', quantity: 1, unit: 'pc', basePrice: 0.35, nutritionValue: 85 },
    { name: 'Almond milk', category: 'dairy', quantity: 1, unit: 'cup', basePrice: 1.49, nutritionValue: 74 },
    { name: 'Protein powder', category: 'pantry', quantity: 1, unit: 'scoop', basePrice: 1.85, nutritionValue: 70 },
    { name: 'Chia seeds', category: 'pantry', quantity: 1, unit: 'tbsp', basePrice: 0.55, nutritionValue: 94 },
  ],
}

const SLOT_FALLBACKS: Record<PlannedMeal['mealSlot'], IngredientDraft[]> = {
  breakfast: [
    { name: 'Eggs', category: 'dairy', quantity: 2, unit: 'pcs', basePrice: 0.75, nutritionValue: 82 },
    { name: 'Oats', category: 'grains', quantity: 0.5, unit: 'cup', basePrice: 0.65, nutritionValue: 86 },
    { name: 'Banana', category: 'produce', quantity: 1, unit: 'pc', basePrice: 0.35, nutritionValue: 85 },
  ],
  lunch: [
    { name: 'Chicken breast', category: 'meat', quantity: 5, unit: 'oz', basePrice: 4.49, nutritionValue: 84 },
    { name: 'Brown rice', category: 'grains', quantity: 0.75, unit: 'cup', basePrice: 0.89, nutritionValue: 80 },
    { name: 'Broccoli', category: 'produce', quantity: 1, unit: 'cup', basePrice: 1.79, nutritionValue: 93 },
  ],
  dinner: [
    { name: 'Salmon fillet', category: 'meat', quantity: 6, unit: 'oz', basePrice: 7.99, nutritionValue: 90 },
    { name: 'Sweet potato', category: 'produce', quantity: 1, unit: 'pc', basePrice: 1.15, nutritionValue: 88 },
    { name: 'Green beans', category: 'produce', quantity: 1, unit: 'cup', basePrice: 2.29, nutritionValue: 89 },
  ],
}

const KEYWORD_INGREDIENTS: { pattern: RegExp; ingredients: IngredientDraft[] }[] = [
  { pattern: /turkey|wrap/i, ingredients: MEAL_TEMPLATES['savory turkey wrap'] },
  { pattern: /bowl|quinoa|greek/i, ingredients: MEAL_TEMPLATES['greek power bowl'] },
  { pattern: /smoothie|berry|protein boost/i, ingredients: MEAL_TEMPLATES['smoothie protein boost'] },
  { pattern: /salmon|fish/i, ingredients: SLOT_FALLBACKS.dinner },
  { pattern: /chicken/i, ingredients: [{ name: 'Chicken breast', category: 'meat', quantity: 5, unit: 'oz', basePrice: 4.49, nutritionValue: 84 }] },
  { pattern: /avocado/i, ingredients: [{ name: 'Avocado', category: 'produce', quantity: 1, unit: 'pc', basePrice: 1.49, nutritionValue: 90 }] },
]

function mapItemRow(row: Record<string, unknown>): ShoppingListItem {
  return {
    id: row.id as string,
    listId: row.list_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    category: row.category as ShoppingCategory,
    quantity: Number(row.quantity),
    unit: row.unit as string,
    basePrice: Number(row.base_price),
    estimatedPrice: Number(row.estimated_price),
    nutritionValue: Number(row.nutrition_value),
    purchased: Boolean(row.purchased),
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string | undefined,
  }
}

function ingredientKey(ingredient: IngredientDraft): string {
  return `${ingredient.name.toLowerCase()}|${ingredient.unit}`
}

function mergeIngredients(ingredients: IngredientDraft[]): IngredientDraft[] {
  const merged = new Map<string, IngredientDraft>()
  for (const item of ingredients) {
    const key = ingredientKey(item)
    const existing = merged.get(key)
    if (existing) {
      merged.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        basePrice: Math.round((existing.basePrice + item.basePrice) * 100) / 100,
      })
    } else {
      merged.set(key, { ...item })
    }
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function extractIngredientsFromPlan(plan: MealPlan, recipeIngredients?: Map<string, { name: string; category: ShoppingCategory; quantity: number; unit: string; estimatedPrice: number; nutritionValue: number }[]>): IngredientDraft[] {
  const collected: IngredientDraft[] = []

  for (const meal of plan.meals) {
    if (meal.recipeId && recipeIngredients?.has(meal.recipeId)) {
      const items = recipeIngredients.get(meal.recipeId) ?? []
      collected.push(
        ...items.map((item) => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          basePrice: item.estimatedPrice,
          nutritionValue: item.nutritionValue,
        })),
      )
      continue
    }

    const normalized = meal.name.trim().toLowerCase()
    const template = MEAL_TEMPLATES[normalized]
    if (template) {
      collected.push(...template)
      continue
    }

    const haystack = `${meal.name} ${meal.description ?? ''}`
    const keywordMatch = KEYWORD_INGREDIENTS.find((entry) => entry.pattern.test(haystack))
    if (keywordMatch) {
      collected.push(...keywordMatch.ingredients)
      continue
    }

    collected.push(...SLOT_FALLBACKS[meal.mealSlot])
  }

  return mergeIngredients(collected)
}

export function applyOptimizerToPrice(basePrice: number, mode: OptimizerMode): number {
  return Math.round(basePrice * MODE_CONFIG[mode].priceMultiplier * 100) / 100
}

export function computeShoppingSummary(items: ShoppingListItem[], weeklyBudget: number, mode: OptimizerMode): ShoppingSummary {
  const estimatedTotal = items.reduce((sum, item) => sum + item.estimatedPrice, 0)
  const healthiestTotal = items.reduce((sum, item) => sum + applyOptimizerToPrice(item.basePrice, 'healthiest'), 0)
  const nutritionScore =
    items.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            items.reduce((sum, item) => sum + item.nutritionValue * MODE_CONFIG[mode].nutritionMultiplier, 0) / items.length,
          ),
        )

  return {
    estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    remainingBudget: Math.round((weeklyBudget - estimatedTotal) * 100) / 100,
    nutritionScore,
    savingsVsHealthiest: Math.round((healthiestTotal - estimatedTotal) * 100) / 100,
    healthiestTotal: Math.round(healthiestTotal * 100) / 100,
  }
}

export async function getLatestShoppingList(userId: string): Promise<ShoppingList | null> {
  const { data: listRow, error: listError } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (listError) throw listError
  if (!listRow) return null

  const { data: itemRows, error: itemError } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('list_id', listRow.id)
    .order('category', { ascending: true })
  if (itemError) throw itemError

  return {
    id: listRow.id,
    userId: listRow.user_id,
    planId: listRow.plan_id,
    weeklyBudget: Number(listRow.weekly_budget),
    optimizerMode: listRow.optimizer_mode as OptimizerMode,
    createdAt: listRow.created_at,
    updatedAt: listRow.updated_at,
    items: (itemRows ?? []).map(mapItemRow),
  }
}

async function replaceListItems(
  listId: string,
  userId: string,
  mode: OptimizerMode,
  ingredients: IngredientDraft[],
): Promise<ShoppingListItem[]> {
  const { error: deleteError } = await supabase.from('shopping_list_items').delete().eq('list_id', listId)
  if (deleteError) throw deleteError

  const payload = ingredients.map((ingredient) => ({
    id: uuidv4(),
    list_id: listId,
    user_id: userId,
    name: ingredient.name,
    category: ingredient.category,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    base_price: ingredient.basePrice,
    estimated_price: applyOptimizerToPrice(ingredient.basePrice, mode),
    nutrition_value: ingredient.nutritionValue,
    purchased: false,
    notes: null,
  }))

  const { data, error } = await supabase.from('shopping_list_items').insert(payload).select()
  if (error) throw error
  return (data ?? []).map(mapItemRow)
}

export async function syncShoppingListForUser(userId: string): Promise<ShoppingList | null> {
  const plan = await getLatestMealPlan(userId)
  if (!plan) return null

  const recipeIds = plan.meals.map((m) => m.recipeId).filter((id): id is string => Boolean(id))
  const recipes = await getRecipesByIds(recipeIds)
  const recipeIngredients = new Map(
    recipes.map((recipe) => [
      recipe.id,
      recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        category: ingredient.category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        estimatedPrice: ingredient.estimatedPrice,
        nutritionValue: 80,
      })),
    ]),
  )

  const existing = await getLatestShoppingList(userId)
  const weeklyBudget = existing?.weeklyBudget ?? 150
  const optimizerMode = existing?.optimizerMode ?? 'balanced'
  const ingredients = extractIngredientsFromPlan(plan, recipeIngredients)
  return generateShoppingListFromPlanWithIngredients(userId, plan, ingredients, weeklyBudget, optimizerMode)
}

async function generateShoppingListFromPlanWithIngredients(
  userId: string,
  plan: MealPlan,
  ingredients: IngredientDraft[],
  weeklyBudget: number,
  optimizerMode: OptimizerMode,
): Promise<ShoppingList> {
  const existing = await getLatestShoppingList(userId)

  if (existing) {
    const { error: updateError } = await supabase
      .from('shopping_lists')
      .update({
        plan_id: plan.id,
        weekly_budget: weeklyBudget,
        optimizer_mode: optimizerMode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (updateError) throw updateError

    const items = await replaceListItems(existing.id, userId, optimizerMode, ingredients)
    return { ...existing, planId: plan.id, weeklyBudget, optimizerMode, items, updatedAt: new Date().toISOString() }
  }

  const listId = uuidv4()
  const { data: listRow, error: listError } = await supabase
    .from('shopping_lists')
    .insert({
      id: listId,
      user_id: userId,
      plan_id: plan.id,
      weekly_budget: weeklyBudget,
      optimizer_mode: optimizerMode,
    })
    .select()
    .single()
  if (listError) throw listError

  const items = await replaceListItems(listId, userId, optimizerMode, ingredients)
  return {
    id: listRow.id,
    userId: listRow.user_id,
    planId: listRow.plan_id,
    weeklyBudget: Number(listRow.weekly_budget),
    optimizerMode: listRow.optimizer_mode as OptimizerMode,
    createdAt: listRow.created_at,
    updatedAt: listRow.updated_at,
    items,
  }
}

export async function generateShoppingListFromPlan(
  userId: string,
  plan: MealPlan,
  weeklyBudget = 150,
  optimizerMode: OptimizerMode = 'balanced',
): Promise<ShoppingList> {
  const recipeIds = plan.meals.map((m) => m.recipeId).filter((id): id is string => Boolean(id))
  const recipes = await getRecipesByIds(recipeIds)
  const recipeIngredients = new Map(
    recipes.map((recipe) => [
      recipe.id,
      recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        category: ingredient.category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        estimatedPrice: ingredient.estimatedPrice,
        nutritionValue: 80,
      })),
    ]),
  )
  const ingredients = extractIngredientsFromPlan(plan, recipeIngredients)
  return generateShoppingListFromPlanWithIngredients(userId, plan, ingredients, weeklyBudget, optimizerMode)
}

export async function generateShoppingListForUser(
  userId: string,
  weeklyBudget = 150,
  optimizerMode: OptimizerMode = 'balanced',
): Promise<ShoppingList> {
  const plan = await getLatestMealPlan(userId)
  if (!plan) throw new Error('No meal plan found')
  return generateShoppingListFromPlan(userId, plan, weeklyBudget, optimizerMode)
}

export async function updateShoppingListSettings(
  listId: string,
  patch: { weeklyBudget?: number; optimizerMode?: OptimizerMode },
): Promise<void> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.weeklyBudget !== undefined) dbPatch.weekly_budget = patch.weeklyBudget
  if (patch.optimizerMode !== undefined) dbPatch.optimizer_mode = patch.optimizerMode
  const { error } = await supabase.from('shopping_lists').update(dbPatch).eq('id', listId)
  if (error) throw error
}

export async function repriceShoppingListItems(listId: string, mode: OptimizerMode): Promise<ShoppingListItem[]> {
  const { data: items, error: fetchError } = await supabase.from('shopping_list_items').select('*').eq('list_id', listId)
  if (fetchError) throw fetchError

  const updates = await Promise.all(
    (items ?? []).map(async (item) => {
      const estimatedPrice = applyOptimizerToPrice(Number(item.base_price), mode)
      const { data, error } = await supabase
        .from('shopping_list_items')
        .update({ estimated_price: estimatedPrice, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .select()
        .single()
      if (error) throw error
      return mapItemRow(data)
    }),
  )

  return updates
}

export async function updateShoppingListItemById(id: string, patch: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.quantity !== undefined) dbPatch.quantity = patch.quantity
  if (patch.unit !== undefined) dbPatch.unit = patch.unit
  if (patch.estimatedPrice !== undefined) dbPatch.estimated_price = patch.estimatedPrice
  if (patch.basePrice !== undefined) dbPatch.base_price = patch.basePrice
  if (patch.purchased !== undefined) dbPatch.purchased = patch.purchased
  if (patch.notes !== undefined) dbPatch.notes = patch.notes

  const { data, error } = await supabase.from('shopping_list_items').update(dbPatch).eq('id', id).select().single()
  if (error) throw error
  return mapItemRow(data)
}

export function groupItemsByCategory(items: ShoppingListItem[]): Record<ShoppingCategory, ShoppingListItem[]> {
  return SHOPPING_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = items.filter((item) => item.category === category)
      return acc
    },
    {} as Record<ShoppingCategory, ShoppingListItem[]>,
  )
}
