import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type {
  GroceryProvider,
  NormalizedProviderProduct,
  ProviderSyncHistoryItem,
  ProviderSyncResult,
  ProviderSyncState,
  StoreKey,
  SyncRunStatus,
} from '../types'
import { getIngredientCatalogForUser } from './ingredientsService'
import { matchProductToIngredient, normalizeUnit } from './ingredientMatchingService'
import { upsertNormalizedProviderProducts } from './storeInventoryService'
import { getSupportedExternalProviders, groceryProviderRegistry } from './providers/groceryProviders'

type ProviderSyncStateRow = {
  provider_key: StoreKey
  status: SyncRunStatus
  last_synced_at: string | null
  cursor: string | null
  products_inserted: number
  products_updated: number
  products_unchanged: number
  error_message: string | null
  updated_at: string
}

type ProviderSyncHistoryRow = {
  id: string
  provider_key: StoreKey
  status: SyncRunStatus
  started_at: string
  finished_at: string | null
  products_inserted: number
  products_updated: number
  products_unchanged: number
  error_message: string | null
}

function stableHash(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16)
}

function normalizeCategory(category: string) {
  const normalized = category.trim()
  if (!normalized) return 'General'
  return normalized
}

function normalizeProduct(product: {
  storeKey: StoreKey
  externalProductId: string
  name: string
  brand: string
  category: string
  packageSize: number
  packageUnit: string
  nutrition: { calories: number; protein: number; carbs: number; fat: number }
  price: number
  currency: string
  availability: boolean
  updatedAt: string
}): NormalizedProviderProduct {
  const packageUnit = normalizeUnit(product.packageUnit)
  const packageSize = Number(product.packageSize)

  const normalized: NormalizedProviderProduct = {
    storeKey: product.storeKey,
    externalProductId: product.externalProductId.trim(),
    name: product.name.trim(),
    brand: product.brand.trim(),
    category: normalizeCategory(product.category),
    packageSize: Number.isFinite(packageSize) && packageSize > 0 ? packageSize : 1,
    packageUnit,
    nutrition: {
      calories: Number(product.nutrition.calories ?? 0),
      protein: Number(product.nutrition.protein ?? 0),
      carbs: Number(product.nutrition.carbs ?? 0),
      fat: Number(product.nutrition.fat ?? 0),
    },
    estimatedPrice: Number(product.price ?? 0),
    currency: (product.currency || 'USD').toUpperCase(),
    availability: Boolean(product.availability),
    updatedAt: product.updatedAt,
    sourceHash: '',
  }

  normalized.sourceHash = stableHash(JSON.stringify(normalized))
  return normalized
}

function mapSyncStateRow(row: ProviderSyncStateRow): ProviderSyncState {
  return {
    providerKey: row.provider_key,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    cursor: row.cursor,
    productsInserted: Number(row.products_inserted ?? 0),
    productsUpdated: Number(row.products_updated ?? 0),
    productsUnchanged: Number(row.products_unchanged ?? 0),
    errorMessage: row.error_message,
    updatedAt: row.updated_at,
  }
}

function mapSyncHistoryRow(row: ProviderSyncHistoryRow): ProviderSyncHistoryItem {
  return {
    id: row.id,
    providerKey: row.provider_key,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    productsInserted: Number(row.products_inserted ?? 0),
    productsUpdated: Number(row.products_updated ?? 0),
    productsUnchanged: Number(row.products_unchanged ?? 0),
    errorMessage: row.error_message,
  }
}

async function getProviderState(providerKey: StoreKey): Promise<ProviderSyncState | null> {
  const { data, error } = await supabase
    .from('provider_sync_state')
    .select('*')
    .eq('provider_key', providerKey)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return mapSyncStateRow(data as ProviderSyncStateRow)
}

async function upsertProviderState(args: {
  providerKey: StoreKey
  status: SyncRunStatus
  cursor: string | null
  inserted: number
  updated: number
  unchanged: number
  errorMessage: string | null
}) {
  const now = new Date().toISOString()

  const payload = {
    provider_key: args.providerKey,
    status: args.status,
    last_synced_at: args.status === 'success' ? now : null,
    cursor: args.cursor,
    products_inserted: args.inserted,
    products_updated: args.updated,
    products_unchanged: args.unchanged,
    error_message: args.errorMessage,
    updated_at: now,
  }

  const { error } = await supabase
    .from('provider_sync_state')
    .upsert(payload, { onConflict: 'provider_key' })

  if (error) throw error
}

async function createHistoryRun(providerKey: StoreKey): Promise<string> {
  const id = uuidv4()
  const payload = {
    id,
    provider_key: providerKey,
    status: 'running',
    started_at: new Date().toISOString(),
    products_inserted: 0,
    products_updated: 0,
    products_unchanged: 0,
  }

  const { error } = await supabase.from('provider_sync_history').insert(payload)
  if (error) throw error

  return id
}

