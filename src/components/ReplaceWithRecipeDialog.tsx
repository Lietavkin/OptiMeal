import type { Recipe } from '../types'
import Button from './Button'

export default function ReplaceWithRecipeDialog({
  recipes,
  open,
  onClose,
  onSelect,
}: {
  recipes: Recipe[]
  open: boolean
  onClose: () => void
  onSelect: (recipe: Recipe) => Promise<void>
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Replace with recipe</h3>
            <p className="text-sm text-slate-500">Choose a saved recipe for this meal slot.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 transition hover:text-slate-900">
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {recipes.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No saved recipes yet. Create recipes first.</p>
          ) : (
            recipes.map((recipe) => (
              <div key={recipe.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{recipe.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {recipe.calories} kcal · {recipe.protein}g P · ${recipe.estimatedCost.toFixed(2)}
                  </p>
                </div>
                <Button type="button" variant="ghost" className="px-4 py-2 text-xs" onClick={() => void onSelect(recipe).then(onClose)}>
                  Use recipe
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
