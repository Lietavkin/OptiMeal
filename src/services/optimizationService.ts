import type {
  OptimizationRecommendation,
  OptimizationRequest,
} from '../types'
import { rankRecipesWithOptimization } from './optimizationEngineService'

export function rankRecipesForGoal(request: OptimizationRequest): OptimizationRecommendation[] {
  return rankRecipesWithOptimization({
    goal: request.goal,
    recipes: request.recipes,
    limit: request.limit ?? 10,
    constraints: {
      budget: request.maxBudgetPerRecipe,
      maxCookingMinutesPerRecipe: request.maxCookingMinutes,
    },
  })
}
