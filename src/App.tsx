import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { LoginPage, SignupPage } from '@/pages/AuthPages'
import { HomePage } from '@/pages/HomePage'
import { TournamentsListPage, CreateTournamentPage } from '@/pages/TournamentsPage'
import { TournamentDetailPage, TeamPlayersPage } from '@/pages/TournamentDetailPage'
import { MatchPage } from '@/pages/MatchPage'
import { MatchesListPage } from '@/pages/MatchesListPage'
import { StatsPage } from '@/pages/StatsPage'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, fetchProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email)
      } else {
        useAuthStore.getState().setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/tournaments" element={<TournamentsListPage />} />
            <Route path="/tournaments/new" element={<CreateTournamentPage />} />
            <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
            <Route path="/tournaments/:id/teams/:teamId" element={<TeamPlayersPage />} />
            <Route path="/matches" element={<MatchesListPage />} />
            <Route path="/matches/:id" element={<MatchPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
