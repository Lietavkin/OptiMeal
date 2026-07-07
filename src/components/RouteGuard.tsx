import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import useProfile from '../hooks/useProfile'

type RouteGuardProps = {
  requireOnboarding?: boolean
}

function RouteGuard({ requireOnboarding = false }: RouteGuardProps) {
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()

  if (loading || (requireOnboarding && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
        <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-900/10">
          <p className="text-lg font-semibold">Loading your session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireOnboarding && !profile?.onboarding_completed_at) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

export default RouteGuard
