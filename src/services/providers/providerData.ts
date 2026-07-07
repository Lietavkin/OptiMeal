import type { ExternalProviderProduct, StoreKey } from '../../types'

type ProviderSeed = Omit<ExternalProviderProduct, 'storeKey'>

const baseTimestamp = '2026-07-01T10:00:00.000Z'

const lidlSeed: ProviderSeed[] = [
  {
    externalProductId: 'lidl-1001',
    name: 'Chicken Breast Fillets',
    brand: 'Lidl Freshona',
    category: 'Meat & Fish',
    packageSize: 1,
    packageUnit: 'kg',
    nutrition: { calories: 1200, protein: 230, carbs: 0, fat: 26 },
    price: 8.49,
    currency: 'USD',
    availability: true,
    updatedAt: baseTimestamp,
  },
  {
    externalProductId: 'lidl-1002',
    name: 'Greek Yogurt 2%',
    brand: 'Milbona',
    category: 'Dairy',
    packageSize: 500,
    packageUnit: 'g',
    nutrition: { calories: 365, protein: 50, carbs: 20, fat: 10 },
    price: 2.1,
    currency: 'USD',
    availability: true,
    updatedAt: '2026-07-05T09:30:00.000Z',
  },
]

const kauflandSeed: ProviderSeed[] = [
  {
    externalProductId: 'kaufland-2001',
    name: 'Whole Wheat Pasta',
    brand: 'K-Classic',
    category: 'Pantry',
    packageSize: 500,
    packageUnit: 'g',
    nutrition: { calories: 1750, protein: 64, carbs: 360, fat: 9 },
    price: 1.55,
    currency: 'USD',
    availability: true,
    updatedAt: baseTimestamp,
  },
  {
    externalProductId: 'kaufland-2002',
    name: 'Cottage Cheese',
    brand: 'Milkana',
    category: 'Dairy',
    packageSize: 400,
    packageUnit: 'g',
    nutrition: { calories: 360, protein: 48, carbs: 12, fat: 14 },
    price: 2.39,
    currency: 'USD',
    availability: true,
    updatedAt: '2026-07-06T08:15:00.000Z',
  },
]

const carrefourSeed: ProviderSeed[] = [
  {
    externalProductId: 'carrefour-3001',
    name: 'Salmon Fillet',
    brand: 'Carrefour Bio',
    category: 'Meat & Fish',
    packageSize: 400,
    packageUnit: 'g',
    nutrition: { calories: 820, protein: 80, carbs: 0, fat: 52 },
    price: 9.99,
    currency: 'USD',
    availability: true,
    updatedAt: baseTimestamp,
  },
  {
    externalProductId: 'carrefour-3002',
    name: 'Skyr Natural',
    brand: 'Carrefour',
    category: 'Dairy',
    packageSize: 450,
    packageUnit: 'g',
    nutrition: { calories: 300, protein: 49, carbs: 20, fat: 1 },
    price: 2.89,
    currency: 'USD',
    availability: true,
    updatedAt: '2026-07-06T12:10:00.000Z',
  },
]

const billaSeed: ProviderSeed[] = [
  {
    externalProductId: 'billa-4001',
    name: 'Turkey Breast Slices',
    brand: 'Billa Premium',
    category: 'Meat & Fish',
    packageSize: 300,
    packageUnit: 'g',
    nutrition: { calories: 360, protein: 66, carbs: 2, fat: 9 },
    price: 4.79,
    currency: 'USD',
    availability: true,
    updatedAt: baseTimestamp,
  },
  {
    externalProductId: 'billa-4002',
    name: 'Jasmine Rice',
    brand: 'Clever',
    category: 'Pantry',
    packageSize: 1,
    packageUnit: 'kg',
    nutrition: { calories: 3600, protein: 67, carbs: 790, fat: 9 },
    price: 2.99,
    currency: 'USD',
    availability: true,
    updatedAt: '2026-07-07T07:45:00.000Z',
  },
]

const tescoCsv = `externalProductId,name,brand,category,packageSize,packageUnit,calories,protein,carbs,fat,price,currency,availability,updatedAt

tesco-5001,Eggs Free Range,Tesco Finest,Dairy,12,unit,840,72,4,60,3.49,USD,true,2026-07-01T10:00:00.000Z

tesco-5002,Rolled Oats,Tesco,Pantry,1,kg,3800,130,650,70,2.95,USD,true,2026-07-06T14:20:00.000Z`

function parseCsv(content: string): ProviderSeed[] {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const header = lines[0].split(',').map((cell) => cell.trim())

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((cell) => cell.trim())
    const row = header.reduce<Record<string, string>>((acc, key, idx) => {
      acc[key] = cells[idx] ?? ''
      return acc
    }, {})

    return {
      externalProductId: row.externalProductId,
      name: row.name,
      brand: row.brand,
      category: row.category,
      packageSize: Number(row.packageSize),
      packageUnit: row.packageUnit,
      nutrition: {
        calories: Number(row.calories),
        protein: Number(row.protein),
        carbs: Number(row.carbs),
        fat: Number(row.fat),
      },
      price: Number(row.price),
      currency: row.currency || 'USD',
      availability: row.availability === 'true',
      updatedAt: row.updatedAt,
    }
  })
}

export function providerSeedByStore(storeKey: StoreKey): ExternalProviderProduct[] {
  const withStore = (seed: ProviderSeed[]) => seed.map((item) => ({ ...item, storeKey }))

  switch (storeKey) {
    case 'lidl':
      return withStore(lidlSeed)
    case 'kaufland':
      return withStore(kauflandSeed)
    case 'carrefour':
      return withStore(carrefourSeed)
    case 'billa':
      return withStore(billaSeed)
    case 'tesco':
      return withStore(parseCsv(tescoCsv))
    default:
      return []
  }
}
