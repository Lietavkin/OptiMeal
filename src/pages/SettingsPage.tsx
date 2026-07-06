import { motion } from 'framer-motion'
import DashboardLayout from '../components/DashboardLayout'

function SettingsPage() {
  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Settings</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Preferences</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Settings are being finalized for the MVP. Core account and nutrition preferences are currently managed in your profile.
        </p>
      </motion.div>
    </DashboardLayout>
  )
}

export default SettingsPage
