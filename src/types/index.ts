import type { ReactNode } from 'react'

export type Feature = {
  icon: string
  title: string
  description: string
}

export type Step = {
  icon: ReactNode
  title: string
  description: string
}

export type Meal = {
  id: string
  userId: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  photoUrl?: string | null
  photoPath?: string | null
  notes?: string
  createdAt: string
  updatedAt?: string
}

export type NutritionGoal = {
  id: string
  user_id: string
  calories: number
  protein: number
  carbs: number
  fat: number
  active: boolean
  created_at: string
}

export type Profile = {
  id: string
  email?: string
  display_name?: string
  daily_calories_goal?: number
  daily_protein_goal?: number
  daily_carbs_goal?: number
  daily_fat_goal?: number
}

export type NutritionSummary = {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}
