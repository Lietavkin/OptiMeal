import { useContext } from 'react'
import { NutritionContext } from '../contexts/NutritionContext'

export default function useNutrition() {
  const ctx = useContext(NutritionContext)
  if (!ctx) throw new Error('useNutrition must be used within NutritionProvider')
  return ctx
}
