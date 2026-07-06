import { supabase } from './supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import type { Meal } from '../types'

function mapMealRow(row: any): Meal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    photoUrl: row.photo_url ?? null,
    photoPath: row.photo_path ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getMealsForUser(userId: string) {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapMealRow)
}

export async function createMealForUser(userId: string, meal: Omit<Meal, 'id' | 'createdAt' | 'userId'>) {
  const payload = {
    id: uuidv4(),
    ...meal,
    user_id: userId,
    photo_url: meal.photoUrl ?? null,
    photo_path: meal.photoPath ?? null,
  }
  delete payload.photoUrl
  delete payload.photoPath

  const { data, error } = await supabase.from('meals').insert(payload).select().single()
  if (error) throw error
  return mapMealRow(data)
}

export async function updateMealById(id: string, patch: Partial<Meal>) {
  const dbPatch: any = { ...patch }
  if (patch.photoUrl !== undefined) {
    dbPatch.photo_url = patch.photoUrl
    delete dbPatch.photoUrl
  }
  if (patch.photoPath !== undefined) {
    dbPatch.photo_path = patch.photoPath
    delete dbPatch.photoPath
  }
  const { data, error } = await supabase.from('meals').update(dbPatch).eq('id', id).select().single()
  if (error) throw error
  return mapMealRow(data)
}

export async function deleteMealById(id: string) {
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) throw error
  return true
}
