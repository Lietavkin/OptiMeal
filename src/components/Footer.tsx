function Footer() {
  return (
    <footer id="footer" className="mx-auto w-full max-w-6xl px-6 pb-10 pt-10 text-sm text-slate-600 sm:px-8">
      <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 OptiMeal. AI-powered nutrition for long-term wellbeing.</p>
        <div className="flex flex-wrap gap-4 text-slate-600">
          <a href="#features" className="transition hover:text-emerald-700">
            Features
          </a>
          <a href="#get-started" className="transition hover:text-emerald-700">
            Get Started
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
