import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabaseClient'
import type {
  AICoachAction,
  AICoachAdviceType,
  AICoachDailyCheckin,
  AICoachDailyCheckinInput,
  AICoachLearningSnapshot,
  AICoachRecommendation,
  AICoachRecommendationInput,
  AICoachRecommendationStatus,
  AthleteDayType,
} from '../types'

type CheckinRow = {
  id: string
  user_id: string
  entry_date: string
  athlete_day_type: AthleteDayType
  hunger: number
  energy: number
  sleep: number
  mood: number
  recovery: number
  stress: number | null
  water_ml: number
  weight_kg: number | null
  created_at: string
  updated_at: string
}

type RecommendationRow = {
  id: string
  user_id: string
  entry_date: string
  advice_type: AICoachAdviceType
  title: string
  message: string
  why_reason: string
  expected_benefit: string
  confidence: number
  status: AICoachRecommendationStatus
  linked_meal_name: string | null
  created_at: string
  updated_at: string
}

type RecommendationStatusAggregateRow = {
  advice_type: AICoachAdviceType
  status: AICoachRecommendationStatus
}

function mapCheckin(row: CheckinRow): AICoachDailyCheckin {
  return {
    id: row.id,
    userId: row.user_id,
    entryDate: row.entry_date,
    athleteDayType: row.athlete_day_type,
    hunger: Number(row.hunger ?? 3),
    energy: Number(row.energy ?? 3),
    sleep: Number(row.sleep ?? 3),
    mood: Number(row.mood ?? 3),
    recovery: Number(row.recovery ?? 3),
    stress: row.stress == null ? null : Number(row.stress),
    waterMl: Number(row.water_ml ?? 0),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRecommendation(row: RecommendationRow): AICoachRecommendation {
  return {
    id: row.id,
    userId: row.user_id,
    entryDate: row.entry_date,
    adviceType: row.advice_type,
    title: row.title,
    message: row.message,
    why: row.why_reason,
    expectedBenefit: row.expected_benefit,
    confidence: Number(row.confidence ?? 0),
    status: row.status,
    linkedMealName: row.linked_meal_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function defaultCheckin(userId: string, entryDate: string): AICoachDailyCheckin {
  const now = new Date().toISOString()
  return {
    id: `${userId}:${entryDate}`,
    userId,
    entryDate,
    athleteDayType: 'training',
    hunger: 3,
    energy: 3,
    sleep: 3,
    mood: 3,
    recovery: 3,
    stress: null,
    waterMl: 0,
    weightKg: null,
    createdAt: now,
    updatedAt: now,
  }
}

function ensureIsoDate(entryDate: string) {
  return entryDate.slice(0, 10)
}

export async function getDailyCheckin(userId: string, entryDate: string): Promise<AICoachDailyCheckin> {
  const day = ensureIsoDate(entryDate)

  const { data, error } = await supabase
    .from('ai_coach_daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', day)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return defaultCheckin(userId, day)

  return mapCheckin(data as CheckinRow)
}

export async function upsertDailyCheckin(userId: string, input: AICoachDailyCheckinInput): Promise<AICoachDailyCheckin> {
  const day = ensureIsoDate(input.entryDate)

  const payload = {
    id: uuidv4(),
    user_id: userId,
    entry_date: day,
    athlete_day_type: input.athleteDayType,
    hunger: Math.min(5, Math.max(1, input.hunger)),
    energy: Math.min(5, Math.max(1, input.energy)),
    sleep: Math.min(5, Math.max(1, input.sleep)),
    mood: Math.min(5, Math.max(1, input.mood)),
    recovery: Math.min(5, Math.max(1, input.recovery)),
    stress: input.stress == null ? null : Math.min(5, Math.max(1, input.stress)),
    water_ml: Math.max(0, input.waterMl),
    weight_kg: input.weightKg,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ai_coach_daily_checkins')
    .upsert(payload, { onConflict: 'user_id,entry_date' })
    .select('*')
    .single()

  if (error) throw error
  return mapCheckin(data as CheckinRow)
}

export async function getRecommendationsForDate(userId: string, entryDate: string): Promise<AICoachRecommendation[]> {
  const day = ensureIsoDate(entryDate)
  const { data, error } = await supabase
    .from('ai_coach_recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', day)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapRecommendation(row as RecommendationRow))
}

export async function createRecommendations(userId: string, inputs: AICoachRecommendationInput[]): Promise<AICoachRecommendation[]> {
  if (inputs.length === 0) return []

  const payload = inputs.map((input) => ({
    id: uuidv4(),
    user_id: userId,
    entry_date: ensureIsoDate(input.entryDate),
    advice_type: input.adviceType,
    title: input.title,
    message: input.message,
    why_reason: input.why,
    expected_benefit: input.expectedBenefit,
    confidence: Math.min(100, Math.max(0, input.confidence)),
    status: 'pending' as const,
    linked_meal_name: input.linkedMealName ?? null,
  }))

  const { data, error } = await supabase.from('ai_coach_recommendations').insert(payload).select('*')
  if (error) throw error

  return (data ?? []).map((row) => mapRecommendation(row as RecommendationRow))
}

export async function updateRecommendationStatus(userId: string, recommendationId: string, status: AICoachRecommendationStatus): Promise<AICoachRecommendation> {
  const { data, error } = await supabase
    .from('ai_coach_recommendations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', recommendationId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return mapRecommendation(data as RecommendationRow)
}

export async function trackCoachAction(userId: string, recommendationId: string | null, action: AICoachAction): Promise<void> {
  const payload = {
    id: uuidv4(),
    user_id: userId,
    recommendation_id: recommendationId,
    action,
  }

  const { error } = await supabase.from('ai_coach_feedback_events').insert(payload)
  if (error) throw error
}

export async function getLearningSnapshot(userId: string): Promise<AICoachLearningSnapshot> {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data, error } = await supabase
    .from('ai_coach_recommendations')
    .select('advice_type,status')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())

  if (error) throw error

  const rows = (data ?? []) as RecommendationStatusAggregateRow[]
  const byType: AICoachLearningSnapshot['byType'] = {
    daily: { accepted: 0, ignored: 0 },
    weekly: { accepted: 0, ignored: 0 },
    budget: { accepted: 0, ignored: 0 },
    shopping: { accepted: 0, ignored: 0 },
    restaurant: { accepted: 0, ignored: 0 },
    recovery: { accepted: 0, ignored: 0 },
  }

  let accepted = 0
  let ignored = 0

  rows.forEach((row) => {
    if (row.status === 'accepted') {
      accepted += 1
      byType[row.advice_type].accepted += 1
    }

    if (row.status === 'ignored') {
      ignored += 1
      byType[row.advice_type].ignored += 1
    }
  })

  const total = accepted + ignored

  return {
    acceptanceRate: total > 0 ? (accepted / total) * 100 : 50,
    ignoredRate: total > 0 ? (ignored / total) * 100 : 50,
    byType,
  }
}
