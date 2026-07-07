import type { GroceryProvider, StoreKey } from '../../types'
import { providerSeedByStore } from './providerData'

function createStaticProvider(key: StoreKey, displayName: string): GroceryProvider {
  return {
    key,
    displayName,
    async fetchProducts(cursor) {
      const data = providerSeedByStore(key)
      const filtered = cursor
        ? data.filter((product) => product.updatedAt > cursor)
        : data

      const nextCursor = filtered.length > 0
        ? filtered
            .map((item) => item.updatedAt)
            .sort((a, b) => (a > b ? 1 : -1))
            .at(-1) ?? cursor ?? null
        : cursor ?? null

      return {
        products: filtered,
        nextCursor,
      }
    },
  }
}

export const groceryProviderRegistry: Record<StoreKey, GroceryProvider> = {
  lidl: createStaticProvider('lidl', 'Lidl'),
  kaufland: createStaticProvider('kaufland', 'Kaufland'),
  tesco: createStaticProvider('tesco', 'Tesco'),
  billa: createStaticProvider('billa', 'Billa'),
  carrefour: createStaticProvider('carrefour', 'Carrefour'),
  aldi: createStaticProvider('aldi', 'Aldi'),
}

export function getSupportedExternalProviders(): GroceryProvider[] {
  return [
    groceryProviderRegistry.lidl,
    groceryProviderRegistry.kaufland,
    groceryProviderRegistry.tesco,
    groceryProviderRegistry.billa,
    groceryProviderRegistry.carrefour,
  ]
}
