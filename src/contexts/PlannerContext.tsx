import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { MealOptimizationMode, MealPlan, PlannedMeal, Recipe } from '../types'
import useAuth from '../hooks/useAuth'
import useProfile from '../hooks/useProfile'
import {
  generatePlannedMealsForWeek,
  generateSinglePlannedMeal,
  getLatestMealPlan,
  getMondayOfWeek,
  replaceMealPlan,
  saveMealPlan,
  updatePlannedMealById,
} from '../services/plannerService'
import {
  buildWeeklyPlanFromRecipes,
  createRecipe,
  getRecipesForUser,
  plannedMealToRecipeInput,
  recipeToPlannedMealFields,
} from '../services/recipeService'
import { syncShoppingListForUser } from '../services/shoppingService'

type PlannerContextValue = {
  plan: MealPlan | null
  loading: boolean
  generating: boolean
  regeneratingId: string | null
  generatePlan: () => Promise<void>
  generatePlanFromRecipes: (mode: MealOptimizationMode) => Promise<void>
  regenerateMeal: (meal: PlannedMeal) => Promise<void>
  updatePlannedMeal: (id: string, patch: Partial<PlannedMeal>) => Promise<void>
  replaceWithRecipe: (meal: PlannedMeal, recipe: Recipe) => Promise<void>
  savePlannedMealAsRecipe: (meal: PlannedMeal) => Promise<void>
  refresh: () => Promise<void>
}

export const PlannerContext = createContext<PlannerContextValue | undefined>(undefined)

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const loadPlan = useCallback(async () => {
    if (!user) {
      setPlan(null)
      return
    }
    setLoading(true)
    try {
      const data = await getLatestMealPlan(user.id)
      setPlan(data)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load meal plan', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  const generatePlan = useCallback(async () => {
    if (!user) throw new Error('Not authenticated')
    setGenerating(true)
    try {
      const weekStart = getMondayOfWeek()
      const meals = await generatePlannedMealsForWeek(profile)
      const saved = plan
        ? await replaceMealPlan(plan.id, user.id, weekStart, meals)
        : await saveMealPlan(user.id, weekStart, meals)
      setPlan(saved)
    } finally {
      setGenerating(false)
    }
  }, [user, profile, plan])

  const regenerateMeal = useCallback(
    async (meal: PlannedMeal) => {
      if (!plan) return
      setRegeneratingId(meal.id)
      try {
        const replacement = await generateSinglePlannedMeal(profile, plan.meals, meal.dayIndex, meal.mealSlot)
        const updated = await updatePlannedMealById(meal.id, replacement)
        setPlan((current) =>
          current
            ? { ...current, meals: current.meals.map((m) => (m.id === meal.id ? updated : m)) }
            : current,
        )
      } finally {
        setRegeneratingId(null)
      }
    },
    [plan, profile],
  )

  const updatePlannedMeal = useCallback(async (id: string, patch: Partial<PlannedMeal>) => {
    const updated = await updatePlannedMealById(id, patch)
    setPlan((current) =>
      current ? { ...current, meals: current.meals.map((m) => (m.id === id ? updated : m)) } : current,
    )
  }, [])

  const value = useMemo(
    () => ({
      plan,
      loading,
      generating,
      regeneratingId,
      generatePlan,
      regenerateMeal,
      updatePlannedMeal,
      refresh: loadPlan,
    }),
    [plan, loading, generating, regeneratingId, generatePlan, regenerateMeal, updatePlannedMeal, loadPlan],
  )

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}
