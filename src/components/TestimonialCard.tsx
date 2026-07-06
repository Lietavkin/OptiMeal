import type { ReactNode } from 'react'

interface TestimonialCardProps {
  quote: string
  name: string
  title: string
  avatar: ReactNode
}

function TestimonialCard({ quote, name, title, avatar }: TestimonialCardProps) {
  return (
    <article className="group overflow-hidden rounded-[2rem] bg-white/90 p-8 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 transition hover:-translate-y-1 hover:ring-emerald-200/80">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-2xl">
          {avatar}
        </div>
        <div>
          <p className="text-base font-semibold text-slate-950">{name}</p>
          <p className="text-sm text-slate-500">{title}</p>
        </div>
      </div>

      <p className="mt-6 text-base leading-8 text-slate-600">“{quote}”</p>
    </article>
  )
}

export default TestimonialCard
