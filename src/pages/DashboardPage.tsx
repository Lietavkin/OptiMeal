import { motion } from 'framer-motion'
import Button from '../components/Button'
import DashboardLayout from '../components/DashboardLayout'
import GoalsSummary from '../components/GoalsSummary'
import MealForm from '../components/MealForm'
import MealList from '../components/MealList'
import MealTimeline from '../components/MealTimeline'
import NutritionSummary from '../components/NutritionSummary'
import ProgressCard from '../components/ProgressCard'
import RecommendationsPanel from '../components/RecommendationsPanel'
import { NutritionProvider } from '../contexts/NutritionContext'
import useAuth from '../hooks/useAuth'
import useProfile from '../hooks/useProfile'
import useNutrition from '../hooks/useNutrition'
import { signOut } from '../services/authService'

function DashboardPage() {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()

  async function handleSignOut() {
    await signOut()
  }

  return (
    <DashboardLayout>
      <NutritionProvider>
        <DashboardContent user={user} profile={profile} profileLoading={profileLoading} onSignOut={handleSignOut} />
      </NutritionProvider>
    </DashboardLayout>
  )
}

function DashboardContent({
  user,
  profile,
  profileLoading,
  onSignOut,
}: {
  user: { email?: string } | null
  profile: { display_name?: string; daily_calories_goal?: number; daily_protein_goal?: number; daily_carbs_goal?: number; daily_fat_goal?: number } | null
  profileLoading: boolean
  onSignOut: () => void
}) {
  const { meals, summary } = useNutrition()

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-8 flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-sky-500 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-100">Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back, {profile?.display_name ?? user?.email ?? 'Member'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-emerald-100/90">
              Your nutrition hub for easy meal tracking, goal progress, and AI-backed recipe inspiration.
            </p>
          </div>
          <Button type="button" onClick={onSignOut} className="bg-white text-slate-950 hover:bg-slate-100">
            Sign out
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-white/10 p-4 text-sm text-emerald-50 shadow-inner shadow-slate-950/5">
            <p className="font-semibold">Goals loaded</p>
            <p className="mt-2 text-3xl font-semibold">{profileLoading ? '…' : profile?.daily_calories_goal ?? '2000'} kcal</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 text-sm text-emerald-50 shadow-inner shadow-slate-950/5">
            <p className="font-semibold">Meals tracked</p>
            <p className="mt-2 text-3xl font-semibold">{profileLoading ? '…' : 'See below'}</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 text-sm text-emerald-50 shadow-inner shadow-slate-950/5">
            <p className="font-semibold">AI recommendations</p>
            <p className="mt-2 text-3xl font-semibold">3</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 text-sm text-emerald-50 shadow-inner shadow-slate-950/5">
            <p className="font-semibold">Progress check</p>
            <p className="mt-2 text-3xl font-semibold">Real time</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <ProgressCard title="Calories" value={profile?.daily_calories_goal ? summary.totalCalories : 0} goal={profile?.daily_calories_goal ?? 2000} unit=" kcal" accent="emerald" />
            <ProgressCard title="Protein" value={summary.totalProtein} goal={profile?.daily_protein_goal ?? 100} unit=" g" accent="sky" />
            <ProgressCard title="Carbs" value={summary.totalCarbs} goal={profile?.daily_carbs_goal ?? 250} unit=" g" accent="amber" />
            <ProgressCard title="Fat" value={summary.totalFat} goal={profile?.daily_fat_goal ?? 70} unit=" g" accent="rose" />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Add a meal</h2>
            <p className="mt-2 text-sm text-slate-500">Quickly log a meal and keep your daily nutrition on track.</p>
            <div className="mt-6">
              <MealForm />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <MealTimeline meals={meals} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Meals</h2>
            <p className="mt-2 text-sm text-slate-500">Edit, delete or add photos to your meals below.</p>
            <div className="mt-6">
              <MealList />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <GoalsSummary />
          <NutritionSummary />
          <RecommendationsPanel />
        </aside>
      </div>
    </motion.div>
  )
}

export default DashboardPage
