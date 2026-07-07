import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import DashboardLayout from '../components/DashboardLayout'
import { RecipeProvider } from '../contexts/RecipeContext'
import useAuth from '../hooks/useAuth'
import useRecipes from '../hooks/useRecipes'
import { generateAIRecommendations } from '../services/aiRecommendationService'
import {
  getEatingOutPlanSlots,
  upsertEatingOutPlanSlot,
} from '../services/eatingOutPlannerService'
import { optimizeWeeklyGroceryPlan } from '../services/groceryOptimizationService'
import { getActiveNutritionGoal } from '../services/nutritionGoalsService'
import { rankRecipesForGoal } from '../services/optimizationService'
import { getWeekStartDate, reoptimizeDailyNutrition, buildWeeklyRealWorldMetrics } from '../services/realWorldNutritionService'
import { searchRestaurantMenuMeals } from '../services/restaurantAdapters'
import {
  createRestaurantMeal,
  deleteRestaurantMeal,
  getRestaurantMealsForUser,
  importedMenuMealToInput,
  updateRestaurantMeal,
} from '../services/restaurantMealsService'
import {
  createPantryItem,
  deletePantryItem,
  getPantryForUser,
  updatePantryItem,
} from '../services/pantryService'
import {
  createSupabaseStoreInventoryProvider,
  getGroceryStores,
  seedPlaceholderStoreInventory,
} from '../services/storeInventoryService'
import {
  defaultUserOptimizationProfileInput,
  getUserOptimizationProfile,
  upsertUserOptimizationProfile,
} from '../services/userOptimizationProfileService'
import type {
  AIRecommendation,
  AIRecommendationResult,
  DietaryStyle,
  FitnessGoal,
  GroceryOptimizationGoal,
  GroceryOptimizationResult,
  GroceryStore,
  IngredientCatalogInput,
  PantryItem,
  PantryItemInput,
  RestaurantMeal,
  RestaurantMealInput,
  RestaurantMealSlot,
  RestaurantProviderKey,
  ImportedMenuMeal,
  EatingOutPlanSlot,
  DailyReoptimizationResult,
  WeeklyRealWorldMetrics,
  OptimizationGoal,
  Recipe,
  RecipeDraft,
  RecipeIngredientDraft,
  StoreKey,
  UserOptimizationProfileInput,
} from '../types'

type RecipesWorkspaceSectionId =
  | 'recipes-builder'
  | 'planner'
  | 'shopping'
  | 'profile'
  | 'pantry'
  | 'ingredients'
  | 'optimization'

const recipesWorkspaceSections: Array<{ id: RecipesWorkspaceSectionId; label: string }> = [
  { id: 'recipes-builder', label: 'Recipes' },
  { id: 'planner', label: 'Planner' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'profile', label: 'Profile' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'optimization', label: 'Preview' },
]

const optimizationGoals: Array<{ value: OptimizationGoal; label: string }> = [
  { value: 'lowest_cost', label: 'Lowest Cost' },
  { value: 'healthiest', label: 'Healthiest' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'student_budget', label: 'Student Budget' },
  { value: 'family_budget', label: 'Family Budget' },
  { value: 'fastest_cooking', label: 'Fastest Cooking' },
  { value: 'lowest_food_waste', label: 'Lowest Food Waste' },
]

const groceryOptimizationGoals: Array<{ value: GroceryOptimizationGoal; label: string }> = [
  { value: 'lowest_total_cost', label: 'Lowest total cost' },
  { value: 'highest_nutrition', label: 'Highest nutrition' },
  { value: 'best_nutrition_per_dollar', label: 'Best nutrition per dollar' },
  { value: 'lowest_food_waste', label: 'Lowest food waste' },
  { value: 'fastest_shopping', label: 'Fastest shopping (fewest stores)' },
  { value: 'single_store_only', label: 'Single-store only' },
  { value: 'multi_store_optimized', label: 'Multi-store optimized' },
]

const dietaryStyleOptions: Array<{ value: DietaryStyle; label: string }> = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Keto' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'paleo', label: 'Paleo' },
]

const fitnessGoalOptions: Array<{ value: FitnessGoal; label: string }> = [
  { value: 'muscle_gain', label: 'Muscle gain' },
  { value: 'fat_loss', label: 'Fat loss' },
  { value: 'maintenance', label: 'Maintenance' },
]

const restaurantMealSlots: Array<{ value: RestaurantMealSlot; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
]

const restaurantProviders: Array<{ value: RestaurantProviderKey; label: string }> = [
  { value: 'mcdonalds', label: "McDonald's" },
  { value: 'starbucks', label: 'Starbucks' },
  { value: 'subway', label: 'Subway' },
  { value: 'local_restaurant', label: 'Local Restaurants' },
  { value: 'delivery_platform', label: 'Delivery Platforms' },
]

const blankIngredient: RecipeIngredientDraft = {
  ingredientId: null,
  displayName: '',
  quantity: 1,
  unit: 'g',
  notes: '',
  estimatedCost: 0,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
}

const blankIngredientInput: IngredientCatalogInput = {
  canonicalName: '',
  aliases: [],
  category: 'General',
  defaultUnit: 'g',
  commonPackageSize: 1,
  estimatedPricePerUnit: 0,
  currency: 'USD',
  caloriesPerUnit: 0,
  proteinPerUnit: 0,
  carbsPerUnit: 0,
  fatPerUnit: 0,
  metadata: {},
}

const blankPantryInput: PantryItemInput = {
  ingredientId: null,
  ingredientName: '',
  category: 'General',
  quantity: 1,
  unit: 'g',
  expirationDate: null,
}

const todayIso = new Date().toISOString().slice(0, 10)

const blankRestaurantMealInput: RestaurantMealInput = {
  restaurantName: '',
  mealName: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  servingSize: '1 serving',
  estimatedPrice: 0,
  confidenceScore: 80,
  source: 'manual',
  entryMode: 'manual',
  mealDate: todayIso,
  mealSlot: 'dinner',
  externalRef: {},
}

function toDraft(recipe?: Recipe): RecipeDraft {
  if (!recipe) {
    return {
      title: '',
      description: '',
      servings: 2,
      cookingTimeMinutes: 25,
      instructions: '',
      isFavorite: false,
      ingredients: [{ ...blankIngredient }],
    }
  }

  return {
    title: recipe.title,
    description: recipe.description ?? '',
    servings: recipe.servings,
    cookingTimeMinutes: recipe.cookingTimeMinutes ?? 25,
    instructions: recipe.instructions,
    isFavorite: recipe.isFavorite,
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((item) => ({
          ingredientId: item.ingredientId,
          displayName: item.displayName,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes ?? '',
          estimatedCost: item.estimatedCost,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        }))
      : [{ ...blankIngredient }],
  }
}

