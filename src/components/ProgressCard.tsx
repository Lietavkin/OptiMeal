type ProgressCardProps = {
  title: string
  value: number
  goal: number
  unit?: string
  accent?: 'emerald' | 'sky' | 'amber' | 'rose'
}

const accentStyles = {
  emerald: 'bg-emerald-600',
  sky: 'bg-sky-600',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
}

export default function ProgressCard({ title, value, goal, unit = '', accent = 'emerald' }: ProgressCardProps) {
  const percentage = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-slate-950">
            {value}
            {unit}
          </p>
        </div>
        <div className={`rounded-2xl px-3 py-1 text-xs font-semibold text-white ${accentStyles[accent]}`}>
          {percentage}%
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">Target {goal}{unit}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${accentStyles[accent]}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
