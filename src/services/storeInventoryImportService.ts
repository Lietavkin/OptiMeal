import { v4 as uuidv4 } from 'uuid'
import type {
  ImportFormat,
  IngredientCatalogItem,
  ProductDuplicateInfo,
  ProductImportCandidate,
  ProductImportCommitSummary,
  ProductImportIssue,
  ProductImportPreview,
  ProductImportPreviewRow,
  StoreInventoryItem,
  StoreInventoryUpsertInput,
  StoreKey,
} from '../types'
import {
  createInventoryKey,
  createStoreInventoryItemForUser,
  deleteStoreInventoryItem,
  findExistingInventoryByKeys,
  updateStoreInventoryItem,
} from './storeInventoryService'
import { matchProductToIngredient } from './ingredientMatchingService'

const requiredColumns = [
  'storeKey',
  'name',
  'brand',
  'category',
  'packageSize',
  'packageUnit',
  'estimatedPrice',
]

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const header = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    return header.reduce<Record<string, string>>((acc, key, index) => {
      acc[key] = cells[index] ?? ''
      return acc
    }, {})
  })
}

function parseJson(content: string): Record<string, unknown>[] {
  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed)) throw new Error('JSON import must be an array of products.')
  return parsed as Record<string, unknown>[]
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function asBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 'yes', '1'].includes(normalized)) return true
    if (['false', 'no', '0'].includes(normalized)) return false
  }
  return fallback
}

function parseStoreKey(value: unknown): StoreKey | null {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'lidl' || normalized === 'kaufland' || normalized === 'tesco' || normalized === 'billa' || normalized === 'carrefour' || normalized === 'aldi') {
    return normalized
  }
  return null
}

function toCandidate(raw: Record<string, unknown>, rowNumber: number): ProductImportCandidate {
  const storeKey = parseStoreKey(raw.storeKey)

  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    rowNumber,
    rawSource: raw,
    storeKey: (storeKey ?? 'lidl') as StoreKey,
    ingredientId: typeof raw.ingredientId === 'string' ? raw.ingredientId : null,
    name: String(raw.name ?? '').trim(),
    brand: String(raw.brand ?? '').trim(),
    category: String(raw.category ?? 'General').trim(),
    packageSize: asNumber(raw.packageSize, 0),
    packageUnit: String(raw.packageUnit ?? '').trim(),
    nutrition: {
      calories: asNumber(raw.calories, 0),
      protein: asNumber(raw.protein, 0),
      carbs: asNumber(raw.carbs, 0),
      fat: asNumber(raw.fat, 0),
    },
    estimatedPrice: asNumber(raw.estimatedPrice, 0),
    currency: String(raw.currency ?? 'USD').trim() || 'USD',
    availability: asBoolean(raw.availability, true),
  }
}

function validateCandidate(candidate: ProductImportCandidate): ProductImportIssue[] {
  const issues: ProductImportIssue[] = []

  if (!parseStoreKey(candidate.storeKey)) {
    issues.push({ rowNumber: candidate.rowNumber, field: 'storeKey', message: 'Invalid store key.', severity: 'error' })
  }

  if (!candidate.name) issues.push({ rowNumber: candidate.rowNumber, field: 'name', message: 'Name is required.', severity: 'error' })
  if (!candidate.brand) issues.push({ rowNumber: candidate.rowNumber, field: 'brand', message: 'Brand is required.', severity: 'error' })
  if (!candidate.category) issues.push({ rowNumber: candidate.rowNumber, field: 'category', message: 'Category is required.', severity: 'error' })
  if (candidate.packageSize <= 0) issues.push({ rowNumber: candidate.rowNumber, field: 'packageSize', message: 'Package size must be greater than 0.', severity: 'error' })
  if (!candidate.packageUnit) issues.push({ rowNumber: candidate.rowNumber, field: 'packageUnit', message: 'Package unit is required.', severity: 'error' })
  if (candidate.estimatedPrice < 0) issues.push({ rowNumber: candidate.rowNumber, field: 'estimatedPrice', message: 'Price cannot be negative.', severity: 'error' })

  return issues
}

function parseContentByFormat(content: string, format: ImportFormat): Record<string, unknown>[] {
  if (format === 'csv') {
    const rows = parseCsv(content)
    return rows as Record<string, unknown>[]
  }

  return parseJson(content)
}

function detectDuplicates(
  candidates: ProductImportCandidate[],
  existingByKey: Map<string, StoreInventoryItem>,
): Map<number, ProductDuplicateInfo> {
  const result = new Map<number, ProductDuplicateInfo>()
  const localSeen = new Map<string, number>()

  candidates.forEach((candidate) => {
    const key = createInventoryKey({
      storeKey: candidate.storeKey,
      name: candidate.name,
      brand: candidate.brand,
      packageSize: candidate.packageSize,
      packageUnit: candidate.packageUnit,
    })

    const localFirst = localSeen.get(key)
    if (localFirst != null) {
      result.set(candidate.rowNumber, {
        rowNumber: candidate.rowNumber,
        duplicateOfRow: localFirst,
        key,
      })
      return
    }

    localSeen.set(key, candidate.rowNumber)
    const existing = existingByKey.get(key)
    if (existing) {
      result.set(candidate.rowNumber, {
        rowNumber: candidate.rowNumber,
        existingProductId: existing.id,
        key,
      })
    }
  })

  return result
}

