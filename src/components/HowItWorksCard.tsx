import type { Step } from '../types'

function HowItWorksCard({ icon, title, description }: Step) {
  return (
    <article className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-emerald-200/40">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-200/50">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </article>
  )
}

export default HowItWorksCard
