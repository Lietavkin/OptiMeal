import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type { Profile } from '../types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  const profile = data as Profile | null
  if (!profile) return null

  const { data: goalData, error: goalError } = await supabase
    .from('nutrition_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle()
  if (goalError && goalError.code !== 'PGRST116') throw goalError

  return {
    ...profile,
    id: profile.id,
    daily_calories_goal: goalData?.calories,
    daily_protein_goal: goalData?.protein,
    daily_carbs_goal: goalData?.carbs,
    daily_fat_goal: goalData?.fat,
  }
}

export async function upsertProfile(profile: Profile): Promise<Profile> {
  const { daily_calories_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, ...profileFields } = profile

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert(profileFields)
    .select()
    .single()
  if (profileError) throw profileError

  if (daily_calories_goal !== undefined || daily_protein_goal !== undefined || daily_carbs_goal !== undefined || daily_fat_goal !== undefined) {
    const goalPayload = {
      id: uuidv4(),
      user_id: profile.id,
      calories: daily_calories_goal ?? 2000,
      protein: daily_protein_goal ?? 100,
      carbs: daily_carbs_goal ?? 250,
      fat: daily_fat_goal ?? 70,
      active: true,
    }
    const { data: goalData, error: goalError } = await supabase
      .from('nutrition_goals')
      .upsert(goalPayload, { onConflict: 'user_id,active' })
      .select()
      .single()
    if (goalError) throw goalError
    return {
      ...profileData,
      daily_calories_goal: goalData.calories,
      daily_protein_goal: goalData.protein,
      daily_carbs_goal: goalData.carbs,
      daily_fat_goal: goalData.fat,
    } as Profile
  }

  return profileData as Profile
}
