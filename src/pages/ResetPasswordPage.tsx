import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import { getSession, updatePassword } from '../services/authService'

function isValidRecoverySession() {
  const hash = window.location.hash.toLowerCase()
  return hash.includes('type=recovery') || hash.includes('access_token=')
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [canReset, setCanReset] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkRecoverySession() {
      const { data } = await getSession()
      if (!mounted) return

      const hasSession = Boolean(data.session)
      const hasRecoveryHash = isValidRecoverySession()
      setCanReset(hasSession || hasRecoveryHash)
      setCheckingSession(false)
    }

    void checkRecoverySession()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await updatePassword(password)
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage('Password updated successfully. Redirecting to your dashboard...')
    window.setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl rounded-[2rem] bg-white/95 p-10 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200"
      >
        <div className="mb-8 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Reset password</p>
          <h1 className="text-4xl font-semibold text-slate-950">Set a new password</h1>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Create a secure new password to complete your account recovery.
          </p>
        </div>

        {checkingSession ? (
          <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">Checking your reset link...</p>
        ) : !canReset ? (
          <div className="space-y-4">
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              This reset link is invalid or has expired. Request a new password reset email.
            </p>
            <Link to="/forgot-password" className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-900">
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

            <label className="block text-sm font-semibold text-slate-700">
              New password
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
              Confirm new password
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating password…' : 'Update password'}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