function RecipesWorkspace() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<RecipesWorkspaceSectionId>('recipes-builder')

  const {
    recipes,
    ingredients,
    loading,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleFavorite,
    createIngredient,
    updateIngredient,
    deleteIngredient,
  } = useRecipes()

  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null)
  const [draft, setDraft] = useState<RecipeDraft>(() => toDraft())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [ingredientDraft, setIngredientDraft] = useState<IngredientCatalogInput>({ ...blankIngredientInput })
  const [activeIngredientId, setActiveIngredientId] = useState<string | null>(null)
  const [ingredientSubmitting, setIngredientSubmitting] = useState(false)

  const [goal, setGoal] = useState<OptimizationGoal>('balanced')
  const [groceryGoal, setGroceryGoal] = useState<GroceryOptimizationGoal>('multi_store_optimized')
  const [groceryStores, setGroceryStores] = useState<GroceryStore[]>([])
  const [allowedStoreKeys, setAllowedStoreKeys] = useState<StoreKey[]>([])
  const [singleStoreKey, setSingleStoreKey] = useState<StoreKey>('lidl')
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([])
  const [plannedServingsByRecipeId, setPlannedServingsByRecipeId] = useState<Record<string, number>>({})
  const [groceryResult, setGroceryResult] = useState<GroceryOptimizationResult | null>(null)
  const [groceryLoading, setGroceryLoading] = useState(false)
  const [groceryError, setGroceryError] = useState('')

  const [profileDraft, setProfileDraft] = useState<UserOptimizationProfileInput>(defaultUserOptimizationProfileInput)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [pantryDraft, setPantryDraft] = useState<PantryItemInput>({ ...blankPantryInput })
  const [activePantryId, setActivePantryId] = useState<string | null>(null)
  const [pantrySaving, setPantrySaving] = useState(false)
  const [pantryError, setPantryError] = useState('')

  const [aiResult, setAiResult] = useState<AIRecommendationResult | null>(null)
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([])

  const [nutritionGoal, setNutritionGoal] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null)
  const [restaurantMeals, setRestaurantMeals] = useState<RestaurantMeal[]>([])
  const [restaurantMealDraft, setRestaurantMealDraft] = useState<RestaurantMealInput>({ ...blankRestaurantMealInput })
  const [activeRestaurantMealId, setActiveRestaurantMealId] = useState<string | null>(null)
  const [restaurantMealSaving, setRestaurantMealSaving] = useState(false)
  const [restaurantMealError, setRestaurantMealError] = useState('')
  const [selectedRestaurantProvider, setSelectedRestaurantProvider] = useState<RestaurantProviderKey>('mcdonalds')
  const [menuSearchQuery, setMenuSearchQuery] = useState('')
  const [importedMenuMeals, setImportedMenuMeals] = useState<ImportedMenuMeal[]>([])

  const [eatingOutSlots, setEatingOutSlots] = useState<EatingOutPlanSlot[]>([])
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => getWeekStartDate(new Date()))

  const [dailyReoptimization, setDailyReoptimization] = useState<DailyReoptimizationResult | null>(null)
  const [weeklyRealWorldMetrics, setWeeklyRealWorldMetrics] = useState<WeeklyRealWorldMetrics | null>(null)

  const optimizationPreview = useMemo(() => {
    return rankRecipesForGoal({ goal, recipes, limit: 3 })
  }, [goal, recipes])

  const firstTimeChecklist = useMemo(
    () => [
      {
        label: 'Add recipe base',
        value: recipes.length,
        done: recipes.length > 0,
        helper: 'recipes saved',
      },
      {
        label: 'Set pantry',
        value: pantryItems.length,
        done: pantryItems.length > 0,
        helper: 'items tracked',
      },
      {
        label: 'Plan week',
        value: restaurantMeals.length,
        done: restaurantMeals.length > 0,
        helper: 'meals out logged',
      },
      {
        label: 'Generate shopping',
        value: groceryResult ? 1 : 0,
        done: Boolean(groceryResult),
        helper: groceryResult ? 'ready' : 'pending',
      },
    ],
    [recipes.length, pantryItems.length, restaurantMeals.length, groceryResult],
  )

  useEffect(() => {
    setSelectedRecipeIds(recipes.map((recipe) => recipe.id))
    setPlannedServingsByRecipeId(
      recipes.reduce<Record<string, number>>((acc, recipe) => {
        acc[recipe.id] = recipe.servings
        return acc
      }, {}),
    )
  }, [recipes])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    recipesWorkspaceSections.forEach(({ id }) => {
      const node = document.getElementById(id)
      if (!node) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id)
            }
          })
        },
        { rootMargin: '-30% 0px -55% 0px', threshold: 0.01 },
      )

      observer.observe(node)
      observers.push(observer)
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  function scrollToSection(sectionId: RecipesWorkspaceSectionId) {
    const node = document.getElementById(sectionId)
    if (!node) return

    node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(sectionId)
  }

  useEffect(() => {
    let cancelled = false

    async function loadStoreData() {
      try {
        await seedPlaceholderStoreInventory()
        const stores = await getGroceryStores()
        if (cancelled) return

        setGroceryStores(stores)
        setAllowedStoreKeys(stores.map((store) => store.key))
        if (stores.length > 0) {
          setSingleStoreKey(stores[0].key)
        }
      } catch (storeError) {
        if (cancelled) return
        // eslint-disable-next-line no-console
        console.error('Failed to load grocery store inventory', storeError)
      }
    }

    void loadStoreData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setPantryItems([])
      setProfileDraft(defaultUserOptimizationProfileInput)
      return
    }

    const userId = user.id

    let cancelled = false

    async function loadAiAssistantData() {
      try {
        const [profile, pantry, activeNutritionGoal, userRestaurantMeals, userEatingOutSlots] = await Promise.all([
          getUserOptimizationProfile(userId),
          getPantryForUser(userId),
          getActiveNutritionGoal(userId),
          getRestaurantMealsForUser(userId),
          getEatingOutPlanSlots(userId),
        ])

        if (cancelled) return

        setProfileDraft({
          budget: profile.budget,
          healthPriority: profile.healthPriority,
          tastePriority: profile.tastePriority,
          conveniencePriority: profile.conveniencePriority,
          cookingSkill: profile.cookingSkill,
          cookingTimeAvailable: profile.cookingTimeAvailable,
          favoriteCuisines: profile.favoriteCuisines,
          dislikedFoods: profile.dislikedFoods,
          allergies: profile.allergies,
          dietaryStyle: profile.dietaryStyle,
          fitnessGoal: profile.fitnessGoal,
          familySize: profile.familySize,
        })
        setPantryItems(pantry)
        setRestaurantMeals(userRestaurantMeals)
        setEatingOutSlots(userEatingOutSlots)
        if (activeNutritionGoal) {
          setNutritionGoal({
            calories: activeNutritionGoal.calories,
            protein: activeNutritionGoal.protein,
            carbs: activeNutritionGoal.carbs,
            fat: activeNutritionGoal.fat,
          })
        } else {
          setNutritionGoal(null)
        }
      } catch (loadError) {
        if (cancelled) return
        // eslint-disable-next-line no-console
        console.error('Failed to load AI assistant data', loadError)
      }
    }

    void loadAiAssistantData()

    return () => {
      cancelled = true
    }
  }, [user])

  function resetRecipeForm() {
    setActiveRecipeId(null)
    setDraft(toDraft())
    setError('')
  }

  function resetIngredientForm() {
    setActiveIngredientId(null)
    setIngredientDraft({ ...blankIngredientInput })
  }

  function handleRecipeFieldChange<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleIngredientLineChange(index: number, patch: Partial<RecipeIngredientDraft>) {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
  }

  function addIngredientLine() {
    setDraft((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...blankIngredient }],
    }))
  }

  function removeIngredientLine(index: number) {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.length === 1 ? prev.ingredients : prev.ingredients.filter((_, i) => i !== index),
    }))
  }

  async function handleRecipeSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    const cleanedIngredients = draft.ingredients.filter((ingredient) => ingredient.displayName.trim().length > 0)
    if (!draft.title.trim()) {
      setError('Recipe title is required.')
      return
    }

    if (!draft.instructions.trim()) {
      setError('Cooking instructions are required.')
      return
    }

    if (cleanedIngredients.length === 0) {
      setError('At least one ingredient is required.')
      return
    }

    setSubmitting(true)
    try {
      const payload: RecipeDraft = {
        ...draft,
        title: draft.title.trim(),
        instructions: draft.instructions.trim(),
        ingredients: cleanedIngredients,
      }

      if (activeRecipeId) {
        await updateRecipe(activeRecipeId, payload)
      } else {
        await createRecipe(payload)
      }

      resetRecipeForm()
    } catch (submitError) {
      // eslint-disable-next-line no-console
      console.error('Failed to save recipe', submitError)
      setError('Could not save recipe. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEditRecipe(recipe: Recipe) {
    setActiveRecipeId(recipe.id)
    setDraft(toDraft(recipe))
    setError('')
  }

  function toggleRecipeForWeeklyPlan(recipeId: string) {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId],
    )
  }

  function toggleAllowedStore(storeKey: StoreKey) {
    setAllowedStoreKeys((prev) =>
      prev.includes(storeKey) ? prev.filter((key) => key !== storeKey) : [...prev, storeKey],
    )
  }

  function getWeekDates(weekStartIso: string) {
    const start = new Date(weekStartIso)
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date.toISOString().slice(0, 10)
    })
  }

  function getEatingOutSlotState(dateIso: string, mealSlot: RestaurantMealSlot) {
    return eatingOutSlots.find((slot) => slot.slotDate === dateIso && slot.mealSlot === mealSlot)?.isEatingOut ?? false
  }

  function getWeeklyHomeMealMultiplier() {
    const weekDates = getWeekDates(selectedWeekStart)
    const totalSlots = weekDates.length * restaurantMealSlots.length

    const eatingOutCount = weekDates
      .flatMap((date) => restaurantMealSlots.map((slot) => getEatingOutSlotState(date, slot.value)))
      .filter(Boolean).length

    const homeSlots = Math.max(0, totalSlots - eatingOutCount)
    return totalSlots > 0 ? homeSlots / totalSlots : 1
  }

  async function handleGenerateGroceryPlan() {
    const homeMealMultiplier = getWeeklyHomeMealMultiplier()

    const entries = selectedRecipeIds
      .map((recipeId) => ({
        recipeId,
        plannedServings: Math.max(0, Number(plannedServingsByRecipeId[recipeId] ?? 1) * homeMealMultiplier),
      }))
      .filter((entry) => entry.plannedServings > 0)

    if (entries.length === 0) {
      setGroceryError('Select at least one recipe for your weekly meal plan.')
      setGroceryResult(null)
      return
    }

    setGroceryLoading(true)
    setGroceryError('')

    try {
      const weekDates = new Set(getWeekDates(selectedWeekStart))
      const weeklyRestaurantMeals = restaurantMeals.filter((meal) => weekDates.has(meal.mealDate))

      const result = await optimizeWeeklyGroceryPlan({
        goal: groceryGoal,
        recipes,
        ingredientCatalog: ingredients,
        weeklyMealPlan: { entries },
        inventoryProvider: createSupabaseStoreInventoryProvider(),
        pantry: pantryItems,
        allowedStoreKeys:
          groceryGoal === 'single_store_only'
            ? [singleStoreKey]
            : allowedStoreKeys.length > 0
              ? allowedStoreKeys
              : undefined,
        constraints: {
          macroTargets: nutritionGoal
            ? {
                calories: nutritionGoal.calories * 7,
                protein: nutritionGoal.protein * 7,
                carbs: nutritionGoal.carbs * 7,
                fat: nutritionGoal.fat * 7,
              }
            : undefined,
          budget: profileDraft.budget > 0 ? profileDraft.budget : undefined,
          pantryItems: pantryItems,
          restaurantMeals: weeklyRestaurantMeals,
          allergies: profileDraft.allergies,
          dietaryRestrictions: [profileDraft.dietaryStyle],
          mealFrequency: {
            min: Math.min(entries.length, Math.max(1, Math.ceil(entries.length * 0.6))),
            max: entries.length,
          },
          maxCookingMinutesPerRecipe: profileDraft.cookingTimeAvailable,
          maxTotalCookingMinutes: Math.max(45, profileDraft.cookingTimeAvailable * 7),
          preferredStores:
            groceryGoal === 'single_store_only'
              ? [singleStoreKey]
              : allowedStoreKeys.length > 0
                ? allowedStoreKeys
                : undefined,
          maxShoppingTrips: groceryGoal === 'single_store_only' ? 1 : Math.min(3, Math.max(1, allowedStoreKeys.length || 2)),
        },
      })
      setGroceryResult(result)
      setAiResult(null)
      setAiRecommendations([])
    } catch (optimizationError) {
      // eslint-disable-next-line no-console
      console.error('Failed to generate grocery optimization plan', optimizationError)
      setGroceryResult(null)
      setGroceryError('Could not generate grocery optimization plan. Please try again.')
    } finally {
      setGroceryLoading(false)
    }
  }

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return

    setProfileSaving(true)
    setProfileError('')

    try {
      const saved = await upsertUserOptimizationProfile(user.id, profileDraft)
      setProfileDraft({
        budget: saved.budget,
        healthPriority: saved.healthPriority,
        tastePriority: saved.tastePriority,
        conveniencePriority: saved.conveniencePriority,
        cookingSkill: saved.cookingSkill,
        cookingTimeAvailable: saved.cookingTimeAvailable,
        favoriteCuisines: saved.favoriteCuisines,
        dislikedFoods: saved.dislikedFoods,
        allergies: saved.allergies,
        dietaryStyle: saved.dietaryStyle,
        fitnessGoal: saved.fitnessGoal,
        familySize: saved.familySize,
      })
    } catch (saveError) {
      // eslint-disable-next-line no-console
      console.error('Failed to save optimization profile', saveError)
      setProfileError('Could not save profile. Please try again.')
    } finally {
      setProfileSaving(false)
    }
  }

  function resetPantryForm() {
    setActivePantryId(null)
    setPantryDraft({ ...blankPantryInput })
  }

  async function handlePantrySubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!user || !pantryDraft.ingredientName.trim()) return

    setPantrySaving(true)
    setPantryError('')

    try {
      const payload: PantryItemInput = {
        ...pantryDraft,
        ingredientName: pantryDraft.ingredientName.trim(),
      }

      if (activePantryId) {
        const updated = await updatePantryItem(user.id, activePantryId, payload)
        setPantryItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const created = await createPantryItem(user.id, payload)
        setPantryItems((prev) => [created, ...prev])
      }

      resetPantryForm()
      setAiResult(null)
      setAiRecommendations([])
    } catch (submitError) {
      // eslint-disable-next-line no-console
      console.error('Failed to save pantry item', submitError)
      setPantryError('Could not save pantry item. Please try again.')
    } finally {
      setPantrySaving(false)
    }
  }

  async function handleDeletePantryItem(pantryItemId: string) {
    if (!user) return

    try {
      await deletePantryItem(user.id, pantryItemId)
      setPantryItems((prev) => prev.filter((item) => item.id !== pantryItemId))
      if (activePantryId === pantryItemId) {
        resetPantryForm()
      }
      setAiResult(null)
      setAiRecommendations([])
    } catch (deleteError) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete pantry item', deleteError)
    }
  }

  function resetRestaurantMealForm() {
    setActiveRestaurantMealId(null)
    setRestaurantMealDraft({ ...blankRestaurantMealInput, mealDate: restaurantMealDraft.mealDate || todayIso })
  }

  async function handleSearchMenuMeals() {
    const results = await searchRestaurantMenuMeals(selectedRestaurantProvider, menuSearchQuery)
    setImportedMenuMeals(results)
  }

  function applyImportedMenuMeal(menuMeal: ImportedMenuMeal) {
    setRestaurantMealDraft(importedMenuMealToInput(menuMeal, restaurantMealDraft.mealDate, restaurantMealDraft.mealSlot))
  }

  async function handleRestaurantMealSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!user || !restaurantMealDraft.restaurantName.trim() || !restaurantMealDraft.mealName.trim()) return

    setRestaurantMealSaving(true)
    setRestaurantMealError('')

    try {
      const payload: RestaurantMealInput = {
        ...restaurantMealDraft,
        restaurantName: restaurantMealDraft.restaurantName.trim(),
        mealName: restaurantMealDraft.mealName.trim(),
      }

      if (activeRestaurantMealId) {
        const updated = await updateRestaurantMeal(user.id, activeRestaurantMealId, payload)
        setRestaurantMeals((prev) => prev.map((meal) => (meal.id === updated.id ? updated : meal)))
      } else {
        const created = await createRestaurantMeal(user.id, payload)
        setRestaurantMeals((prev) => [created, ...prev])
      }

      resetRestaurantMealForm()
      await handleGenerateGroceryPlan()
    } catch (saveError) {
      // eslint-disable-next-line no-console
      console.error('Failed to save restaurant meal', saveError)
      setRestaurantMealError('Could not save restaurant meal. Please try again.')
    } finally {
      setRestaurantMealSaving(false)
    }
  }

  async function handleDeleteRestaurantMeal(mealId: string) {
    if (!user) return

    try {
      await deleteRestaurantMeal(user.id, mealId)
      setRestaurantMeals((prev) => prev.filter((meal) => meal.id !== mealId))
      if (activeRestaurantMealId === mealId) {
        resetRestaurantMealForm()
      }
      await handleGenerateGroceryPlan()
    } catch (deleteError) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete restaurant meal', deleteError)
    }
  }

  async function handleToggleEatingOutSlot(slotDate: string, mealSlot: RestaurantMealSlot, checked: boolean) {
    if (!user) return

    try {
      const updated = await upsertEatingOutPlanSlot(user.id, slotDate, mealSlot, checked)
      setEatingOutSlots((prev) => {
        const exists = prev.some((slot) => slot.slotDate === slotDate && slot.mealSlot === mealSlot)
        if (!exists) return [...prev, updated]
        return prev.map((slot) => (slot.slotDate === slotDate && slot.mealSlot === mealSlot ? updated : slot))
      })
      await handleGenerateGroceryPlan()
    } catch (slotError) {
      // eslint-disable-next-line no-console
      console.error('Failed to update eating out planner slot', slotError)
    }
  }

  useEffect(() => {
    const activeDate = restaurantMealDraft.mealDate || todayIso
    setDailyReoptimization(
      reoptimizeDailyNutrition({
        date: activeDate,
        nutritionGoal: nutritionGoal
          ? {
              id: 'active',
              user_id: user?.id ?? 'unknown',
              calories: nutritionGoal.calories,
              protein: nutritionGoal.protein,
              carbs: nutritionGoal.carbs,
              fat: nutritionGoal.fat,
              active: true,
              created_at: new Date().toISOString(),
            }
          : null,
        recipes,
        restaurantMeals,
      }),
    )
  }, [restaurantMealDraft.mealDate, nutritionGoal, recipes, restaurantMeals, user])

  useEffect(() => {
    setWeeklyRealWorldMetrics(
      buildWeeklyRealWorldMetrics(
        selectedWeekStart,
        restaurantMeals,
        selectedRecipeIds.length,
        groceryResult?.totalExpectedCost ?? 0,
        nutritionGoal
          ? {
              id: 'active',
              user_id: user?.id ?? 'unknown',
              calories: nutritionGoal.calories,
              protein: nutritionGoal.protein,
              carbs: nutritionGoal.carbs,
              fat: nutritionGoal.fat,
              active: true,
              created_at: new Date().toISOString(),
            }
          : null,
      ),
    )
  }, [selectedWeekStart, restaurantMeals, selectedRecipeIds.length, groceryResult?.totalExpectedCost, nutritionGoal, user])

  function handleGenerateAiRecommendations() {
    if (!groceryResult) {
      setGroceryError('Generate a grocery plan before requesting AI recommendations.')
      return
    }

    const syntheticProfile = {
      id: 'local-profile',
      userId: user?.id ?? 'unknown',
      ...profileDraft,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const result = generateAIRecommendations({
      profile: syntheticProfile,
      recipes,
      ingredients,
      pantry: pantryItems,
      groceryResult,
    })

    setAiResult(result)
    setAiRecommendations(result.recommendations)
  }

  async function handleIngredientSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!ingredientDraft.canonicalName.trim()) return

    setIngredientSubmitting(true)
    try {
      const payload = {
        ...ingredientDraft,
        canonicalName: ingredientDraft.canonicalName.trim(),
      }

      if (activeIngredientId) {
        await updateIngredient(activeIngredientId, payload)
      } else {
        await createIngredient(payload)
      }

      resetIngredientForm()
    } catch (submitError) {
      // eslint-disable-next-line no-console
      console.error('Failed to save ingredient', submitError)
    } finally {
      setIngredientSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Optimization engine foundation</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Recipes and Ingredient Catalog</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">
          Build optimization-ready recipes with ingredient-level nutrition and cost data. This subsystem is structured for future grocery pricing and multi-objective optimization.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {firstTimeChecklist.map((item) => (
            <div key={item.label} className={`rounded-2xl border px-4 py-3 ${item.done ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
              <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky top-20 z-30 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {recipesWorkspaceSections.map((section) => {
            const isActive = activeSection === section.id

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${isActive ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {section.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="space-y-6">
          <div id="recipes-builder" className="scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">{activeRecipeId ? 'Edit recipe' : 'Create recipe'}</h2>
              {activeRecipeId ? (
                <Button type="button" variant="ghost" onClick={resetRecipeForm}>New recipe</Button>
              ) : null}
            </div>

            <form onSubmit={handleRecipeSubmit} className="mt-6 space-y-5">
              {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Title
                  <input
                    value={draft.title}
                    onChange={(event) => handleRecipeFieldChange('title', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Description
                  <input
                    value={draft.description ?? ''}
                    onChange={(event) => handleRecipeFieldChange('description', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Servings
                  <input
                    type="number"
                    min={1}
                    value={draft.servings}
                    onChange={(event) => handleRecipeFieldChange('servings', Math.max(1, Number(event.target.value)))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Cooking time (minutes)
                  <input
                    type="number"
                    min={1}
                    value={draft.cookingTimeMinutes ?? 25}
                    onChange={(event) => handleRecipeFieldChange('cookingTimeMinutes', Math.max(1, Number(event.target.value)))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Cooking instructions
                <textarea
                  value={draft.instructions}
                  onChange={(event) => handleRecipeFieldChange('instructions', event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  rows={4}
                  required
                />
              </label>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Ingredients</h3>
                  <Button type="button" variant="ghost" onClick={addIngredientLine}>Add ingredient</Button>
                </div>

                {draft.ingredients.map((item, index) => (
                  <div key={`ingredient-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="text-xs font-medium text-slate-600">
                        Catalog ingredient
                        <select
                          value={item.ingredientId ?? ''}
                          onChange={(event) => {
                            const selected = ingredients.find((ingredient) => ingredient.id === event.target.value)
                            handleIngredientLineChange(index, {
                              ingredientId: selected?.id ?? null,
                              displayName: selected?.canonicalName ?? item.displayName,
                              unit: selected?.defaultUnit ?? item.unit,
                            })
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Custom / none</option>
                          {ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>{ingredient.canonicalName}</option>
                          ))}
                        </select>
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        Display name
                        <input
                          value={item.displayName}
                          onChange={(event) => handleIngredientLineChange(index, { displayName: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        Quantity
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(event) => handleIngredientLineChange(index, { quantity: Math.max(0, Number(event.target.value)) })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        Unit
                        <input
                          value={item.unit}
                          onChange={(event) => handleIngredientLineChange(index, { unit: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <label className="text-xs font-medium text-slate-600">
                        Est. cost
                        <input
                          type="number"
                          min={0}
                          value={item.estimatedCost}
                          onChange={(event) => handleIngredientLineChange(index, { estimatedCost: Math.max(0, Number(event.target.value)) })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        Calories
                        <input
                          type="number"
                          min={0}
                          value={item.calories}
                          onChange={(event) => handleIngredientLineChange(index, { calories: Math.max(0, Number(event.target.value)) })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        Protein
                        <input
                          type="number"
                          min={0}
                          value={item.protein}
                          onChange={(event) => handleIngredientLineChange(index, { protein: Math.max(0, Number(event.target.value)) })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        Carbs
                        <input
                          type="number"
                          min={0}
                          value={item.carbs}
                          onChange={(event) => handleIngredientLineChange(index, { carbs: Math.max(0, Number(event.target.value)) })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600">
                        Fat
                        <input
                          type="number"
                          min={0}
                          value={item.fat}
                          onChange={(event) => handleIngredientLineChange(index, { fat: Math.max(0, Number(event.target.value)) })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => removeIngredientLine(index)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : activeRecipeId ? 'Update recipe' : 'Create recipe'}</Button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Recipe library</h2>
            {loading ? <p className="mt-3 text-sm text-slate-500">Loading recipes…</p> : null}

            {!loading && recipes.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No recipes yet. Create your first optimization-ready recipe above.</p>
            ) : null}

            <div className="mt-4 space-y-3">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{recipe.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {recipe.servings} servings · {recipe.cookingTimeMinutes ?? 0} min · ${recipe.estimatedCost.toFixed(2)}
                      </p>
                      <p className="mt-2 text-xs text-slate-600">
                        {recipe.nutrition.totalCalories.toFixed(0)} kcal · {recipe.nutrition.totalProtein.toFixed(0)}g protein · {recipe.ingredients.length} ingredients
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" onClick={() => toggleFavorite(recipe.id, !recipe.isFavorite)}>
                        {recipe.isFavorite ? 'Unfavorite' : 'Favorite'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => handleEditRecipe(recipe)}>Edit</Button>
                      <Button type="button" variant="ghost" onClick={() => deleteRecipe(recipe.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="planner" className="scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Real world nutrition</h2>
                <p className="mt-1 text-sm text-slate-500">Track restaurant meals and automatically re-optimize home cooking and grocery plans.</p>
              </div>
            </div>

            {restaurantMealError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{restaurantMealError}</p> : null}

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Add restaurant meal</p>

                <form onSubmit={handleRestaurantMealSubmit} className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      Restaurant
                      <input
                        value={restaurantMealDraft.restaurantName}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, restaurantName: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        required
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Meal name
                      <input
                        value={restaurantMealDraft.mealName}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, mealName: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        required
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Meal date
                      <input
                        type="date"
                        value={restaurantMealDraft.mealDate}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, mealDate: event.target.value }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Meal slot
                      <select
                        value={restaurantMealDraft.mealSlot}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, mealSlot: event.target.value as RestaurantMealSlot }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        {restaurantMealSlots.map((slot) => (
                          <option key={slot.value} value={slot.value}>{slot.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Calories
                      <input
                        type="number"
                        min={0}
                        value={restaurantMealDraft.calories}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, calories: Math.max(0, Number(event.target.value)) }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Estimated price
                      <input
                        type="number"
                        min={0}
                        value={restaurantMealDraft.estimatedPrice}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, estimatedPrice: Math.max(0, Number(event.target.value)) }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Protein
                      <input
                        type="number"
                        min={0}
                        value={restaurantMealDraft.protein}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, protein: Math.max(0, Number(event.target.value)) }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Carbs
                      <input
                        type="number"
                        min={0}
                        value={restaurantMealDraft.carbs}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, carbs: Math.max(0, Number(event.target.value)) }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>

                    <label className="text-sm font-medium text-slate-700">
                      Fat
                      <input
                        type="number"
                        min={0}
                        value={restaurantMealDraft.fat}
                        onChange={(event) => setRestaurantMealDraft((prev) => ({ ...prev, fat: Math.max(0, Number(event.target.value)) }))}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    {activeRestaurantMealId ? (
                      <Button type="button" variant="ghost" onClick={resetRestaurantMealForm}>New restaurant meal</Button>
                    ) : null}
                    <Button type="submit" disabled={restaurantMealSaving}>{restaurantMealSaving ? 'Saving…' : activeRestaurantMealId ? 'Update restaurant meal' : 'Add restaurant meal'}</Button>
                  </div>
                </form>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Import menu meal</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <select
                      value={selectedRestaurantProvider}
                      onChange={(event) => setSelectedRestaurantProvider(event.target.value as RestaurantProviderKey)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      {restaurantProviders.map((provider) => (
                        <option key={provider.value} value={provider.value}>{provider.label}</option>
                      ))}
                    </select>
                    <input
                      value={menuSearchQuery}
                      onChange={(event) => setMenuSearchQuery(event.target.value)}
                      placeholder="Search meals"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    />
                    <Button type="button" variant="ghost" onClick={handleSearchMenuMeals}>Find menu meals</Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {importedMenuMeals.map((meal, index) => (
                      <div key={`${meal.mealName}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{meal.mealName}</p>
                          <p className="text-xs text-slate-500">{meal.restaurantName} · {meal.calories} kcal · ${meal.estimatedPrice.toFixed(2)}</p>
                        </div>
                        <Button type="button" variant="ghost" onClick={() => applyImportedMenuMeal(meal)}>Use</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Eating out planner</p>
                <label className="mt-3 block text-sm font-medium text-slate-700">
                  Week start
                  <input
                    type="date"
                    value={selectedWeekStart}
                    onChange={(event) => setSelectedWeekStart(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>

                <div className="mt-3 space-y-2">
                  {getWeekDates(selectedWeekStart).map((dateIso) => (
                    <div key={dateIso} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{dateIso}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {restaurantMealSlots.map((slot) => (
                          <label key={`${dateIso}-${slot.value}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={getEatingOutSlotState(dateIso, slot.value)}
                              onChange={(event) => void handleToggleEatingOutSlot(dateIso, slot.value, event.target.checked)}
                              className="h-3.5 w-3.5"
                            />
                            <span>{slot.label} out</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {dailyReoptimization ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Daily re-optimization</p>
                    <p className="mt-1 text-sm text-slate-700">Remaining: {dailyReoptimization.remaining.calories.toFixed(0)} kcal · {dailyReoptimization.remaining.protein.toFixed(0)}g protein · {dailyReoptimization.remaining.carbs.toFixed(0)}g carbs · {dailyReoptimization.remaining.fat.toFixed(0)}g fat</p>
                    <div className="mt-2 space-y-1">
                      {dailyReoptimization.remainingRecipeRecommendations.map((item) => (
                        <p key={item.recipe.id} className="text-xs text-slate-600">Suggested next meal: {item.recipe.title}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 space-y-2">
                  {restaurantMeals.slice(0, 6).map((meal) => (
                    <div key={meal.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{meal.mealName}</p>
                          <p className="text-xs text-slate-500">{meal.restaurantName} · {meal.mealDate} · {meal.mealSlot} · ${meal.estimatedPrice.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setActiveRestaurantMealId(meal.id)
                              setRestaurantMealDraft({
                                restaurantName: meal.restaurantName,
                                mealName: meal.mealName,
                                calories: meal.calories,
                                protein: meal.protein,
                                carbs: meal.carbs,
                                fat: meal.fat,
                                servingSize: meal.servingSize,
                                estimatedPrice: meal.estimatedPrice,
                                confidenceScore: meal.confidenceScore,
                                source: meal.source,
                                entryMode: meal.entryMode,
                                mealDate: meal.mealDate,
                                mealSlot: meal.mealSlot,
                                externalRef: meal.externalRef,
                              })
                            }}
                          >
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => void handleDeleteRestaurantMeal(meal.id)}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div id="shopping" className="scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Grocery optimization engine</h2>
                <p className="mt-1 text-sm text-slate-500">Generate the optimal weekly shopping strategy from your meal plan and recipe library.</p>
              </div>
              <Button type="button" onClick={handleGenerateGroceryPlan} disabled={groceryLoading}>
                {groceryLoading ? 'Optimizing…' : 'Generate shopping plan'}
              </Button>
            </div>

            {groceryError ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{groceryError}</p> : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Optimization goal
                <select
                  value={groceryGoal}
                  onChange={(event) => setGroceryGoal(event.target.value as GroceryOptimizationGoal)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  {groceryOptimizationGoals.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              {groceryGoal === 'single_store_only' ? (
                <label className="text-sm font-medium text-slate-700">
                  Single store
                  <select
                    value={singleStoreKey}
                    onChange={(event) => setSingleStoreKey(event.target.value as StoreKey)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    {groceryStores.map((store) => (
                      <option key={store.key} value={store.key}>{store.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700">Allowed stores</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {groceryStores.map((store) => {
                      const selected = allowedStoreKeys.includes(store.key)
                      return (
                        <button
                          key={store.key}
                          type="button"
                          onClick={() => toggleAllowedStore(store.key)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                        >
                          {store.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Weekly meal plan input</h3>
              <div className="mt-3 space-y-2">
                {recipes.map((recipe) => {
                  const selected = selectedRecipeIds.includes(recipe.id)
                  return (
                    <div key={recipe.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRecipeForWeeklyPlan(recipe.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span>{recipe.title}</span>
                      </label>

                      <label className="text-sm text-slate-600">
                        Planned servings
                        <input
                          type="number"
                          min={1}
                          value={plannedServingsByRecipeId[recipe.id] ?? recipe.servings}
                          onChange={(event) =>
                            setPlannedServingsByRecipeId((prev) => ({
                              ...prev,
                              [recipe.id]: Math.max(1, Number(event.target.value)),
                            }))
                          }
                          className="ml-3 w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  )
                })}

                {recipes.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Create recipes first, then generate an optimized shopping plan.</p>
                ) : null}
              </div>
            </div>

            {groceryResult ? (
              <div className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Stores</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{groceryResult.summary.storesToVisit}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Estimated total</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">${groceryResult.summary.totalExpectedCost.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Expected savings</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-700">${groceryResult.summary.expectedSavings.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Nutrition score</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{groceryResult.summary.expectedNutritionScore.toFixed(1)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {groceryResult.plansByStore.map((storePlan) => {
                    const itemsByCategory = storePlan.items.reduce<Record<string, typeof storePlan.items>>((acc, item) => {
                      const categoryKey = item.category || 'General'
                      acc[categoryKey] = [...(acc[categoryKey] ?? []), item]
                      return acc
                    }, {})

                    return (
                      <div key={storePlan.store.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-900">{storePlan.store.name}</h4>
                          <p className="text-sm font-medium text-slate-700">Subtotal ${storePlan.totalCost.toFixed(2)}</p>
                        </div>

                        <div className="mt-3 space-y-3">
                          {Object.entries(itemsByCategory).map(([category, items]) => (
                            <div key={`${storePlan.store.key}-${category}`}>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{category}</p>
                              <div className="mt-2 space-y-1">
                                {items.map((item) => (
                                  <p key={item.requirementKey} className="text-sm text-slate-700">
                                    {item.productName} ({item.brand}) x{item.packageCount} · ${item.estimatedTotalPrice.toFixed(2)} · need {item.requiredQuantity.toFixed(2)} {item.requiredUnit}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Printable shopping list</h4>
                    <Button type="button" variant="ghost" onClick={() => window.print()}>Print</Button>
                  </div>
                  <textarea
                    readOnly
                    value={groceryResult.printableShoppingList}
                    className="h-44 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Weekly insights dashboard</h4>
                    <Button type="button" onClick={handleGenerateAiRecommendations}>Generate AI recommendations</Button>
                  </div>

                  {aiResult ? (
                    <>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Weekly cost</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">${aiResult.weeklyInsights.estimatedWeeklyGroceryCost.toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Nutrition score</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{aiResult.weeklyInsights.nutritionScore.toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Waste score</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{aiResult.weeklyInsights.foodWasteScore.toFixed(1)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Pantry utilization</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{aiResult.weeklyInsights.pantryUtilization.toFixed(1)}%</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Money saved</p>
                          <p className="mt-1 text-sm font-semibold text-emerald-700">${aiResult.weeklyInsights.moneySaved.toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Weekly optimization</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{aiResult.weeklyInsights.weeklyOptimizationScore.toFixed(1)}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {aiRecommendations.map((recommendation) => (
                          <div key={recommendation.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <p className="text-sm font-semibold text-slate-900">{recommendation.title}</p>
                            <p className="mt-1 text-xs text-slate-600">{recommendation.detail}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-emerald-700">Impact {recommendation.impactScore.toFixed(0)}</p>
                          </div>
                        ))}
                      </div>

                    </>
                  ) : (
                    <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Generate AI recommendations to view weekly insights and personalized meal guidance.</p>
                  )}

                  {weeklyRealWorldMetrics ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Real world weekly dashboard</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Home cooked</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{weeklyRealWorldMetrics.homeCookedRatio.toFixed(1)}%</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Restaurant meals</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{weeklyRealWorldMetrics.restaurantRatio.toFixed(1)}%</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Spent eating out</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">${weeklyRealWorldMetrics.moneySpentEatingOut.toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Nutrition impact</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{weeklyRealWorldMetrics.nutritionImpactScore.toFixed(1)}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        Optimization adjustments: reduce grocery spend by about ${weeklyRealWorldMetrics.optimizationAdjustments.groceryReduction.toFixed(2)} ({weeklyRealWorldMetrics.optimizationAdjustments.shoppingReductionPercent.toFixed(1)}%).
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <div id="profile" className="scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">User optimization profile</h2>
            <p className="mt-2 text-sm text-slate-500">Personalize recommendations for budget, goals, diet, and convenience.</p>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
              {profileError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{profileError}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Budget ($/week)
                  <input
                    type="number"
                    min={0}
                    value={profileDraft.budget}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, budget: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Family size
                  <input
                    type="number"
                    min={1}
                    value={profileDraft.familySize}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, familySize: Math.max(1, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Health priority (0-100)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={profileDraft.healthPriority}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, healthPriority: Math.min(100, Math.max(0, Number(event.target.value))) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Taste priority (0-100)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={profileDraft.tastePriority}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, tastePriority: Math.min(100, Math.max(0, Number(event.target.value))) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Convenience priority (0-100)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={profileDraft.conveniencePriority}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, conveniencePriority: Math.min(100, Math.max(0, Number(event.target.value))) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Cooking skill (0-100)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={profileDraft.cookingSkill}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, cookingSkill: Math.min(100, Math.max(0, Number(event.target.value))) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Cooking time available (minutes)
                  <input
                    type="number"
                    min={0}
                    value={profileDraft.cookingTimeAvailable}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, cookingTimeAvailable: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Dietary style
                  <select
                    value={profileDraft.dietaryStyle}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, dietaryStyle: event.target.value as DietaryStyle }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    {dietaryStyleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Fitness goal
                  <select
                    value={profileDraft.fitnessGoal}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, fitnessGoal: event.target.value as FitnessGoal }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    {fitnessGoalOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Favorite cuisines (comma-separated)
                <input
                  value={profileDraft.favoriteCuisines.join(', ')}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({
                      ...prev,
                      favoriteCuisines: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Disliked foods (comma-separated)
                <input
                  value={profileDraft.dislikedFoods.join(', ')}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({
                      ...prev,
                      dislikedFoods: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Allergies (comma-separated)
                <input
                  value={profileDraft.allergies.join(', ')}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({
                      ...prev,
                      allergies: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>

              <div className="flex justify-end">
                <Button type="submit" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save profile'}</Button>
              </div>
            </form>
          </div>

          <div id="pantry" className="scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Pantry inventory</h2>
            <p className="mt-2 text-sm text-slate-500">Track ingredients at home to reduce shopping and food waste.</p>

            <form onSubmit={handlePantrySubmit} className="mt-4 space-y-3">
              {pantryError ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{pantryError}</p> : null}

              <label className="block text-sm font-medium text-slate-700">
                Ingredient
                <input
                  value={pantryDraft.ingredientName}
                  onChange={(event) => setPantryDraft((prev) => ({ ...prev, ingredientName: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Quantity
                  <input
                    type="number"
                    min={0}
                    value={pantryDraft.quantity}
                    onChange={(event) => setPantryDraft((prev) => ({ ...prev, quantity: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Unit
                  <input
                    value={pantryDraft.unit}
                    onChange={(event) => setPantryDraft((prev) => ({ ...prev, unit: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Category
                  <input
                    value={pantryDraft.category}
                    onChange={(event) => setPantryDraft((prev) => ({ ...prev, category: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Expiration date
                  <input
                    type="date"
                    value={pantryDraft.expirationDate ?? ''}
                    onChange={(event) => setPantryDraft((prev) => ({ ...prev, expirationDate: event.target.value || null }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {activePantryId ? (
                  <Button type="button" variant="ghost" onClick={resetPantryForm}>New pantry item</Button>
                ) : null}
                <Button type="submit" disabled={pantrySaving}>{pantrySaving ? 'Saving…' : activePantryId ? 'Update pantry item' : 'Add pantry item'}</Button>
              </div>
            </form>

            <div className="mt-4 space-y-2">
              {pantryItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.ingredientName}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} {item.unit} · {item.category}
                        {item.expirationDate ? ` · expires ${item.expirationDate}` : ''}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setActivePantryId(item.id)
                          setPantryDraft({
                            ingredientId: item.ingredientId,
                            ingredientName: item.ingredientName,
                            category: item.category,
                            quantity: item.quantity,
                            unit: item.unit,
                            expirationDate: item.expirationDate,
                          })
                        }}
                      >
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => handleDeletePantryItem(item.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}

              {pantryItems.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No pantry items yet.</p>
              ) : null}
            </div>
          </div>

          <div id="ingredients" className="scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Ingredient catalog</h2>
            <p className="mt-2 text-sm text-slate-500">Reusable ingredients for nutrition, grocery, and optimization engines.</p>

            <form onSubmit={handleIngredientSubmit} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Name
                <input
                  value={ingredientDraft.canonicalName}
                  onChange={(event) => setIngredientDraft((prev) => ({ ...prev, canonicalName: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Category
                  <input
                    value={ingredientDraft.category}
                    onChange={(event) => setIngredientDraft((prev) => ({ ...prev, category: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Default unit
                  <input
                    value={ingredientDraft.defaultUnit}
                    onChange={(event) => setIngredientDraft((prev) => ({ ...prev, defaultUnit: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Package size
                  <input
                    type="number"
                    min={0}
                    value={ingredientDraft.commonPackageSize}
                    onChange={(event) => setIngredientDraft((prev) => ({ ...prev, commonPackageSize: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Price / unit
                  <input
                    type="number"
                    min={0}
                    value={ingredientDraft.estimatedPricePerUnit}
                    onChange={(event) => setIngredientDraft((prev) => ({ ...prev, estimatedPricePerUnit: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="text-sm font-medium text-slate-700">
                  Calories
                  <input
                    type="number"
                    min={0}
                    value={ingredientDraft.caloriesPerUnit}
                    onChange={(event) => setIngredientDraft((prev) => ({ ...prev, caloriesPerUnit: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Protein
                  <input
                    type="number"
                    min={0}
                    value={ingredientDraft.proteinPerUnit}
                    onChange={(event) => setIngredientDraft((prev) => ({ ...prev, proteinPerUnit: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Carbs
                  <input
                    type="number"
                    min={0}
                    value={ingredientDraft.carbsPerUnit}
                    onChange={(event) => setIngredientDraft((prev) => ({ ...prev, carbsPerUnit: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Fat
                  <input
                    type="number"
                    min={0}
                    value={ingredientDraft.fatPerUnit}
                    onChange={(event) => setIngredientDraft((prev) => ({ ...prev, fatPerUnit: Math.max(0, Number(event.target.value)) }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Aliases (comma-separated)
                <input
                  value={ingredientDraft.aliases.join(', ')}
                  onChange={(event) =>
                    setIngredientDraft((prev) => ({
                      ...prev,
                      aliases: event.target.value
                        .split(',')
                        .map((value) => value.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2">
                {activeIngredientId ? (
                  <Button type="button" variant="ghost" onClick={resetIngredientForm}>New ingredient</Button>
                ) : null}
                <Button type="submit" disabled={ingredientSubmitting}>{ingredientSubmitting ? 'Saving…' : activeIngredientId ? 'Update ingredient' : 'Add ingredient'}</Button>
              </div>
            </form>

            <div className="mt-4 space-y-2">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ingredient.canonicalName}</p>
                      <p className="text-xs text-slate-500">
                        {ingredient.category} · {ingredient.caloriesPerUnit} kcal/{ingredient.defaultUnit} · ${ingredient.estimatedPricePerUnit.toFixed(2)}/{ingredient.defaultUnit}
                      </p>
                    </div>

                    {ingredient.createdBy ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setActiveIngredientId(ingredient.id)
                            setIngredientDraft({
                              canonicalName: ingredient.canonicalName,
                              aliases: ingredient.aliases,
                              category: ingredient.category,
                              defaultUnit: ingredient.defaultUnit,
                              commonPackageSize: ingredient.commonPackageSize,
                              estimatedPricePerUnit: ingredient.estimatedPricePerUnit,
                              currency: ingredient.currency,
                              caloriesPerUnit: ingredient.caloriesPerUnit,
                              proteinPerUnit: ingredient.proteinPerUnit,
                              carbsPerUnit: ingredient.carbsPerUnit,
                              fatPerUnit: ingredient.fatPerUnit,
                              metadata: ingredient.metadata,
                            })
                          }}
                        >
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => deleteIngredient(ingredient.id)}>Delete</Button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">Catalog</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="optimization" className="scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Optimization preview</h2>
            <p className="mt-2 text-sm text-slate-500">Preview ranking architecture for multi-objective recipe optimization.</p>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Goal
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value as OptimizationGoal)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                {optimizationGoals.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className="mt-4 space-y-2">
              {optimizationPreview.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Create recipes to see optimization ranking.</p>
              ) : (
                optimizationPreview.map((item) => (
                  <div key={item.recipe.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{item.recipe.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Score {item.score.total.toFixed(1)} · Cost {item.score.costScore.toFixed(0)} · Health {item.score.healthScore.toFixed(0)} · Speed {item.score.speedScore.toFixed(0)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function RecipesPage() {
  return (
    <DashboardLayout>
      <RecipeProvider>
        <RecipesWorkspace />
      </RecipeProvider>
    </DashboardLayout>
  )
}
