import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type { IngredientCatalogInput, IngredientCatalogItem } from '../types'

function mapIngredientRow(row: any): IngredientCatalogItem {
  return {
    id: row.id,
    createdBy: row.created_by ?? null,
    canonicalName: row.canonical_name,
    aliases: row.aliases ?? [],
    category: row.category,
    defaultUnit: row.default_unit,
    commonPackageSize: Number(row.common_package_size ?? 1),
    estimatedPricePerUnit: Number(row.estimated_price_per_unit ?? 0),
    currency: row.currency,
    caloriesPerUnit: Number(row.calories_per_unit ?? 0),
    proteinPerUnit: Number(row.protein_per_unit ?? 0),
    carbsPerUnit: Number(row.carbs_per_unit ?? 0),
    fatPerUnit: Number(row.fat_per_unit ?? 0),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDbPayload(input: IngredientCatalogInput) {
  return {
    canonical_name: input.canonicalName.trim(),
    aliases: input.aliases,
    category: input.category,
    default_unit: input.defaultUnit,
    common_package_size: input.commonPackageSize,
    estimated_price_per_unit: input.estimatedPricePerUnit,
    currency: input.currency,
    calories_per_unit: input.caloriesPerUnit,
    protein_per_unit: input.proteinPerUnit,
    carbs_per_unit: input.carbsPerUnit,
    fat_per_unit: input.fatPerUnit,
    metadata: input.metadata ?? {},
  }
}

export async function getIngredientCatalogForUser(userId: string, search?: string): Promise<IngredientCatalogItem[]> {
  let query = supabase
    .from('ingredient_catalog')
    .select('*')
    .or(`created_by.is.null,created_by.eq.${userId}`)
    .order('canonical_name', { ascending: true })

  if (search?.trim()) {
    query = query.ilike('canonical_name', `%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapIngredientRow)
}

export async function createCustomIngredient(userId: string, input: IngredientCatalogInput): Promise<IngredientCatalogItem> {
  const payload = {
    id: uuidv4(),
    created_by: userId,
    ...toDbPayload(input),
  }

  const { data, error } = await supabase.from('ingredient_catalog').insert(payload).select().single()
  if (error) throw error
  return mapIngredientRow(data)
}

export async function updateCustomIngredient(userId: string, ingredientId: string, input: IngredientCatalogInput): Promise<IngredientCatalogItem> {
  const payload = {
    ...toDbPayload(input),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ingredient_catalog')
    .update(payload)
    .eq('id', ingredientId)
    .eq('created_by', userId)
    .select()
    .single()

  if (error) throw error
  return mapIngredientRow(data)
}

export async function deleteCustomIngredient(userId: string, ingredientId: string): Promise<void> {
  const { error } = await supabase.from('ingredient_catalog').delete().eq('id', ingredientId).eq('created_by', userId)
  if (error) throw error
}