function ensureRequiredColumns(firstRow: Record<string, unknown> | undefined): ProductImportIssue[] {
  if (!firstRow) {
    return [{ rowNumber: 0, field: 'file', message: 'No rows detected in import file.', severity: 'error' }]
  }

  return requiredColumns
    .filter((column) => !(column in firstRow))
    .map((column) => ({
      rowNumber: 0,
      field: column,
      message: `Missing required column: ${column}`,
      severity: 'error' as const,
    }))
}

export async function previewProductImport(args: {
  content: string
  format: ImportFormat
  ingredients: IngredientCatalogItem[]
}): Promise<ProductImportPreview> {
  const rawRows = parseContentByFormat(args.content, args.format)
  const firstRowIssues = ensureRequiredColumns(rawRows[0])

  const candidates = rawRows.map((row, index) => toCandidate(row, index + 2))
  const existingByKey = await findExistingInventoryByKeys(candidates)
  const duplicateMap = detectDuplicates(candidates, existingByKey)

  const rows: ProductImportPreviewRow[] = candidates.map((candidate) => {
    const validationIssues = validateCandidate(candidate)

    const ingredientMatch = matchProductToIngredient({
      product: candidate,
      ingredients: args.ingredients,
      manualIngredientId: candidate.ingredientId ?? null,
    })

    if (!ingredientMatch.ingredientId) {
      validationIssues.push({
        rowNumber: candidate.rowNumber,
        field: 'ingredientId',
        message: 'No strong ingredient match found. You can import and override manually later.',
        severity: 'warning',
      })
    }

    return {
      ...candidate,
      ingredientMatch,
      duplicate: duplicateMap.get(candidate.rowNumber) ?? null,
      validationIssues,
    }
  })

  const duplicateIssues: ProductImportIssue[] = rows
    .filter((row) => row.duplicate != null)
    .map((row) => ({
      rowNumber: row.rowNumber,
      field: 'duplicate',
      message: row.duplicate?.existingProductId
        ? 'Duplicate detected against existing product. Import will update it.'
        : `Duplicate row detected in file (first at row ${row.duplicate?.duplicateOfRow}).`,
      severity: row.duplicate?.existingProductId ? 'warning' : 'error',
    }))

  const allIssues = [...firstRowIssues, ...rows.flatMap((row) => row.validationIssues), ...duplicateIssues]
  const validCount = rows.filter((row) => row.validationIssues.every((issue) => issue.severity !== 'error') && !row.duplicate?.duplicateOfRow).length

  return {
    format: args.format,
    rows,
    issues: allIssues,
    duplicateCount: rows.filter((row) => row.duplicate != null).length,
    validCount,
  }
}

function toDbBackup(item: StoreInventoryItem): StoreInventoryUpsertInput {
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

export async function commitProductImport(args: {
  userId: string
  preview: ProductImportPreview
}): Promise<ProductImportCommitSummary> {
  const rowsToApply = args.preview.rows.filter(
    (row) => row.validationIssues.every((issue) => issue.severity !== 'error') && !row.duplicate?.duplicateOfRow,
  )

  const existingByKey = await findExistingInventoryByKeys(rowsToApply)

  const insertedIds: string[] = []
  const backups = new Map<string, StoreInventoryUpsertInput>()

  let inserted = 0
  let updated = 0

  try {
    for (const row of rowsToApply) {
      const key = createInventoryKey({
        storeKey: row.storeKey,
        name: row.name,
        brand: row.brand,
        packageSize: row.packageSize,
        packageUnit: row.packageUnit,
      })

      const existing = existingByKey.get(key)
      const payload: StoreInventoryUpsertInput = {
        ...row,
        id: undefined,
        ingredientId: row.ingredientId ?? row.ingredientMatch.ingredientId,
      }

      if (existing) {
        backups.set(existing.id, toDbBackup(existing))
        await updateStoreInventoryItem(existing.id, payload)
        updated += 1
      } else {
        const created = await createStoreInventoryItemForUser(args.userId, {
          ...payload,
          id: uuidv4(),
        })
        insertedIds.push(created.id)
        inserted += 1
      }
    }

    return {
      inserted,
      updated,
      skipped: args.preview.rows.length - rowsToApply.length,
    }
  } catch (error) {
    for (const itemId of insertedIds) {
      try {
        await deleteStoreInventoryItem(itemId)
      } catch {
        // Best effort rollback for inserted rows.
      }
    }

    for (const [itemId, backup] of backups.entries()) {
      try {
        await updateStoreInventoryItem(itemId, backup)
      } catch {
        // Best effort rollback for updated rows.
      }
    }

    throw error
  }
}
