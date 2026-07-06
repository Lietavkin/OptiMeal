import { useContext } from 'react'
import { PlannerContext } from '../contexts/PlannerContext'

export default function usePlanner() {
  const ctx = useContext(PlannerContext)
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider')
  return ctx
}
