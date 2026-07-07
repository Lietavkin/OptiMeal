import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type { EatingOutPlanSlot, RestaurantMealSlot } from '../types'

type EatingOutPlanSlotRow = {
  id: string
  user_id: string
  slot_date: string
  meal_slot: RestaurantMealSlot
  is_eating_out: boolean
  planned_restaurant: string | null
  created_at: string
  updated_at: string
}

function mapSlot(row: EatingOutPlanSlotRow): EatingOutPlanSlot {
  return {
    id: row.id,
    userId: row.user_id,
    slotDate: row.slot_date,
    mealSlot: row.meal_slot,
    isEatingOut: Boolean(row.is_eating_out),
    plannedRestaurant: row.planned_restaurant ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getEatingOutPlanSlots(userId: string): Promise<EatingOutPlanSlot[]> {
  const { data, error } = await supabase
    .from('eating_out_plan_slots')
    .select('*')
    .eq('user_id', userId)
    .order('slot_date', { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => mapSlot(row as EatingOutPlanSlotRow))
}

export async function upsertEatingOutPlanSlot(
  userId: string,
  slotDate: string,
  mealSlot: RestaurantMealSlot,
  isEatingOut: boolean,
  plannedRestaurant?: string,
): Promise<EatingOutPlanSlot> {
  const payload = {
    id: uuidv4(),
    user_id: userId,
    slot_date: slotDate,
    meal_slot: mealSlot,
    is_eating_out: isEatingOut,
    planned_restaurant: plannedRestaurant ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('eating_out_plan_slots')
    .upsert(payload, { onConflict: 'user_id,slot_date,meal_slot' })
    .select('*')
    .single()

  if (error) throw error
  return mapSlot(data as EatingOutPlanSlotRow)
}
