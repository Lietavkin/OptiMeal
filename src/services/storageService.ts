import { supabase } from './supabaseClient'
import { createMealPhoto } from './mealPhotosService'

export async function uploadMealPhoto(userId: string, mealId: string, file: File) {
  const path = `${userId}/meals/${mealId}/${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage.from('meals').upload(path, file, { upsert: false })
  if (error) throw error
  const urlResult = supabase.storage.from('meals').getPublicUrl(data.path)
  // getPublicUrl returns { data: { publicUrl } } synchronously
  // @ts-ignore
  const publicUrl = urlResult?.data?.publicUrl || urlResult?.data?.publicURL || ''

  await createMealPhoto(mealId, userId, data.path, publicUrl)

  return { publicUrl, storagePath: data.path }
}

export async function removeMealPhoto(path: string) {
  const { error } = await supabase.storage.from('meals').remove([path])
  if (error) throw error
  return true
}
