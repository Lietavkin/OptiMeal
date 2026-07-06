import { useState } from 'react'
import { motion } from 'framer-motion'
import { resetPassword } from '../services/authService'
import { Link } from 'react-router-dom'
import Button from '../components/Button'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error: resetError } = await resetPassword(email)
    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage('Check your email for password reset instructions.')
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
          <h1 className="text-4xl font-semibold text-slate-950">Forgot your password?</h1>
          <p className="max-w-xl text-sm leading-7 text-slate-600">
            Enter your email and we’ll send instructions to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

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

          <div className="flex items-center justify-between text-sm text-slate-600">
            <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-900">
              Back to login
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending email…' : 'Send reset link'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}

export default ForgotPasswordPage
