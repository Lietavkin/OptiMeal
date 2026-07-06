import { supabase } from './supabaseClient'
import type { NutritionGoal } from '../types'

export async function getActiveNutritionGoal(userId: string): Promise<NutritionGoal | null> {
  const { data, error } = await supabase
    .from('nutrition_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  return data as NutritionGoal | null
}

export async function upsertNutritionGoal(goal: Omit<NutritionGoal, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('nutrition_goals')
    .upsert(goal, { onConflict: 'user_id,active' })
    .select()
    .single()

  if (error) throw error
  return data as NutritionGoal
}
