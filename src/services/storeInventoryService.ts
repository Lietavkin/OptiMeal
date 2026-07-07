import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type {
  GroceryStore,
  StoreInventoryItem,
  StoreInventoryProvider,
  StoreInventoryQuery,
  StoreKey,
} from '../types'

const supportedStores: GroceryStore[] = [
  { key: 'lidl', name: 'Lidl' },
  { key: 'kaufland', name: 'Kaufland' },
  { key: 'tesco', name: 'Tesco' },
  { key: 'carrefour', name: 'Carrefour' },
  { key: 'aldi', name: 'Aldi' },
]

type StoreInventoryRow = {
  id: string
  store_key: StoreKey
  name: string
  brand: string
  category: string
  package_size: number
  package_unit: string
  calories: number
  protein: number
  carbs: number
  fat: number
  estimated_price: number
  currency: string
  availability: boolean
  last_updated: string
  ingredient_id: string | null
}

function normalizeProductName(name: string) {
  return name.trim().toLowerCase()
}

function mapStoreInventoryRow(row: StoreInventoryRow): StoreInventoryItem {
  const storeName = supportedStores.find((store) => store.key === row.store_key)?.name ?? row.store_key
  return {
    id: row.id,
    store: {
      key: row.store_key,
      name: storeName,
    },
    name: row.name,
    brand: row.brand,
    category: row.category,
    packageSize: Number(row.package_size ?? 0),
    packageUnit: row.package_unit,
    nutrition: {
      calories: Number(row.calories ?? 0),
      protein: Number(row.protein ?? 0),
      carbs: Number(row.carbs ?? 0),
      fat: Number(row.fat ?? 0),
    },
    estimatedPrice: Number(row.estimated_price ?? 0),
    currency: row.currency,
    availability: Boolean(row.availability),
    lastUpdated: row.last_updated,
    ingredientId: row.ingredient_id,
  }
}

