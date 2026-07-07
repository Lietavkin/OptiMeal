import type { ImportedMenuMeal, RestaurantMenuAdapter, RestaurantProviderKey } from '../types'

const mockMenus: Record<RestaurantProviderKey, ImportedMenuMeal[]> = {
  mcdonalds: [
    {
      restaurantName: "McDonald's",
      mealName: 'Grilled Chicken Wrap',
      calories: 390,
      protein: 28,
      carbs: 38,
      fat: 12,
      servingSize: '1 wrap',
      estimatedPrice: 6.2,
      confidenceScore: 86,
      source: 'mcdonalds_menu_v1',
      externalRef: { itemId: 'mc-wrap-001' },
    },
    {
      restaurantName: "McDonald's",
      mealName: 'Filet-O-Fish',
      calories: 380,
      protein: 16,
      carbs: 39,
      fat: 18,
      servingSize: '1 sandwich',
      estimatedPrice: 5.9,
      confidenceScore: 84,
      source: 'mcdonalds_menu_v1',
      externalRef: { itemId: 'mc-fish-002' },
    },
  ],
  starbucks: [
    {
      restaurantName: 'Starbucks',
      mealName: 'Turkey Bacon Egg White Sandwich',
      calories: 230,
      protein: 17,
      carbs: 28,
      fat: 5,
      servingSize: '1 sandwich',
      estimatedPrice: 5.7,
      confidenceScore: 90,
      source: 'starbucks_menu_v1',
      externalRef: { itemId: 'sb-eggwhite-101' },
    },
    {
      restaurantName: 'Starbucks',
      mealName: 'Protein Box',
      calories: 470,
      protein: 24,
      carbs: 44,
      fat: 22,
      servingSize: '1 box',
      estimatedPrice: 7.95,
      confidenceScore: 82,
      source: 'starbucks_menu_v1',
      externalRef: { itemId: 'sb-proteinbox-102' },
    },
  ],
  subway: [
    {
      restaurantName: 'Subway',
      mealName: 'Rotisserie-Style Chicken 6"',
      calories: 350,
      protein: 25,
      carbs: 46,
      fat: 8,
      servingSize: '6 inch sandwich',
      estimatedPrice: 7.4,
      confidenceScore: 88,
      source: 'subway_menu_v1',
      externalRef: { itemId: 'sw-rotisserie-201' },
    },
    {
      restaurantName: 'Subway',
      mealName: 'Veggie Delite Salad',
      calories: 120,
      protein: 6,
      carbs: 18,
      fat: 3,
      servingSize: '1 salad',
      estimatedPrice: 6.1,
      confidenceScore: 79,
      source: 'subway_menu_v1',
      externalRef: { itemId: 'sw-veggie-salad-202' },
    },
  ],
  local_restaurant: [
    {
      restaurantName: 'Local Bistro',
      mealName: 'Grilled Salmon Bowl',
      calories: 520,
      protein: 34,
      carbs: 42,
      fat: 24,
      servingSize: '1 bowl',
      estimatedPrice: 13.5,
      confidenceScore: 72,
      source: 'local_menu_estimate',
      externalRef: { itemId: 'local-salmon-bowl' },
    },
  ],
  delivery_platform: [
    {
      restaurantName: 'Delivery Kitchen',
      mealName: 'Chicken Teriyaki Rice Box',
      calories: 610,
      protein: 32,
      carbs: 76,
      fat: 18,
      servingSize: '1 box',
      estimatedPrice: 12.75,
      confidenceScore: 70,
      source: 'delivery_menu_aggregate',
      externalRef: { itemId: 'delivery-teriyaki-1' },
    },
  ],
}

function searchMenu(provider: RestaurantProviderKey, query: string): ImportedMenuMeal[] {
  const normalizedQuery = query.trim().toLowerCase()
  const menu = mockMenus[provider] ?? []
  if (!normalizedQuery) return menu

  return menu.filter((meal) => {
    const mealName = meal.mealName.toLowerCase()
    const restaurant = meal.restaurantName.toLowerCase()
    return mealName.includes(normalizedQuery) || restaurant.includes(normalizedQuery)
  })
}

function buildAdapter(provider: RestaurantProviderKey): RestaurantMenuAdapter {
  return {
    provider,
    searchMeals: async (query: string) => searchMenu(provider, query),
  }
}

export const restaurantAdapterRegistry: Record<RestaurantProviderKey, RestaurantMenuAdapter> = {
  mcdonalds: buildAdapter('mcdonalds'),
  starbucks: buildAdapter('starbucks'),
  subway: buildAdapter('subway'),
  local_restaurant: buildAdapter('local_restaurant'),
  delivery_platform: buildAdapter('delivery_platform'),
}

export async function searchRestaurantMenuMeals(provider: RestaurantProviderKey, query: string): Promise<ImportedMenuMeal[]> {
  return restaurantAdapterRegistry[provider].searchMeals(query)
}
