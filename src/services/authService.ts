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
  return supabase.auth.resetPasswordForEmail(email)
}

export async function getSession() {
  return supabase.auth.getSession()
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(_event, session))
}