const placeholderInventoryByStore: Record<StoreKey, Array<Omit<StoreInventoryItem, 'id' | 'lastUpdated'>>> = {
  lidl: [
    {
      store: { key: 'lidl', name: 'Lidl' },
      name: 'Chicken Breast Fillets',
      brand: 'Lidl Freshona',
      category: 'Meat & Fish',
      packageSize: 1,
      packageUnit: 'kg',
      nutrition: { calories: 1200, protein: 230, carbs: 0, fat: 26 },
      estimatedPrice: 8.49,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'lidl', name: 'Lidl' },
      name: 'Brown Rice',
      brand: 'Golden Sun',
      category: 'Pantry',
      packageSize: 1,
      packageUnit: 'kg',
      nutrition: { calories: 3600, protein: 75, carbs: 760, fat: 28 },
      estimatedPrice: 2.59,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'lidl', name: 'Lidl' },
      name: 'Greek Yogurt 2%',
      brand: 'Milbona',
      category: 'Dairy',
      packageSize: 500,
      packageUnit: 'g',
      nutrition: { calories: 365, protein: 50, carbs: 20, fat: 10 },
      estimatedPrice: 2.1,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'lidl', name: 'Lidl' },
      name: 'Baby Spinach',
      brand: 'Freshona',
      category: 'Produce',
      packageSize: 200,
      packageUnit: 'g',
      nutrition: { calories: 46, protein: 6, carbs: 7, fat: 1 },
      estimatedPrice: 1.79,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
  ],
  kaufland: [
    {
      store: { key: 'kaufland', name: 'Kaufland' },
      name: 'Chicken Breast Family Pack',
      brand: 'K-Purland',
      category: 'Meat & Fish',
      packageSize: 1.2,
      packageUnit: 'kg',
      nutrition: { calories: 1440, protein: 276, carbs: 0, fat: 31 },
      estimatedPrice: 9.39,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'kaufland', name: 'Kaufland' },
      name: 'Whole Wheat Pasta',
      brand: 'K-Classic',
      category: 'Pantry',
      packageSize: 500,
      packageUnit: 'g',
      nutrition: { calories: 1750, protein: 64, carbs: 360, fat: 9 },
      estimatedPrice: 1.55,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'kaufland', name: 'Kaufland' },
      name: 'Cottage Cheese',
      brand: 'Milkana',
      category: 'Dairy',
      packageSize: 400,
      packageUnit: 'g',
      nutrition: { calories: 360, protein: 48, carbs: 12, fat: 14 },
      estimatedPrice: 2.39,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'kaufland', name: 'Kaufland' },
      name: 'Broccoli Florets',
      brand: 'Fresh Corner',
      category: 'Frozen',
      packageSize: 450,
      packageUnit: 'g',
      nutrition: { calories: 150, protein: 12, carbs: 26, fat: 2 },
      estimatedPrice: 2.19,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
  ],
  tesco: [
    {
      store: { key: 'tesco', name: 'Tesco' },
      name: 'Eggs Free Range',
      brand: 'Tesco Finest',
      category: 'Dairy',
      packageSize: 12,
      packageUnit: 'unit',
      nutrition: { calories: 840, protein: 72, carbs: 4, fat: 60 },
      estimatedPrice: 3.49,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'tesco', name: 'Tesco' },
      name: 'Rolled Oats',
      brand: 'Tesco',
      category: 'Pantry',
      packageSize: 1,
      packageUnit: 'kg',
      nutrition: { calories: 3800, protein: 130, carbs: 650, fat: 70 },
      estimatedPrice: 2.95,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'tesco', name: 'Tesco' },
      name: 'Olive Oil',
      brand: 'Tesco',
      category: 'Pantry',
      packageSize: 500,
      packageUnit: 'ml',
      nutrition: { calories: 4050, protein: 0, carbs: 0, fat: 450 },
      estimatedPrice: 5.19,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'tesco', name: 'Tesco' },
      name: 'Cherry Tomatoes',
      brand: 'Tesco',
      category: 'Produce',
      packageSize: 300,
      packageUnit: 'g',
      nutrition: { calories: 54, protein: 3, carbs: 12, fat: 1 },
      estimatedPrice: 1.69,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
  ],
  carrefour: [
    {
      store: { key: 'carrefour', name: 'Carrefour' },
      name: 'Salmon Fillet',
      brand: 'Carrefour Bio',
      category: 'Meat & Fish',
      packageSize: 400,
      packageUnit: 'g',
      nutrition: { calories: 820, protein: 80, carbs: 0, fat: 52 },
      estimatedPrice: 9.99,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'carrefour', name: 'Carrefour' },
      name: 'Quinoa Tri-Color',
      brand: 'Carrefour',
      category: 'Pantry',
      packageSize: 500,
      packageUnit: 'g',
      nutrition: { calories: 1840, protein: 70, carbs: 320, fat: 28 },
      estimatedPrice: 4.29,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'carrefour', name: 'Carrefour' },
      name: 'Avocado',
      brand: 'Carrefour Market',
      category: 'Produce',
      packageSize: 2,
      packageUnit: 'unit',
      nutrition: { calories: 480, protein: 6, carbs: 26, fat: 44 },
      estimatedPrice: 3.29,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'carrefour', name: 'Carrefour' },
      name: 'Skyr Natural',
      brand: 'Carrefour',
      category: 'Dairy',
      packageSize: 450,
      packageUnit: 'g',
      nutrition: { calories: 300, protein: 49, carbs: 20, fat: 1 },
      estimatedPrice: 2.89,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
  ],
  aldi: [
    {
      store: { key: 'aldi', name: 'Aldi' },
      name: 'Lean Ground Turkey',
      brand: 'Aldi Butcher',
      category: 'Meat & Fish',
      packageSize: 500,
      packageUnit: 'g',
      nutrition: { calories: 670, protein: 95, carbs: 0, fat: 30 },
      estimatedPrice: 4.49,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'aldi', name: 'Aldi' },
      name: 'Sweet Potatoes',
      brand: 'Farm Fresh',
      category: 'Produce',
      packageSize: 1,
      packageUnit: 'kg',
      nutrition: { calories: 860, protein: 16, carbs: 200, fat: 1 },
      estimatedPrice: 2.29,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'aldi', name: 'Aldi' },
      name: 'Low Fat Milk',
      brand: 'Milsani',
      category: 'Dairy',
      packageSize: 1,
      packageUnit: 'l',
      nutrition: { calories: 460, protein: 34, carbs: 48, fat: 15 },
      estimatedPrice: 1.69,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
    {
      store: { key: 'aldi', name: 'Aldi' },
      name: 'Kidney Beans',
      brand: 'Cucina',
      category: 'Pantry',
      packageSize: 400,
      packageUnit: 'g',
      nutrition: { calories: 360, protein: 24, carbs: 60, fat: 2 },
      estimatedPrice: 0.99,
      currency: 'USD',
      availability: true,
      ingredientId: null,
    },
  ],
}

