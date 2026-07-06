import type { ReactNode } from 'react'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description: string
  trailing?: ReactNode
}

function SectionHeading({ eyebrow, title, description, trailing }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
          {eyebrow}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-xl text-base leading-7 text-slate-600">{description}</p>
      </div>
      {trailing}
    </div>
  )
}

export default SectionHeading
