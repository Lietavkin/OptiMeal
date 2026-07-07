import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type { PantryItem, PantryItemInput } from '../types'

type PantryItemRow = {
  id: string
  user_id: string
  ingredient_id: string | null
  ingredient_name: string
  category: string
  quantity: number
  unit: string
  expiration_date: string | null
  created_at: string
  updated_at: string
}

function mapPantryRow(row: PantryItemRow): PantryItem {
  return {
    id: row.id,
    userId: row.user_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    category: row.category,
    quantity: Number(row.quantity ?? 0),
    unit: row.unit,
    expirationDate: row.expiration_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toPayload(userId: string, input: PantryItemInput) {
  return {
    user_id: userId,
    ingredient_id: input.ingredientId ?? null,
    ingredient_name: input.ingredientName.trim(),
    category: input.category.trim() || 'General',
    quantity: Math.max(0, input.quantity),
    unit: input.unit.trim() || 'unit',
    expiration_date: input.expirationDate || null,
  }
}

export async function getPantryForUser(userId: string): Promise<PantryItem[]> {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('expiration_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data ?? []).map((row) => mapPantryRow(row as PantryItemRow))
}

export async function createPantryItem(userId: string, input: PantryItemInput): Promise<PantryItem> {
  const payload = {
    id: uuidv4(),
    ...toPayload(userId, input),
  }

  const { data, error } = await supabase.from('pantry_items').insert(payload).select('*').single()
  if (error) throw error

  return mapPantryRow(data as PantryItemRow)
}

export async function updatePantryItem(userId: string, pantryItemId: string, input: PantryItemInput): Promise<PantryItem> {
  const payload = {
    ...toPayload(userId, input),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .update(payload)
    .eq('id', pantryItemId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return mapPantryRow(data as PantryItemRow)
}

export async function deletePantryItem(userId: string, pantryItemId: string): Promise<void> {
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', pantryItemId)
    .eq('user_id', userId)

  if (error) throw error
}
