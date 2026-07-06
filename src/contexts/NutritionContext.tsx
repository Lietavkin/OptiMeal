import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Meal, NutritionSummary } from '../types'
import { getMealsForUser, createMealForUser, updateMealById, deleteMealById } from '../services/mealsService'
import useAuth from '../hooks/useAuth'

type NutritionContextValue = {
  meals: Meal[]
  summary: NutritionSummary
  loading: boolean
  addMeal: (meal: Omit<Meal, 'id' | 'createdAt' | 'userId'>) => Promise<void>
  removeMeal: (id: string) => Promise<void>
  updateMeal: (id: string, patch: Partial<Meal>) => Promise<void>
  refresh: () => Promise<void>
}

export const NutritionContext = createContext<NutritionContextValue | undefined>(undefined)

function calcSummary(meals: Meal[]): NutritionSummary {
  return meals.reduce(
    (acc, m) => {
      acc.totalCalories += m.calories
      acc.totalProtein += m.protein
      acc.totalCarbs += m.carbs
      acc.totalFat += m.fat
      return acc
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 } as NutritionSummary,
  )
}

export function NutritionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)

  const loadMeals = useCallback(async () => {
    if (!user) {
      setMeals([])
      return
    }
    setLoading(true)
    try {
      const data = await getMealsForUser(user.id)
      setMeals(data)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load meals', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadMeals()
  }, [loadMeals])

  const addMeal = useCallback(
    async (mealData: Omit<Meal, 'id' | 'createdAt' | 'userId'>) => {
      if (!user) throw new Error('Not authenticated')
      const created = await createMealForUser(user.id, mealData)
      setMeals((m) => [created, ...m])
    },
    [user],
  )

  const removeMeal = useCallback(
    async (id: string) => {
      await deleteMealById(id)
      setMeals((m) => m.filter((x) => x.id !== id))
    },
    [],
  )

  const updateMeal = useCallback(async (id: string, patch: Partial<Meal>) => {
    const updated = await updateMealById(id, patch)
    setMeals((m) => m.map((meal) => (meal.id === id ? updated : meal)))
  }, [])

  const refresh = useCallback(async () => loadMeals(), [loadMeals])

  const summary = useMemo(() => calcSummary(meals), [meals])

  const value = useMemo(
    () => ({ meals, summary, loading, addMeal, removeMeal, updateMeal, refresh }),
    [meals, summary, loading, addMeal, removeMeal, updateMeal, refresh],
  )

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>
}

export function useNutrition() {
  const ctx = React.useContext(NutritionContext)
  if (!ctx) throw new Error('useNutrition must be used within NutritionProvider')
  return ctx
}
