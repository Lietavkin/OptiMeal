import type {
  IngredientCatalogItem,
  IngredientMatchResult,
  StoreInventoryNutrition,
  StoreInventoryUpsertInput,
} from '../types'

type UnitConversionFactor = {
  from: string
  to: string
  factor: number
}

const conversionTable: UnitConversionFactor[] = [
  { from: 'kg', to: 'g', factor: 1000 },
  { from: 'g', to: 'kg', factor: 0.001 },
  { from: 'l', to: 'ml', factor: 1000 },
  { from: 'ml', to: 'l', factor: 0.001 },
]

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean)
}

function levenshteinDistance(a: string, b: string) {
  const left = normalizeText(a)
  const right = normalizeText(b)

  const matrix: number[][] = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0))

  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[left.length][right.length]
}

function textSimilarity(a: string, b: string) {
  const left = normalizeText(a)
  const right = normalizeText(b)
  if (!left || !right) return 0
  if (left === right) return 1

  const distance = levenshteinDistance(left, right)
  const maxLen = Math.max(left.length, right.length)
  return Math.max(0, 1 - distance / maxLen)
}

export function normalizeUnit(unit: string) {
  const normalized = normalizeText(unit)
  if (normalized === 'grams' || normalized === 'gram') return 'g'
  if (normalized === 'kilograms' || normalized === 'kilogram') return 'kg'
  if (normalized === 'milliliters' || normalized === 'milliliter') return 'ml'
  if (normalized === 'liters' || normalized === 'liter') return 'l'
  if (normalized === 'pieces' || normalized === 'piece') return 'unit'
  return normalized
}

export function convertUnit(value: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)
  if (from === to) return value

  const factor = conversionTable.find((item) => item.from === from && item.to === to)
  if (!factor) return null

  return value * factor.factor
}

function buildIngredientNames(ingredient: IngredientCatalogItem) {
  return [ingredient.canonicalName, ...ingredient.aliases].map((item) => normalizeText(item)).filter(Boolean)
}

function buildSourceName(product: Pick<StoreInventoryUpsertInput, 'name' | 'brand'>) {
  return normalizeText(`${product.brand} ${product.name}`)
}

export function matchProductToIngredient(args: {
  product: Pick<StoreInventoryUpsertInput, 'name' | 'brand' | 'packageUnit' | 'packageSize'> & {
    nutrition?: StoreInventoryNutrition
  }
  ingredients: IngredientCatalogItem[]
  manualIngredientId?: string | null
}): IngredientMatchResult {
  if (args.manualIngredientId) {
    const manual = args.ingredients.find((item) => item.id === args.manualIngredientId)
    return {
      ingredientId: manual?.id ?? args.manualIngredientId,
      canonicalName: manual?.canonicalName ?? null,
      confidence: 100,
      strategy: 'manual_override',
    }
  }

  const sourceName = buildSourceName(args.product)
  const sourceTokens = new Set(tokenize(sourceName))

  let best: IngredientMatchResult = {
    ingredientId: null,
    canonicalName: null,
    confidence: 0,
    strategy: 'none',
  }

  for (const ingredient of args.ingredients) {
    const candidateNames = buildIngredientNames(ingredient)
    for (const candidate of candidateNames) {
      const similarity = textSimilarity(sourceName, candidate)
      const candidateTokens = tokenize(candidate)
      const overlap = candidateTokens.filter((token) => sourceTokens.has(token)).length
      const tokenCoverage = candidateTokens.length > 0 ? overlap / candidateTokens.length : 0

      const normalizedProductSize = Math.max(0.0001, Number(args.product.packageSize ?? 0))
      const packageRatio = ingredient.commonPackageSize > 0
        ? Math.min(1, Math.min(normalizedProductSize, ingredient.commonPackageSize) / Math.max(normalizedProductSize, ingredient.commonPackageSize))
        : 0.5

      const defaultUnitCompatibility = unitCompatibilityScore(ingredient.defaultUnit, args.product.packageUnit)

      const nutritionDensitySimilarity = args.product.nutrition
        ? (() => {
            const caloriesDiff = Math.abs(ingredient.caloriesPerUnit - args.product.nutrition.calories / normalizedProductSize)
            const proteinDiff = Math.abs(ingredient.proteinPerUnit - args.product.nutrition.protein / normalizedProductSize)
            const carbsDiff = Math.abs(ingredient.carbsPerUnit - args.product.nutrition.carbs / normalizedProductSize)
            const fatDiff = Math.abs(ingredient.fatPerUnit - args.product.nutrition.fat / normalizedProductSize)
            const totalDiff = caloriesDiff * 0.2 + proteinDiff * 0.35 + carbsDiff * 0.2 + fatDiff * 0.25
            return Math.max(0, 1 - totalDiff / 100)
          })()
        : 0.5

      const lexicalScore = Math.max(similarity * 100, tokenCoverage * 100)
      const score =
        lexicalScore * 0.55 +
        packageRatio * 100 * 0.15 +
        defaultUnitCompatibility * 100 * 0.15 +
        nutritionDensitySimilarity * 100 * 0.15

      if (score <= best.confidence) continue

      const strategy: IngredientMatchResult['strategy'] =
        normalizeText(ingredient.canonicalName) === candidate && similarity > 0.95
          ? 'exact'
          : normalizeText(ingredient.canonicalName) !== candidate
            ? 'alias'
            : 'fuzzy'

      best = {
        ingredientId: ingredient.id,
        canonicalName: ingredient.canonicalName,
        confidence: Math.min(100, Math.round(score)),
        strategy,
      }
    }
  }

  if (best.confidence < 62) {
    return {
      ingredientId: null,
      canonicalName: null,
      confidence: best.confidence,
      strategy: 'none',
    }
  }

  return best
}

export function unitCompatibilityScore(ingredientUnit: string, productUnit: string): number {
  const ingredient = normalizeUnit(ingredientUnit)
  const product = normalizeUnit(productUnit)

  if (ingredient === product) return 1
  const converted = convertUnit(1, ingredient, product)
  if (converted != null) return 0.8
  return 0.2
}
