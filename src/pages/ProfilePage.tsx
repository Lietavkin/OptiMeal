import { type FormEvent, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import useProfile from '../hooks/useProfile'

export default function ProfilePage() {
  const { profile, loading, saveProfile } = useProfile()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [calories, setCalories] = useState<number>(profile?.daily_calories_goal ?? 2000)
  const [protein, setProtein] = useState<number>(profile?.daily_protein_goal ?? 100)
  const [carbs, setCarbs] = useState<number>(profile?.daily_carbs_goal ?? 250)
  const [fat, setFat] = useState<number>(profile?.daily_fat_goal ?? 70)

  useEffect(() => {
    setName(profile?.display_name ?? '')
    setCalories(profile?.daily_calories_goal ?? 2000)
    setProtein(profile?.daily_protein_goal ?? 100)
    setCarbs(profile?.daily_carbs_goal ?? 250)
    setFat(profile?.daily_fat_goal ?? 70)
  }, [profile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await saveProfile({ display_name: name, daily_calories_goal: calories, daily_protein_goal: protein, daily_carbs_goal: carbs, daily_fat_goal: fat })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl rounded-2xl bg-white p-8">
        <h2 className="text-2xl font-semibold">Profile</h2>
        {loading ? <p className="text-sm text-slate-500 mt-4">Loading…</p> : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Daily calories goal</label>
              <input type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Daily protein goal</label>
              <input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Daily carbs goal</label>
              <input type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Daily fat goal</label>
              <input type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit">Save profile</Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
