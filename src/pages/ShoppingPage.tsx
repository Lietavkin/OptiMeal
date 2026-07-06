import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../components/Button'
import BudgetOptimizerPanel from '../components/BudgetOptimizerPanel'
import DashboardLayout from '../components/DashboardLayout'
import ShoppingCategoryList from '../components/ShoppingCategoryList'
import { ShoppingProvider } from '../contexts/ShoppingContext'
import useShopping from '../hooks/useShopping'
import { groupItemsByCategory } from '../services/shoppingService'
import type { ShoppingListItem } from '../types'

function ShoppingContent() {
  const {
    list,
    summary,
    loading,
    generating,
    hasMealPlan,
    generateList,
    setOptimizerMode,
    setWeeklyBudget,
    updateItem,
  } = useShopping()
  const [error, setError] = useState('')

  const groupedItems = useMemo(() => groupItemsByCategory(list?.items ?? []), [list?.items])

  async function handleGenerate() {
    setError('')
    try {
      await generateList()
    } catch {
      setError('Could not generate your shopping list. Make sure you have a weekly meal plan first.')
    }
  }

  async function handleModeChange(mode: Parameters<typeof setOptimizerMode>[0]) {
    setError('')
    try {
      await setOptimizerMode(mode)
    } catch {
      setError('Could not update optimizer mode.')
    }
  }

  async function handleBudgetChange(budget: number) {
    if (!list || Number.isNaN(budget) || budget < 0) return
    setError('')
    try {
      await setWeeklyBudget(budget)
    } catch {
      setError('Could not update weekly budget.')
    }
  }

  async function handleTogglePurchased(item: ShoppingListItem) {
    try {
      await updateItem(item.id, { purchased: !item.purchased })
    } catch {
      setError('Could not update item.')
    }
  }

  async function handleNotesChange(item: ShoppingListItem, notes: string) {
    try {
      await updateItem(item.id, { notes })
    } catch {
      setError('Could not save notes.')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-sky-500 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100">Shopping intelligence</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your smart grocery list</h1>
            <p className="mt-3 max-w-2xl text-sm text-emerald-100/90">
              Auto-generated from your weekly plan with budget-aware optimization.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !hasMealPlan}
            className="bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-60"
          >
            {generating ? 'Generating…' : list ? 'Regenerate list' : 'Generate list'}
          </Button>
        </div>
      </div>

      {error ? <p className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your shopping list…</p>
      ) : !hasMealPlan ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">No meal plan found</p>
          <p className="mt-2 text-sm text-slate-500">Create a weekly meal plan first, then generate your grocery list here.</p>
          <div className="mt-6">
            <Link to="/planner" className="inline-flex rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Go to planner
            </Link>
          </div>
        </div>
      ) : !list ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">Ready to shop smarter</p>
          <p className="mt-2 text-sm text-slate-500">Generate a categorized shopping list from your current weekly meal plan.</p>
          <div className="mt-6">
            <Button type="button" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate from meal plan'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <aside>
            <BudgetOptimizerPanel
              weeklyBudget={list.weeklyBudget}
              optimizerMode={list.optimizerMode}
              estimatedTotal={summary.estimatedTotal}
              remainingBudget={summary.remainingBudget}
              nutritionScore={summary.nutritionScore}
              savingsVsHealthiest={summary.savingsVsHealthiest}
              onBudgetChange={handleBudgetChange}
              onModeChange={handleModeChange}
            />
          </aside>
          <div>
            <ShoppingCategoryList
              groupedItems={groupedItems}
              onTogglePurchased={handleTogglePurchased}
              onNotesChange={handleNotesChange}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function ShoppingPage() {
  return (
    <DashboardLayout>
      <ShoppingProvider>
        <ShoppingContent />
      </ShoppingProvider>
    </DashboardLayout>
  )
}
