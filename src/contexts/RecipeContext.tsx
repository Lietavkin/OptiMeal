import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { MealOptimizationMode, Recipe, RecipeFilters, RecipeInput } from '../types'
import useAuth from '../hooks/useAuth'
import useProfile from '../hooks/useProfile'
import { syncShoppingListForUser } from '../services/shoppingService'
import {
  createRecipe,
  deleteRecipe,
  filterRecipes,
  getRecipesForUser,
  rankRecipesForMode,
  toggleRecipeFavorite,
  updateRecipe,
} from '../services/recipeService'

type RecipeContextValue = {
  recipes: Recipe[]
  filteredRecipes: Recipe[]
  recommendedRecipes: Recipe[]
  loading: boolean
  saving: boolean
  optimizationMode: MealOptimizationMode
  filters: RecipeFilters
  setOptimizationMode: (mode: MealOptimizationMode) => void
  setFilters: (patch: Partial<RecipeFilters>) => void
  createNewRecipe: (input: RecipeInput) => Promise<void>
  saveRecipe: (recipeId: string, input: RecipeInput) => Promise<void>
  removeRecipe: (recipeId: string) => Promise<void>
  toggleFavorite: (recipeId: string, isFavorite: boolean) => Promise<void>
  refresh: () => Promise<void>
}

export const RecipeContext = createContext<RecipeContextValue | undefined>(undefined)

const defaultFilters: RecipeFilters = {
  search: '',
  favoritesOnly: false,
}

export function RecipeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [optimizationMode, setOptimizationMode] = useState<MealOptimizationMode>('balanced')
  const [filters, setFiltersState] = useState<RecipeFilters>(defaultFilters)

  const load = useCallback(async () => {
    if (!user) {
      setRecipes([])
      return
    }
    setLoading(true)
    try {
      setRecipes(await getRecipesForUser(user.id))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load recipes', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const syncShopping = useCallback(async () => {
    if (!user) return
    try {
      await syncShoppingListForUser(user.id)
    } catch {
      // Shopping list may not exist yet
    }
  }, [user])

  const createNewRecipe = useCallback(
    async (input: RecipeInput) => {
      if (!user) throw new Error('Not authenticated')
      setSaving(true)
      try {
        const created = await createRecipe(user.id, input)
        setRecipes((current) => [created, ...current])
        await syncShopping()
      } finally {
        setSaving(false)
      }
    },
    [user, syncShopping],
  )

  const saveRecipe = useCallback(
    async (recipeId: string, input: RecipeInput) => {
      if (!user) throw new Error('Not authenticated')
      setSaving(true)
      try {
        const updated = await updateRecipe(recipeId, user.id, input)
        setRecipes((current) => current.map((recipe) => (recipe.id === recipeId ? updated : recipe)))
        await syncShopping()
      } finally {
        setSaving(false)
      }
    },
    [user, syncShopping],
  )

  const removeRecipe = useCallback(
    async (recipeId: string) => {
      setSaving(true)
      try {
        await deleteRecipe(recipeId)
        setRecipes((current) => current.filter((recipe) => recipe.id !== recipeId))
        await syncShopping()
      } finally {
        setSaving(false)
      }
    },
    [syncShopping],
  )

  const toggleFavorite = useCallback(async (recipeId: string, isFavorite: boolean) => {
    await toggleRecipeFavorite(recipeId, isFavorite)
    setRecipes((current) =>
      current.map((recipe) => (recipe.id === recipeId ? { ...recipe, isFavorite } : recipe)),
    )
  }, [])

  const setFilters = useCallback((patch: Partial<RecipeFilters>) => {
    setFiltersState((current) => ({ ...current, ...patch }))
  }, [])

  const filteredRecipes = useMemo(() => filterRecipes(recipes, filters), [recipes, filters])
  const recommendedRecipes = useMemo(
    () => rankRecipesForMode(filteredRecipes, optimizationMode, profile).slice(0, 6),
    [filteredRecipes, optimizationMode, profile],
  )

  const value = useMemo(
    () => ({
      recipes,
      filteredRecipes,
      recommendedRecipes,
      loading,
      saving,
      optimizationMode,
      filters,
      setOptimizationMode,
      setFilters,
      createNewRecipe,
      saveRecipe,
      removeRecipe,
      toggleFavorite,
      refresh: load,
    }),
    [
      recipes,
      filteredRecipes,
      recommendedRecipes,
      loading,
      saving,
      optimizationMode,
      filters,
      setFilters,
      createNewRecipe,
      saveRecipe,
      removeRecipe,
      toggleFavorite,
      load,
    ],
  )

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
}
