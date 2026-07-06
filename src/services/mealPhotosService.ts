import { supabase } from './supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export async function createMealPhoto(mealId: string, userId: string, path: string, publicUrl: string) {
  const { data, error } = await supabase
    .from('meal_photos')
    .insert({ id: uuidv4(), meal_id: mealId, user_id: userId, storage_path: path, public_url: publicUrl })
    .select()
    .single()
  if (error) throw error
  return data
}
