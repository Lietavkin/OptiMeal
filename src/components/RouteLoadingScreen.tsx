export default function RouteLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-6 sm:px-6" aria-live="polite">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">OptiMeal</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-950 sm:text-2xl">Loading your experience</h1>
        <p className="mt-2 text-sm text-slate-600">Preparing nutrition insights and recommendations.</p>

        <div className="mt-6 space-y-3">
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-200" />
          <div className="h-3 w-4/6 animate-pulse rounded-full bg-slate-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-emerald-50" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
