import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Profile } from '../types'
import useAuth from '../hooks/useAuth'
import { getProfile, upsertProfile } from '../services/profileService'

type ProfileContextValue = {
  profile: Profile | null
  loading: boolean
  saveProfile: (patch: Partial<Profile>) => Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getProfile(user.id)
      if (data) {
        setProfile(data)
      } else {
        const seeded = await upsertProfile({
          id: user.id,
          email: user.email ?? '',
          display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
        })
        setProfile(seeded)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load profile', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const saveProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated')
      const payload = {
        id: user.id,
        email: patch.email ?? profile?.email ?? user.email ?? '',
        ...patch,
      }
      const data = await upsertProfile(payload)
      setProfile(data)
    },
    [user, profile],
  )

  const value = useMemo(() => ({ profile, loading, saveProfile }), [profile, loading, saveProfile])

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
