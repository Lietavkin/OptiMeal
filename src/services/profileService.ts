import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type { Profile } from '../types'

function sanitizeGoalValue(value: number | undefined, label: string, min: number, max: number) {
  if (value === undefined) return undefined
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a valid number.`)
  }
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`)
  }
  return Math.round(value)
}

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

  const sanitizedCalories = sanitizeGoalValue(daily_calories_goal, 'Daily calories goal', 1200, 5000)
  const sanitizedProtein = sanitizeGoalValue(daily_protein_goal, 'Daily protein goal', 40, 350)
  const sanitizedCarbs = sanitizeGoalValue(daily_carbs_goal, 'Daily carbs goal', 50, 700)
  const sanitizedFat = sanitizeGoalValue(daily_fat_goal, 'Daily fat goal', 20, 250)

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert(profileFields)
    .select()
    .single()
  if (profileError) throw profileError

  if (sanitizedCalories !== undefined || sanitizedProtein !== undefined || sanitizedCarbs !== undefined || sanitizedFat !== undefined) {
    const goalPayload = {
      id: uuidv4(),
      user_id: profile.id,
      calories: sanitizedCalories ?? 2000,
      protein: sanitizedProtein ?? 100,
      carbs: sanitizedCarbs ?? 250,
      fat: sanitizedFat ?? 70,
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
