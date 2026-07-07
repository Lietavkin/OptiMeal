type AppRoutePath =
  | '/'
  | '/login'
  | '/signup'
  | '/forgot-password'
  | '/reset-password'
  | '/onboarding'
  | '/stores/data'
  | '/admin/products'
  | '/coach'
  | '/dashboard'
  | '/profile'
  | '/settings'
  | '/recipes'
  | '/not-found'

export const loadHomePage = () => import('../pages/HomePage')
export const loadLoginPage = () => import('../pages/LoginPage')
export const loadSignupPage = () => import('../pages/SignupPage')
export const loadForgotPasswordPage = () => import('../pages/ForgotPasswordPage')
export const loadResetPasswordPage = () => import('../pages/ResetPasswordPage')
export const loadOnboardingPage = () => import('../pages/OnboardingPage')
export const loadStoreDataManagementPage = () => import('../pages/StoreDataManagementPage')
export const loadAdminProductsPage = () => import('../pages/AdminProductsPage')
export const loadAICoachPage = () => import('../pages/AICoachPage')
export const loadDashboardPage = () => import('../pages/DashboardPage')
export const loadProfilePage = () => import('../pages/ProfilePage')
export const loadSettingsPage = () => import('../pages/SettingsPage')
export const loadRecipesPage = () => import('../pages/RecipesPage')
export const loadNotFoundPage = () => import('../pages/NotFoundPage')

const routeLoaderByPath: Record<AppRoutePath, () => Promise<unknown>> = {
  '/': loadHomePage,
  '/login': loadLoginPage,
  '/signup': loadSignupPage,
  '/forgot-password': loadForgotPasswordPage,
  '/reset-password': loadResetPasswordPage,
  '/onboarding': loadOnboardingPage,
  '/stores/data': loadStoreDataManagementPage,
  '/admin/products': loadAdminProductsPage,
  '/coach': loadAICoachPage,
  '/dashboard': loadDashboardPage,
  '/profile': loadProfilePage,
  '/settings': loadSettingsPage,
  '/recipes': loadRecipesPage,
  '/not-found': loadNotFoundPage,
}

const preloadedRoutes = new Set<AppRoutePath>()

function toRoutePath(pathname: string): AppRoutePath | null {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (normalized === '/') return '/'
  if (normalized in routeLoaderByPath) return normalized as AppRoutePath
  return null
}

export function preloadRouteByPath(pathname: string) {
  const routePath = toRoutePath(pathname)
  if (!routePath) return
  if (preloadedRoutes.has(routePath)) return

  preloadedRoutes.add(routePath)

  void routeLoaderByPath[routePath]().catch(() => {
    preloadedRoutes.delete(routePath)
  })
}
