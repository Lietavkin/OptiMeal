import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { signUpWithEmail, signInWithGoogle } from '../services/authService'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import Button from '../components/Button'
import { preloadRouteByPath } from '../lib/routePreload'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatSignupErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }

  if (normalizedMessage.includes('password should be at least')) {
    return 'Password must be at least 8 characters long.'
  }

  if (normalizedMessage.includes('429') || normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many requests')) {
    return 'Too many signup attempts. Please wait a minute before trying again.'
  }

  if (normalizedMessage.includes('network') || normalizedMessage.includes('failed to fetch')) {
    return 'Network issue detected. Check your connection and try again.'
  }

  return 'Unable to create your account right now. Please try again.'
}

function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    preloadRouteByPath('/onboarding')
    preloadRouteByPath('/dashboard')
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Please enter your email address.')
      setLoading(false)
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await signUpWithEmail(normalizedEmail, password)
    setLoading(false)

    if (signUpError) {
      setError(formatSignupErrorMessage(signUpError.message))
      return
    }

    if (!data.session) {
      setMessage('Account created. Please check your email to verify your account before signing in.')
      return
    }

    navigate('/onboarding')
  }

  async function handleGoogleSignIn() {
    setError('')
    setMessage('')
    setLoading(true)
    const { error: googleError } = await signInWithGoogle()
    setLoading(false)

    if (googleError) {
      setError(formatSignupErrorMessage(googleError.message))
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
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Create your account</p>
          <h1 className="text-4xl font-semibold text-slate-950">Get started with OptiMeal</h1>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Sign up for personalized nutrition tools, habit tracking, and AI-powered insights.
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleGoogleSignIn} disabled={loading} className="w-full justify-center gap-2 bg-slate-950 text-white hover:bg-slate-800">
            <LogIn className="h-5 w-5" />
            Continue with Google
          </Button>
          <div className="relative py-2 text-center text-sm text-slate-400">
            <span className="bg-white px-3">or sign up with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <p role="alert" aria-live="polite" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          ) : null}
          {message ? (
            <p aria-live="polite" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
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
              autoComplete="new-password"
              minLength={8}
              required
              className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-900">
              Sign in
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}

export default SignupPage
