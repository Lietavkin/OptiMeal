import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { IngredientCatalogInput, IngredientCatalogItem, Recipe, RecipeDraft } from '../types'
import useAuth from '../hooks/useAuth'
import {
  createCustomIngredient,
  deleteCustomIngredient,
  getIngredientCatalogForUser,
  updateCustomIngredient,
} from '../services/ingredientsService'
import {
  createRecipeForUser,
  deleteRecipeById,
  getRecipesForUser,
  toggleFavoriteRecipe,
  updateRecipeById,
} from '../services/recipesService'

type RecipeContextValue = {
  recipes: Recipe[]
  ingredients: IngredientCatalogItem[]
  loading: boolean
  refresh: () => Promise<void>
  createRecipe: (draft: RecipeDraft) => Promise<void>
  updateRecipe: (recipeId: string, draft: RecipeDraft) => Promise<void>
  deleteRecipe: (recipeId: string) => Promise<void>
  toggleFavorite: (recipeId: string, value: boolean) => Promise<void>
  createIngredient: (input: IngredientCatalogInput) => Promise<void>
  updateIngredient: (ingredientId: string, input: IngredientCatalogInput) => Promise<void>
  deleteIngredient: (ingredientId: string) => Promise<void>
}

export const RecipeContext = createContext<RecipeContextValue | undefined>(undefined)

export function RecipeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ingredients, setIngredients] = useState<IngredientCatalogItem[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setRecipes([])
      setIngredients([])
      return
    }

    setLoading(true)
    try {
      const [recipeData, ingredientData] = await Promise.all([
        getRecipesForUser(user.id),
        getIngredientCatalogForUser(user.id),
      ])
      setRecipes(recipeData)
      setIngredients(ingredientData)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load recipe platform data', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createRecipe = useCallback(
    async (draft: RecipeDraft) => {
      if (!user) throw new Error('Not authenticated')
      const created = await createRecipeForUser(user.id, draft)
      setRecipes((prev) => [created, ...prev])
    },
    [user],
  )

  const updateRecipe = useCallback(
    async (recipeId: string, draft: RecipeDraft) => {
      if (!user) throw new Error('Not authenticated')
      const updated = await updateRecipeById(user.id, recipeId, draft)
      setRecipes((prev) => prev.map((recipe) => (recipe.id === recipeId ? updated : recipe)))
    },
    [user],
  )

  const deleteRecipe = useCallback(async (recipeId: string) => {
    if (!user) throw new Error('Not authenticated')
    await deleteRecipeById(user.id, recipeId)
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId))
  }, [user])

  const toggleFavorite = useCallback(async (recipeId: string, value: boolean) => {
    if (!user) throw new Error('Not authenticated')
    await toggleFavoriteRecipe(user.id, recipeId, value)
    setRecipes((prev) => prev.map((recipe) => (recipe.id === recipeId ? { ...recipe, isFavorite: value } : recipe)))
  }, [user])

  const createIngredient = useCallback(async (input: IngredientCatalogInput) => {
    if (!user) throw new Error('Not authenticated')
    const created = await createCustomIngredient(user.id, input)
    setIngredients((prev) => [created, ...prev])
  }, [user])

  const updateIngredient = useCallback(async (ingredientId: string, input: IngredientCatalogInput) => {
    if (!user) throw new Error('Not authenticated')
    const updated = await updateCustomIngredient(user.id, ingredientId, input)
    setIngredients((prev) => prev.map((ingredient) => (ingredient.id === ingredientId ? updated : ingredient)))
  }, [user])

  const deleteIngredient = useCallback(async (ingredientId: string) => {
    if (!user) throw new Error('Not authenticated')
    await deleteCustomIngredient(user.id, ingredientId)
    setIngredients((prev) => prev.filter((ingredient) => ingredient.id !== ingredientId))
  }, [user])

  const value = useMemo(
    () => ({
      recipes,
      ingredients,
      loading,
      refresh,
      createRecipe,
      updateRecipe,
      deleteRecipe,
      toggleFavorite,
      createIngredient,
      updateIngredient,
      deleteIngredient,
    }),
    [recipes, ingredients, loading, refresh, createRecipe, updateRecipe, deleteRecipe, toggleFavorite, createIngredient, updateIngredient, deleteIngredient],
  )

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
}
