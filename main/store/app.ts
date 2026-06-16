import { create } from 'zustand'
import type { MatchTheme } from '@/lib/types'

interface AppState {
  theme: MatchTheme
  setTheme: (theme: MatchTheme) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'default',
  setTheme: (theme) => set({ theme }),
}))
