import type { ShoppingCategory, ShoppingListItem } from '../types'
import { CATEGORY_LABELS, SHOPPING_CATEGORIES } from '../services/shoppingService'

type ShoppingCategoryListProps = {
  groupedItems: Record<ShoppingCategory, ShoppingListItem[]>
  onTogglePurchased: (item: ShoppingListItem) => void
  onNotesChange: (item: ShoppingListItem, notes: string) => void
}

export default function ShoppingCategoryList({ groupedItems, onTogglePurchased, onNotesChange }: ShoppingCategoryListProps) {
  const categoriesWithItems = SHOPPING_CATEGORIES.filter((category) => groupedItems[category].length > 0)

  if (categoriesWithItems.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No shopping items yet. Generate a list from your weekly meal plan.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {categoriesWithItems.map((category) => (
        <section key={category} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{CATEGORY_LABELS[category]}</h2>
          <div className="mt-4 space-y-3">
            {groupedItems[category].map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 transition ${
                  item.purchased ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.purchased}
                    onChange={() => onTogglePurchased(item)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className={`font-semibold ${item.purchased ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {item.name}
                      </p>
                      <p className="text-sm font-medium text-slate-700">${item.estimatedPrice.toFixed(2)}</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.quantity} {item.unit}
                    </p>
                    <input
                      type="text"
                      value={item.notes ?? ''}
                      onChange={(e) => onNotesChange(item, e.target.value)}
                      placeholder="Add notes (brand, substitute, etc.)"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
