import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function RouteGuard() {
  const { user, loading } = useAuth()

  if (loading) {
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

  return <Outlet />
}

export default RouteGuard
