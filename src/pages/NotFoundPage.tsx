import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] bg-white/95 p-10 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Page not found</p>
        <h1 className="mt-6 text-4xl font-semibold text-slate-950">We can’t find that page.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex rounded-full bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-700"
        >
          Return to login
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
