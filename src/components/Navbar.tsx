import { Link, NavLink, useLocation } from 'react-router-dom'
import { classNames } from '../utils/classNames'

function NavItem({ to, children }: { to: string; children: string }) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				classNames(
					'rounded-full px-4 py-2 text-sm font-medium transition',
					isActive ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-slate-100',
				)
			}
		>
			{children}
		</NavLink>
	)
}

export default function Navbar() {
	const location = useLocation()
	const isDashboardArea = ['/dashboard', '/profile', '/settings', '/planner', '/shopping'].some((path) => location.pathname.startsWith(path))

	return (
		<header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
			<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
				<Link to={isDashboardArea ? '/dashboard' : '/'} className="text-xl font-semibold tracking-tight text-slate-950">
					OptiMeal
				</Link>

				{isDashboardArea ? (
					<nav className="order-3 flex w-full items-center gap-2 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:pb-0">
						<NavItem to="/dashboard">Dashboard</NavItem>
						<NavItem to="/planner">Planner</NavItem>
						<NavItem to="/shopping">Shopping</NavItem>
						<NavItem to="/profile">Profile</NavItem>
						<NavItem to="/settings">Settings</NavItem>
					</nav>
				) : (
					<nav className="hidden items-center gap-2 md:flex">
						<a href="#features" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
							Features
						</a>
						<a href="#how-it-works" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
							How it works
						</a>
						<a href="#testimonials" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
							Testimonials
						</a>
					</nav>
				)}

				<div className="flex items-center gap-2">
					{!isDashboardArea ? (
						<>
							<Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
								Sign in
							</Link>
							<Link to="/signup" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
								Get started
							</Link>
						</>
					) : null}
				</div>
			</div>
		</header>
	)
}