function ingredientNameMatch(productName: string, requestedName: string) {
  const product = normalizeProductName(productName)
  const requested = normalizeProductName(requestedName)
  return product.includes(requested) || requested.includes(product)
}

export async function getGroceryStores(): Promise<GroceryStore[]> {
  const { data, error } = await supabase.from('grocery_stores').select('key, display_name').order('display_name', { ascending: true })
  if (error) throw error

  if (!data || data.length === 0) {
    return supportedStores
  }

  return data.map((row) => ({
    key: row.key as StoreKey,
    name: row.display_name,
  }))
}

export async function seedPlaceholderStoreInventory(): Promise<void> {
  const { count, error: countError } = await supabase
    .from('store_inventory')
    .select('id', { count: 'exact', head: true })

  if (countError) throw countError
  if ((count ?? 0) > 0) return

  const rows = Object.values(placeholderInventoryByStore)
    .flat()
    .map((item) => ({
      id: uuidv4(),
      store_key: item.store.key,
      ingredient_id: item.ingredientId,
      name: item.name,
      brand: item.brand,
      category: item.category,
      package_size: item.packageSize,
      package_unit: item.packageUnit,
      calories: item.nutrition.calories,
      protein: item.nutrition.protein,
      carbs: item.nutrition.carbs,
      fat: item.nutrition.fat,
      estimated_price: item.estimatedPrice,
      currency: item.currency,
      availability: item.availability,
      last_updated: new Date().toISOString(),
    }))

  const { error } = await supabase.from('store_inventory').insert(rows)
  if (error) throw error
}

export async function getStoreInventory(query: StoreInventoryQuery = {}): Promise<StoreInventoryItem[]> {
  let dbQuery = supabase.from('store_inventory').select('*').order('estimated_price', { ascending: true })

  if (query.onlyAvailable !== false) {
    dbQuery = dbQuery.eq('availability', true)
  }

  if (query.storeKeys && query.storeKeys.length > 0) {
    dbQuery = dbQuery.in('store_key', query.storeKeys)
  }

  if (query.categories && query.categories.length > 0) {
    dbQuery = dbQuery.in('category', query.categories)
  }

  const { data, error } = await dbQuery
  if (error) throw error

  const inventory = (data ?? []).map((row) => mapStoreInventoryRow(row as StoreInventoryRow))

  if (!query.ingredientNames || query.ingredientNames.length === 0) {
    return inventory
  }

  return inventory.filter((item) =>
    query.ingredientNames?.some((name) => ingredientNameMatch(item.name, name)),
  )
}

export function createSupabaseStoreInventoryProvider(): StoreInventoryProvider {
  return {
    getInventory: (query) => getStoreInventory(query),
  }
}

export { supportedStores }
