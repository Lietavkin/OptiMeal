import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/DashboardLayout'
import Button from '../components/Button'
import useAuth from '../hooks/useAuth'
import { getIngredientCatalogForUser } from '../services/ingredientsService'
import {
  bulkUpdateStoreInventoryPrices,
  createStoreInventoryItemForUser,
  deleteStoreInventoryItem,
  getGroceryStores,
  getStoreInventoryCategories,
  getStoreInventoryForAdmin,
  updateStoreInventoryItem,
} from '../services/storeInventoryService'
import { commitProductImport, previewProductImport } from '../services/storeInventoryImportService'
import type {
  ImportFormat,
  IngredientCatalogItem,
  ProductImportPreview,
  StoreInventoryItem,
  StoreInventoryUpsertInput,
  StoreKey,
} from '../types'

type PriceBulkMode = 'set' | 'increase_percent' | 'decrease_percent'

const defaultDraft: StoreInventoryUpsertInput = {
  storeKey: 'lidl',
  ingredientId: null,
  name: '',
  brand: '',
  category: 'General',
  packageSize: 1,
  packageUnit: 'g',
  nutrition: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  },
  estimatedPrice: 0,
  currency: 'USD',
  availability: true,
}

function parseImportFormat(filename: string): ImportFormat | null {
  const lower = filename.trim().toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.json')) return 'json'
  return null
}

function mapItemToDraft(item: StoreInventoryItem): StoreInventoryUpsertInput {
  return {
    id: item.id,
    storeKey: item.store.key,
    ingredientId: item.ingredientId,
    name: item.name,
    brand: item.brand,
    category: item.category,
    packageSize: item.packageSize,
    packageUnit: item.packageUnit,
    nutrition: item.nutrition,
    estimatedPrice: item.estimatedPrice,
    currency: item.currency,
    availability: item.availability,
  }
}

function ProductStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export default function AdminProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<StoreInventoryItem[]>([])
  const [stores, setStores] = useState<Array<{ key: StoreKey; name: string }>>([])
  const [categories, setCategories] = useState<string[]>([])
  const [ingredients, setIngredients] = useState<IngredientCatalogItem[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState<StoreKey | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all')
  const [onlyAvailable, setOnlyAvailable] = useState(true)

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<StoreInventoryUpsertInput>({ ...defaultDraft })
  const [saving, setSaving] = useState(false)

  const [priceMode, setPriceMode] = useState<PriceBulkMode>('increase_percent')
  const [priceValue, setPriceValue] = useState(5)
  const [bulkLoading, setBulkLoading] = useState(false)

  const [importPreview, setImportPreview] = useState<ProductImportPreview | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  async function loadData() {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const [inventory, storeList, categoryList, ingredientList] = await Promise.all([
        getStoreInventoryForAdmin({
          search,
          storeKey: storeFilter,
          category: categoryFilter,
          onlyAvailable,
        }),
        getGroceryStores(),
        getStoreInventoryCategories(),
        getIngredientCatalogForUser(user.id),
      ])

      setProducts(inventory)
      setStores(storeList)
      setCategories(categoryList)
      setIngredients(ingredientList)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load product manager data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [user, search, storeFilter, categoryFilter, onlyAvailable])

  const totalProducts = products.length
  const unavailableProducts = products.filter((item) => !item.availability).length
  const avgPrice = useMemo(() => {
    if (products.length === 0) return 0
    return products.reduce((sum, item) => sum + item.estimatedPrice, 0) / products.length
  }, [products])

  const selectedCount = selectedIds.length

  function toggleSelection(productId: string) {
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  function beginCreate() {
    setEditingId('new')
    setDraft({ ...defaultDraft })
  }

  function beginEdit(item: StoreInventoryItem) {
    setEditingId(item.id)
    setDraft(mapItemToDraft(item))
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft({ ...defaultDraft })
  }

  async function handleSaveDraft() {
    if (!user) return

    setSaving(true)
    setError('')

    try {
      if (editingId === 'new') {
        await createStoreInventoryItemForUser(user.id, draft)
      } else if (editingId) {
        await updateStoreInventoryItem(editingId, draft)
      }

      cancelEdit()
      await loadData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save product.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(productId: string) {
    setError('')
    try {
      await deleteStoreInventoryItem(productId)
      setSelectedIds((prev) => prev.filter((id) => id !== productId))
      await loadData()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete product.')
    }
  }

  async function handleBulkPriceUpdate() {
    setBulkLoading(true)
    setError('')

    try {
      await bulkUpdateStoreInventoryPrices({
        itemIds: selectedIds,
        mode: priceMode,
        value: priceValue,
      })

      setSelectedIds([])
      await loadData()
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : 'Unable to apply bulk price update.')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleImportFile(file: File) {
    if (!user) return

    const format = parseImportFormat(file.name)
    if (!format) {
      setError('Import supports only CSV and JSON files.')
      return
    }

    setImportLoading(true)
    setImportMessage('')
    setError('')

    try {
      const content = await file.text()
      const preview = await previewProductImport({
        content,
        format,
        ingredients,
      })
      setImportPreview(preview)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to parse import file.')
    } finally {
      setImportLoading(false)
    }
  }

  async function handleCommitImport() {
    if (!user || !importPreview) return

    setImportLoading(true)
    setImportMessage('')
    setError('')

    try {
      const summary = await commitProductImport({
        userId: user.id,
        preview: importPreview,
      })

      setImportMessage(`Import complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.skipped} skipped.`)
      setImportPreview(null)
      await loadData()
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : 'Import failed and was rolled back.')
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 px-5 py-6 text-white shadow-xl shadow-slate-900/20 sm:px-8 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Product Manager</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-200">
            Manage real grocery catalog products used by optimization. Import CSV/JSON with preview, detect duplicates,
            and safely rollback on failure.
          </p>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        ) : null}

        {importMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">{importMessage}</p>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProductStat label="Products" value={totalProducts} />
          <ProductStat label="Unavailable" value={unavailableProducts} />
          <ProductStat label="Average price" value={`$${avgPrice.toFixed(2)}`} />
          <ProductStat label="Selected" value={selectedCount} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm font-medium text-slate-700 lg:col-span-2">
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by product or brand"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Store
              <select
                value={storeFilter}
                onChange={(event) => setStoreFilter(event.target.value as StoreKey | 'all')}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="all">All stores</option>
                {stores.map((store) => (
                  <option key={store.key} value={store.key}>{store.name}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Category
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(event) => setOnlyAvailable(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Available only
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={beginCreate}>Add product</Button>
            <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              {importLoading ? 'Preparing import...' : 'Import CSV/JSON'}
              <input
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleImportFile(file)
                  }
                  event.target.value = ''
                }}
              />
            </label>
          </div>
        </section>

        {importPreview ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Import preview</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Valid rows: {importPreview.validCount} | Duplicates: {importPreview.duplicateCount} | Issues: {importPreview.issues.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setImportPreview(null)}>Discard</Button>
                <Button onClick={handleCommitImport} disabled={importLoading}>Commit import</Button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Store</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Match</th>
                    <th className="px-3 py-2">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.map((row) => (
                    <tr key={row.rowNumber} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 text-slate-500">{row.rowNumber}</td>
                      <td className="px-3 py-2">{row.storeKey}</td>
                      <td className="px-3 py-2">{row.brand} {row.name}</td>
                      <td className="px-3 py-2">${row.estimatedPrice.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <p>{row.ingredientMatch.canonicalName ?? 'No match'}</p>
                        <p className="text-xs text-slate-500">
                          {row.ingredientMatch.strategy} • {row.ingredientMatch.confidence}%
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        {row.validationIssues.length === 0 && !row.duplicate ? (
                          <span className="text-emerald-700">Ready</span>
                        ) : (
                          <div className="space-y-1">
                            {row.validationIssues.map((issue, index) => (
                              <p
                                key={`${row.rowNumber}-${issue.field}-${index}`}
                                className={issue.severity === 'error' ? 'text-rose-700' : 'text-amber-700'}
                              >
                                {issue.field}: {issue.message}
                              </p>
                            ))}
                            {row.duplicate ? (
                              <p className={row.duplicate.existingProductId ? 'text-amber-700' : 'text-rose-700'}>
                                {row.duplicate.existingProductId
                                  ? 'Updates existing product'
                                  : `Duplicate of row ${row.duplicate.duplicateOfRow}`}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {editingId ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900">{editingId === 'new' ? 'Add product' : 'Edit product'}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium text-slate-700">
                Store
                <select
                  value={draft.storeKey}
                  onChange={(event) => setDraft((prev) => ({ ...prev, storeKey: event.target.value as StoreKey }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  {stores.map((store) => (
                    <option key={store.key} value={store.key}>{store.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Category
                <input
                  value={draft.category}
                  onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Brand
                <input
                  value={draft.brand}
                  onChange={(event) => setDraft((prev) => ({ ...prev, brand: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Name
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Ingredient override
                <select
                  value={draft.ingredientId ?? ''}
                  onChange={(event) => setDraft((prev) => ({ ...prev, ingredientId: event.target.value || null }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="">Auto match</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>{ingredient.canonicalName}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Package size
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={draft.packageSize}
                  onChange={(event) => setDraft((prev) => ({ ...prev, packageSize: Number(event.target.value) }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Package unit
                <input
                  value={draft.packageUnit}
                  onChange={(event) => setDraft((prev) => ({ ...prev, packageUnit: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Price
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.estimatedPrice}
                  onChange={(event) => setDraft((prev) => ({ ...prev, estimatedPrice: Number(event.target.value) }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Currency
                <input
                  value={draft.currency}
                  onChange={(event) => setDraft((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </label>

              {(['calories', 'protein', 'carbs', 'fat'] as const).map((macro) => (
                <label key={macro} className="text-sm font-medium text-slate-700">
                  {macro[0].toUpperCase() + macro.slice(1)}
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.nutrition[macro]}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        nutrition: {
                          ...prev.nutrition,
                          [macro]: Number(event.target.value),
                        },
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  />
                </label>
              ))}

              <label className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.availability}
                  onChange={(event) => setDraft((prev) => ({ ...prev, availability: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Available
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={handleSaveDraft} disabled={saving}>{saving ? 'Saving...' : 'Save product'}</Button>
              <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm font-medium text-slate-700">
              Bulk update prices
              <div className="mt-2 flex gap-2">
                <select
                  value={priceMode}
                  onChange={(event) => setPriceMode(event.target.value as PriceBulkMode)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="set">Set price</option>
                  <option value="increase_percent">Increase by %</option>
                  <option value="decrease_percent">Decrease by %</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceValue}
                  onChange={(event) => setPriceValue(Number(event.target.value))}
                  className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                />
              </div>
            </label>
            <Button onClick={handleBulkPriceUpdate} disabled={selectedIds.length === 0 || bulkLoading}>
              {bulkLoading ? 'Updating...' : `Apply to ${selectedIds.length} selected`}
            </Button>
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading products...
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={products.length > 0 && selectedIds.length === products.length}
                        onChange={(event) => setSelectedIds(event.target.checked ? products.map((item) => item.id) : [])}
                      />
                    </th>
                    <th className="px-3 py-2">Store</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Package</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Availability</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelection(item.id)}
                        />
                      </td>
                      <td className="px-3 py-2">{item.store.name}</td>
                      <td className="px-3 py-2">{item.brand} {item.name}</td>
                      <td className="px-3 py-2">{item.category}</td>
                      <td className="px-3 py-2">{item.packageSize} {item.packageUnit}</td>
                      <td className="px-3 py-2">${item.estimatedPrice.toFixed(2)}</td>
                      <td className="px-3 py-2">{item.availability ? 'Available' : 'Unavailable'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => beginEdit(item)}>Edit</Button>
                          <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => void handleDelete(item.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </motion.div>
    </DashboardLayout>
  )
}
