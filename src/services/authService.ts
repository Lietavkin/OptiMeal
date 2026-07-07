import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export type AuthState = {
  user: User | null
  session: Session | null
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: 'google' })
}

export async function signOut() {
  return supabase.auth.signOut({ scope: 'local' })
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
}

export async function initializeRecoverySessionFromUrl() {
  const url = new URL(window.location.href)
  const queryParams = url.searchParams
  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '')

  const code = queryParams.get('code')
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    if (!result.error) {
      window.history.replaceState({}, document.title, '/reset-password')
    }
    return result
  }

  const tokenHash = queryParams.get('token_hash')
  const otpType = queryParams.get('type')
  if (tokenHash && otpType === 'recovery') {
    const result = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })

    if (!result.error) {
      window.history.replaceState({}, document.title, '/reset-password')
    }
    return result
  }

  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  if (accessToken && refreshToken) {
    const result = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (!result.error) {
      window.history.replaceState({}, document.title, '/reset-password')
    }
    return result
  }

  return supabase.auth.getSession()
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password })
}

export async function getSession() {
  return supabase.auth.getSession()
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(_event, session))
}
