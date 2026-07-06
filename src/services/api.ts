export async function fetchNutritionData(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to load nutrition data')
  }

  return response.json()
}