async function finalizeHistoryRun(args: {
  historyId: string
  status: SyncRunStatus
  inserted: number
  updated: number
  unchanged: number
  errorMessage: string | null
}) {
  const payload = {
    status: args.status,
    finished_at: new Date().toISOString(),
    products_inserted: args.inserted,
    products_updated: args.updated,
    products_unchanged: args.unchanged,
    error_message: args.errorMessage,
  }

  const { error } = await supabase
    .from('provider_sync_history')
    .update(payload)
    .eq('id', args.historyId)

  if (error) throw error
}

function resolveProvider(providerKey: StoreKey): GroceryProvider {
  const provider = groceryProviderRegistry[providerKey]
  if (!provider) {
    throw new Error(`No provider registered for ${providerKey}`)
  }
  return provider
}

export async function syncSingleProvider(args: {
  providerKey: StoreKey
  userId: string
}): Promise<ProviderSyncResult> {
  const provider = resolveProvider(args.providerKey)
  const previousState = await getProviderState(args.providerKey)
  const historyId = await createHistoryRun(args.providerKey)

  await upsertProviderState({
    providerKey: args.providerKey,
    status: 'running',
    cursor: previousState?.cursor ?? null,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errorMessage: null,
  })

  try {
    const response = await provider.fetchProducts(previousState?.cursor ?? null)
    const normalized = response.products.map((item) => normalizeProduct(item))

    const ingredients = await getIngredientCatalogForUser(args.userId)
    const ingredientIdByExternalId: Record<string, string | null> = {}

    normalized.forEach((product) => {
      const match = matchProductToIngredient({
        product: {
          name: product.name,
          brand: product.brand,
          packageUnit: product.packageUnit,
          packageSize: product.packageSize,
          nutrition: product.nutrition,
        },
        ingredients,
      })

      ingredientIdByExternalId[`${product.storeKey}:${product.externalProductId}`] = match.ingredientId
    })

    const summary = await upsertNormalizedProviderProducts({
      products: normalized,
      ingredientIdByExternalId,
    })

    await upsertProviderState({
      providerKey: args.providerKey,
      status: 'success',
      cursor: response.nextCursor,
      inserted: summary.inserted,
      updated: summary.updated,
      unchanged: summary.unchanged,
      errorMessage: null,
    })

    await finalizeHistoryRun({
      historyId,
      status: 'success',
      inserted: summary.inserted,
      updated: summary.updated,
      unchanged: summary.unchanged,
      errorMessage: null,
    })

    return {
      providerKey: args.providerKey,
      status: 'success',
      inserted: summary.inserted,
      updated: summary.updated,
      unchanged: summary.unchanged,
      cursor: response.nextCursor,
      errorMessage: null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Sync failed.'

    await upsertProviderState({
      providerKey: args.providerKey,
      status: 'error',
      cursor: previousState?.cursor ?? null,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errorMessage,
    })

    await finalizeHistoryRun({
      historyId,
      status: 'error',
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errorMessage,
    })

    return {
      providerKey: args.providerKey,
      status: 'error',
      inserted: 0,
      updated: 0,
      unchanged: 0,
      cursor: previousState?.cursor ?? null,
      errorMessage,
    }
  }
}

export async function syncAllProviders(userId: string): Promise<ProviderSyncResult[]> {
  const providers = getSupportedExternalProviders()
  const results: ProviderSyncResult[] = []

  for (const provider of providers) {
    const result = await syncSingleProvider({
      providerKey: provider.key,
      userId,
    })
    results.push(result)
  }

  return results
}

export async function getProviderSyncStates(): Promise<ProviderSyncState[]> {
  const { data, error } = await supabase
    .from('provider_sync_state')
    .select('*')
    .order('provider_key', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => mapSyncStateRow(row as ProviderSyncStateRow))
}

export async function getProviderSyncHistory(limit = 40): Promise<ProviderSyncHistoryItem[]> {
  const { data, error } = await supabase
    .from('provider_sync_history')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map((row) => mapSyncHistoryRow(row as ProviderSyncHistoryRow))
}

export async function getProviderProductCounts(): Promise<Record<StoreKey, number>> {
  const providers = getSupportedExternalProviders().map((provider) => provider.key)
  const { data, error } = await supabase
    .from('store_inventory')
    .select('store_key')
    .in('store_key', providers)

  if (error) throw error

  return (data ?? []).reduce<Record<StoreKey, number>>((acc, row) => {
    const key = row.store_key as StoreKey
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {
    lidl: 0,
    kaufland: 0,
    tesco: 0,
    billa: 0,
    carrefour: 0,
    aldi: 0,
  })
}

export function getConnectedProviders() {
  return getSupportedExternalProviders()
}
