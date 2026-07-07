import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn } from 'lucide-react'
import { signInWithEmail, signInWithGoogle } from '../services/authService'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { preloadRouteByPath } from '../lib/routePreload'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    preloadRouteByPath('/onboarding')
    preloadRouteByPath('/dashboard')
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await signInWithEmail(email, password)
    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('/dashboard')
  }

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    const { error: googleError } = await signInWithGoogle()
    setLoading(false)

    if (googleError) {
      setError(googleError.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl rounded-[2rem] bg-white/95 p-10 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200"
      >
        <div className="mb-8 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Welcome back</p>
          <h1 className="text-4xl font-semibold text-slate-950">Sign in to OptiMeal</h1>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Access your AI nutrition dashboard, personalized meal plans, and progress insights.
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleGoogleSignIn} className="w-full justify-center gap-2 bg-slate-950 text-white hover:bg-slate-800">
            <LogIn className="h-5 w-5" />
            Continue with Google
          </Button>
          <div className="relative py-2 text-center text-sm text-slate-400">
            <span className="bg-white px-3">or use email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <Link to="/forgot-password" className="font-medium text-emerald-700 hover:text-emerald-900">
              Forgot password?
            </Link>
            <Link to="/signup" className="font-medium text-emerald-700 hover:text-emerald-900">
              Create account
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}

export default LoginPage
