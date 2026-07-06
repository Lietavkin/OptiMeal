import type { ReactNode } from 'react'

interface LandingLayoutProps {
  children: ReactNode
}

function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_top_left,_rgba(16,_185,_129,_0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(5,_150,_105,_0.14),_transparent_30%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default LandingLayout
