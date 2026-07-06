import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { OptimizerMode, ShoppingList, ShoppingListItem, ShoppingSummary } from '../types'
import useAuth from '../hooks/useAuth'
import { getLatestMealPlan } from '../services/plannerService'
import {
  computeShoppingSummary,
  generateShoppingListForUser,
  getLatestShoppingList,
  repriceShoppingListItems,
  updateShoppingListItemById,
  updateShoppingListSettings,
} from '../services/shoppingService'

type ShoppingContextValue = {
  list: ShoppingList | null
  summary: ShoppingSummary
  loading: boolean
  generating: boolean
  hasMealPlan: boolean
  generateList: () => Promise<void>
  setOptimizerMode: (mode: OptimizerMode) => Promise<void>
  setWeeklyBudget: (budget: number) => Promise<void>
  updateItem: (id: string, patch: Partial<ShoppingListItem>) => Promise<void>
  refresh: () => Promise<void>
}

export const ShoppingContext = createContext<ShoppingContextValue | undefined>(undefined)

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [list, setList] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [hasMealPlan, setHasMealPlan] = useState(false)

  const load = useCallback(async () => {
    if (!user) {
      setList(null)
      setHasMealPlan(false)
      return
    }
    setLoading(true)
    try {
      const [shoppingList, mealPlan] = await Promise.all([getLatestShoppingList(user.id), getLatestMealPlan(user.id)])
      setList(shoppingList)
      setHasMealPlan(Boolean(mealPlan))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load shopping list', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const generateList = useCallback(async () => {
    if (!user) throw new Error('Not authenticated')
    setGenerating(true)
    try {
      const saved = await generateShoppingListForUser(
        user.id,
        list?.weeklyBudget ?? 150,
        list?.optimizerMode ?? 'balanced',
      )
      setList(saved)
      setHasMealPlan(true)
    } finally {
      setGenerating(false)
    }
  }, [user, list?.weeklyBudget, list?.optimizerMode])

  const setOptimizerMode = useCallback(
    async (mode: OptimizerMode) => {
      if (!list) return
      await updateShoppingListSettings(list.id, { optimizerMode: mode })
      const items = await repriceShoppingListItems(list.id, mode)
      setList({ ...list, optimizerMode: mode, items, updatedAt: new Date().toISOString() })
    },
    [list],
  )

  const setWeeklyBudget = useCallback(
    async (budget: number) => {
      if (!list) return
      await updateShoppingListSettings(list.id, { weeklyBudget: budget })
      setList({ ...list, weeklyBudget: budget, updatedAt: new Date().toISOString() })
    },
    [list],
  )

  const updateItem = useCallback(async (id: string, patch: Partial<ShoppingListItem>) => {
    const updated = await updateShoppingListItemById(id, patch)
    setList((current) =>
      current ? { ...current, items: current.items.map((item) => (item.id === id ? updated : item)) } : current,
    )
  }, [])

  const summary = useMemo(
    () =>
      computeShoppingSummary(list?.items ?? [], list?.weeklyBudget ?? 150, list?.optimizerMode ?? 'balanced'),
    [list],
  )

  const value = useMemo(
    () => ({
      list,
      summary,
      loading,
      generating,
      hasMealPlan,
      generateList,
      setOptimizerMode,
      setWeeklyBudget,
      updateItem,
      refresh: load,
    }),
    [list, summary, loading, generating, hasMealPlan, generateList, setOptimizerMode, setWeeklyBudget, updateItem, load],
  )

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}
