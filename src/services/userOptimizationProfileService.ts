import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type { UserOptimizationProfile, UserOptimizationProfileInput } from '../types'

type UserOptimizationProfileRow = {
  id: string
  user_id: string
  budget: number
  health_priority: number
  taste_priority: number
  convenience_priority: number
  cooking_skill: number
  cooking_time_available: number
  favorite_cuisines: string[]
  disliked_foods: string[]
  allergies: string[]
  dietary_style: UserOptimizationProfile['dietaryStyle']
  fitness_goal: UserOptimizationProfile['fitnessGoal']
  family_size: number
  created_at: string
  updated_at: string
}

export const defaultUserOptimizationProfileInput: UserOptimizationProfileInput = {
  budget: 120,
  healthPriority: 60,
  tastePriority: 50,
  conveniencePriority: 50,
  cookingSkill: 50,
  cookingTimeAvailable: 45,
  favoriteCuisines: [],
  dislikedFoods: [],
  allergies: [],
  dietaryStyle: 'omnivore',
  fitnessGoal: 'maintenance',
  familySize: 1,
}

function mapProfileRow(row: UserOptimizationProfileRow): UserOptimizationProfile {
  return {
    id: row.id,
    userId: row.user_id,
    budget: Number(row.budget ?? 0),
    healthPriority: Number(row.health_priority ?? 0),
    tastePriority: Number(row.taste_priority ?? 0),
    conveniencePriority: Number(row.convenience_priority ?? 0),
    cookingSkill: Number(row.cooking_skill ?? 0),
    cookingTimeAvailable: Number(row.cooking_time_available ?? 0),
    favoriteCuisines: row.favorite_cuisines ?? [],
    dislikedFoods: row.disliked_foods ?? [],
    allergies: row.allergies ?? [],
    dietaryStyle: row.dietary_style,
    fitnessGoal: row.fitness_goal,
    familySize: Number(row.family_size ?? 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toPayload(userId: string, input: UserOptimizationProfileInput) {
  return {
    user_id: userId,
    budget: Math.max(0, input.budget),
    health_priority: Math.min(100, Math.max(0, input.healthPriority)),
    taste_priority: Math.min(100, Math.max(0, input.tastePriority)),
    convenience_priority: Math.min(100, Math.max(0, input.conveniencePriority)),
    cooking_skill: Math.min(100, Math.max(0, input.cookingSkill)),
    cooking_time_available: Math.max(0, input.cookingTimeAvailable),
    favorite_cuisines: input.favoriteCuisines,
    disliked_foods: input.dislikedFoods,
    allergies: input.allergies,
    dietary_style: input.dietaryStyle,
    fitness_goal: input.fitnessGoal,
    family_size: Math.max(1, input.familySize),
  }
}

export async function getUserOptimizationProfile(userId: string): Promise<UserOptimizationProfile> {
  const { data, error } = await supabase
    .from('user_optimization_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return createUserOptimizationProfile(userId, defaultUserOptimizationProfileInput)
  }

  return mapProfileRow(data as UserOptimizationProfileRow)
}

export async function createUserOptimizationProfile(userId: string, input: UserOptimizationProfileInput): Promise<UserOptimizationProfile> {
  const payload = {
    id: uuidv4(),
    ...toPayload(userId, input),
  }

  const { data, error } = await supabase
    .from('user_optimization_profiles')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return mapProfileRow(data as UserOptimizationProfileRow)
}

export async function upsertUserOptimizationProfile(userId: string, input: UserOptimizationProfileInput): Promise<UserOptimizationProfile> {
  const payload = {
    id: uuidv4(),
    ...toPayload(userId, input),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('user_optimization_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error) throw error
  return mapProfileRow(data as UserOptimizationProfileRow)
}
