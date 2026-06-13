import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  fetchProfile: (userId: string, userEmail?: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
  fetchProfile: async (userId: string, userEmail?: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      set({ profile: data })
    } else {
      // Profile doesn't exist yet — create it from auth metadata
      const { data: userData } = await supabase.auth.getUser()
      const meta = userData?.user?.user_metadata
      const email = userEmail || userData?.user?.email || ''
      const { data: created } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: meta?.name || email.split('@')[0] || 'User',
          email,
          role: meta?.role || 'viewer',
        })
        .select()
        .single()
      if (created) set({ profile: created })
    }
  },
}))
