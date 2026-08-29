import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { LoginPage, SignupPage } from '@/pages/AuthPages'
import { HomePage } from '@/pages/HomePage'
import { TournamentsListPage, CreateTournamentPage, EditTournamentPage } from '@/pages/TournamentsPage'
import { TournamentDetailPage, TeamPlayersPage } from '@/pages/TournamentDetailPage'
import { MatchPage } from '@/pages/MatchPage'
import { MatchesListPage } from '@/pages/MatchesListPage'
import { StatsPage } from '@/pages/StatsPage'
import { CareersPage } from '@/pages/CareersPage'

// Table Tennis imports
import { TTLayout } from '@/components/TTLayout'
import { TTHomePage } from '@/pages/table-tennis/TTHomePage'
import { TTQuickMatchPage } from '@/pages/table-tennis/TTQuickMatchPage'
import { TTLiveMatchPage } from '@/pages/table-tennis/TTLiveMatchPage'
import { TTFixturesPage } from '@/pages/table-tennis/TTFixturesPage'
import { TTLiveListPage } from '@/pages/table-tennis/TTLiveListPage'
import { TTResultsPage } from '@/pages/table-tennis/TTResultsPage'
import { TTMatchDetailPage } from '@/pages/table-tennis/TTMatchDetailPage'
import { TTRulesPage } from '@/pages/table-tennis/TTRulesPage'

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
            <Route path="/tournaments/:id/edit" element={<EditTournamentPage />} />
            <Route path="/tournaments/:id/teams/:teamId" element={<TeamPlayersPage />} />
            <Route path="/matches" element={<MatchesListPage />} />
            <Route path="/matches/:id" element={<MatchPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/careers" element={<CareersPage />} />
          </Route>
          {/* Table Tennis routes */}
          <Route path="/table-tennis" element={<TTLayout />}>
            <Route index element={<TTHomePage />} />
            <Route path="quick-match" element={<TTQuickMatchPage />} />
            <Route path="fixtures" element={<TTFixturesPage />} />
            <Route path="live" element={<TTLiveListPage />} />
            <Route path="live/:matchId" element={<TTLiveMatchPage />} />
            <Route path="results" element={<TTResultsPage />} />
            <Route path="results/:matchId" element={<TTMatchDetailPage />} />
            <Route path="rules" element={<TTRulesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

