import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProfileProvider } from './contexts/ProfileContext'
import RouteGuard from './components/RouteGuard'
import RouteLoadingScreen from './components/RouteLoadingScreen'
import {
  loadHomePage,
  loadAdminProductsPage,
  loadDashboardPage,
  loadForgotPasswordPage,
  loadResetPasswordPage,
  loadAICoachPage,
  loadLoginPage,
  loadNotFoundPage,
  loadOnboardingPage,
  loadProfilePage,
  loadRecipesPage,
  loadSettingsPage,
  loadSignupPage,
  loadStoreDataManagementPage,
} from './lib/routePreload'

const HomePage = lazy(loadHomePage)
const AdminProductsPage = lazy(loadAdminProductsPage)
const StoreDataManagementPage = lazy(loadStoreDataManagementPage)
const DashboardPage = lazy(loadDashboardPage)
const AICoachPage = lazy(loadAICoachPage)
const ForgotPasswordPage = lazy(loadForgotPasswordPage)
const ResetPasswordPage = lazy(loadResetPasswordPage)
const LoginPage = lazy(loadLoginPage)
const SignupPage = lazy(loadSignupPage)
const ProfilePage = lazy(loadProfilePage)
const SettingsPage = lazy(loadSettingsPage)
const RecipesPage = lazy(loadRecipesPage)
const NotFoundPage = lazy(loadNotFoundPage)
const OnboardingPage = lazy(loadOnboardingPage)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <Suspense fallback={<RouteLoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<RouteGuard />}>
                <Route path="/onboarding" element={<OnboardingPage />} />

                <Route element={<RouteGuard requireOnboarding />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/coach" element={<AICoachPage />} />
                  <Route path="/stores/data" element={<StoreDataManagementPage />} />
                  <Route path="/admin/products" element={<AdminProductsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/recipes" element={<RecipesPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
