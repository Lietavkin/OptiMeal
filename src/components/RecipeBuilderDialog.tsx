import { useEffect, useState } from 'react'
import type { Recipe, RecipeInput } from '../types'
import { computeRecipeTotals, inferIngredientCategory } from '../services/recipeService'
import Button from './Button'

const emptyIngredient = () => ({
  name: '',
  quantity: 1,
  unit: 'item',
  category: 'other' as const,
  estimatedPrice: 0,
})

function recipeToInput(recipe: Recipe | null): RecipeInput {
  if (!recipe) {
    return {
      name: '',
      instructions: '',
      servings: 2,
      prepTimeMinutes: 30,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      estimatedCost: 0,
      ingredients: [emptyIngredient()],
    }
  }
  return {
    name: recipe.name,
    instructions: recipe.instructions ?? '',
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    estimatedCost: recipe.estimatedCost,
    isFavorite: recipe.isFavorite,
    tags: recipe.tags,
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: ingredient.category,
          estimatedPrice: ingredient.estimatedPrice,
        }))
      : [emptyIngredient()],
  }
}

export default function RecipeBuilderDialog({
  recipe,
  open,
  onClose,
  onSave,
  saving,
}: {
  recipe: Recipe | null
  open: boolean
  onClose: () => void
  onSave: (input: RecipeInput) => Promise<void>
  saving: boolean
}) {
  const [form, setForm] = useState<RecipeInput>(recipeToInput(recipe))
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(recipeToInput(recipe))
  }, [recipe])

  function updateIngredient(index: number, patch: Partial<RecipeInput['ingredients'][number]>) {
    setForm((current) => {
      const ingredients = current.ingredients.map((item, i) => {
        if (i !== index) return item
        const next = { ...item, ...patch }
        if (patch.name !== undefined) next.category = inferIngredientCategory(patch.name)
        return next
      })
      const estimatedCost = computeRecipeTotals(ingredients).estimatedCost
      return { ...current, ingredients, estimatedCost }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('Recipe name is required.')
      return
    }
    try {
      await onSave(form)
      onClose()
    } catch {
      setError('Could not save recipe. Please try again.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">{recipe ? 'Edit recipe' : 'Create recipe'}</h3>
            <p className="text-sm text-slate-500">Add ingredients, instructions, and nutrition details.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 transition hover:text-slate-900">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <div>
            <label className="block text-sm font-medium text-slate-700">Recipe name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Servings</label>
              <input
                type="number"
                min={1}
                value={form.servings}
                onChange={(e) => setForm((current) => ({ ...current, servings: Number(e.target.value) }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Prep time (minutes)</label>
              <input
                type="number"
                min={0}
                value={form.prepTimeMinutes}
                onChange={(e) => setForm((current) => ({ ...current, prepTimeMinutes: Number(e.target.value) }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { key: 'calories', label: 'Calories' },
              { key: 'protein', label: 'Protein' },
              { key: 'carbs', label: 'Carbs' },
              { key: 'fat', label: 'Fat' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-slate-600">{field.label}</label>
                <input
                  type="number"
                  min={0}
                  value={form[field.key as keyof RecipeInput] as number}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, [field.key]: Number(e.target.value) }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Cooking instructions</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm((current) => ({ ...current, instructions: e.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Ingredients</p>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, ingredients: [...current.ingredients, emptyIngredient()] }))}
                className="text-sm font-medium text-emerald-700"
              >
                + Add ingredient
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {form.ingredients.map((ingredient, index) => (
                <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-5">
                  <input
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, { name: e.target.value })}
                    placeholder="Ingredient"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    min={0}
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, { quantity: Number(e.target.value) })}
                    placeholder="Qty"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                    placeholder="Unit"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={ingredient.estimatedPrice}
                    onChange={(e) => updateIngredient(index, { estimatedPrice: Number(e.target.value) })}
                    placeholder="Price"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-500">Estimated cost: ${form.estimatedCost.toFixed(2)}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : recipe ? 'Save recipe' : 'Create recipe'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
