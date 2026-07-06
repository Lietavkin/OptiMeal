import type { ReactNode } from 'react'
import Navbar from './Navbar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">{children}</div>
    </div>
  )
}
