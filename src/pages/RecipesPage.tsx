import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Pencil, Trash2 } from 'lucide-react'
import Button from '../components/Button'
import DashboardLayout from '../components/DashboardLayout'
import MealOptimizationPanel from '../components/MealOptimizationPanel'
import RecipeBuilderDialog from '../components/RecipeBuilderDialog'
import { RecipeProvider } from '../contexts/RecipeContext'
import useRecipes from '../hooks/useRecipes'
import type { Recipe, RecipeInput } from '../types'

function RecipesContent() {
  const {
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
  } = useRecipes()
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleSave(input: RecipeInput) {
    if (editingRecipe) {
      await saveRecipe(editingRecipe.id, input)
    } else {
      await createNewRecipe(input)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-sky-500 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100">Recipe library</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Build and optimize meals</h1>
            <p className="mt-3 max-w-2xl text-sm text-emerald-100/90">
              Create reusable recipes, filter by nutrition, and get mode-based recommendations.
            </p>
          </div>
          <Button type="button" onClick={() => setCreating(true)} className="bg-white text-slate-950 hover:bg-slate-100">
            New recipe
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <aside className="space-y-6">
          <MealOptimizationPanel mode={optimizationMode} onModeChange={setOptimizationMode} />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Search & filters</p>
            <div className="mt-4 space-y-3">
              <input
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="Search recipes"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={filters.favoritesOnly}
                  onChange={(e) => setFilters({ favoritesOnly: e.target.checked })}
                />
                Favorites only
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="Max calories"
                  value={filters.maxCalories ?? ''}
                  onChange={(e) => setFilters({ maxCalories: e.target.value ? Number(e.target.value) : undefined })}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Min protein"
                  value={filters.minProtein ?? ''}
                  onChange={(e) => setFilters({ minProtein: e.target.value ? Number(e.target.value) : undefined })}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max carbs"
                  value={filters.maxCarbs ?? ''}
                  onChange={(e) => setFilters({ maxCarbs: e.target.value ? Number(e.target.value) : undefined })}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max fat"
                  value={filters.maxFat ?? ''}
                  onChange={(e) => setFilters({ maxFat: e.target.value ? Number(e.target.value) : undefined })}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max prep time (min)"
                  value={filters.maxPrepTime ?? ''}
                  onChange={(e) => setFilters({ maxPrepTime: e.target.value ? Number(e.target.value) : undefined })}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {recommendedRecipes.length > 0 ? (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6">
              <p className="text-sm font-semibold text-emerald-800">Recommended for {optimizationMode.replace('_', ' ')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {recommendedRecipes.map((recipe) => (
                  <div key={recipe.id} className="rounded-2xl border border-emerald-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">{recipe.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {recipe.calories} kcal · {recipe.protein}g P · ${recipe.estimatedCost.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {loading ? (
            <p className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading recipes…</p>
          ) : filteredRecipes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-lg font-semibold text-slate-900">No recipes yet</p>
              <p className="mt-2 text-sm text-slate-500">Create your first recipe to use in the planner and shopping list.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredRecipes.map((recipe) => (
                <article key={recipe.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{recipe.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{recipe.prepTimeMinutes} min · {recipe.servings} servings</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(recipe.id, !recipe.isFavorite)}
                      className={recipe.isFavorite ? 'text-rose-500' : 'text-slate-400'}
                    >
                      <Heart className={`h-5 w-5 ${recipe.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                    <span>{recipe.calories} kcal</span>
                    <span>{recipe.protein}g P</span>
                    <span>{recipe.carbs}g C</span>
                    <span>${recipe.estimatedCost.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" className="gap-2 px-4 py-2 text-xs" onClick={() => setEditingRecipe(recipe)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-2 px-4 py-2 text-xs text-rose-700"
                      onClick={() => void removeRecipe(recipe.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecipeBuilderDialog
        recipe={editingRecipe}
        open={creating || Boolean(editingRecipe)}
        onClose={() => {
          setCreating(false)
          setEditingRecipe(null)
        }}
        onSave={handleSave}
        saving={saving}
      />
    </motion.div>
  )
}

export default function RecipesPage() {
  return (
    <DashboardLayout>
      <RecipeProvider>
        <RecipesContent />
      </RecipeProvider>
    </DashboardLayout>
  )
}
