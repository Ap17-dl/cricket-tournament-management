import { useEffect } from 'react'
import { Link, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Footer } from '@/components/Footer'
import { cn } from '@/lib/utils'
import { Zap, Calendar, Radio, Trophy, BookOpen, Home, Award, Activity } from 'lucide-react'

const ttNavLinks = [
  { to: '/table-tennis', label: 'Home', icon: Home, exact: true },
  { to: '/table-tennis/tournaments', label: 'Tournaments', icon: Award },
  { to: '/table-tennis/quick-match', label: 'Quick Match', icon: Zap },
  { to: '/table-tennis/fixtures', label: 'Fixtures', icon: Calendar },
  { to: '/table-tennis/live', label: 'Live', icon: Radio },
  { to: '/table-tennis/results', label: 'Results', icon: Trophy },
  { to: '/table-tennis/rules', label: 'Rules', icon: BookOpen },
]

export function TTLayout() {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    document.title = 'Table Tennis — Tournova'
  }, [])

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Activity className="size-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-svh bg-[#FAF9F6] text-stone-900 flex flex-col relative selection:bg-[#C5A059]/25 selection:text-stone-900 font-sans">
      <div className="fixed inset-0 pointer-events-none sports-radial-bg z-0 opacity-70" />
      <div className="fixed inset-0 bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none z-0 opacity-60" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] backdrop-blur-xl bg-white/85 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-stone-700 hover:text-stone-900 transition-colors py-1 px-2.5 rounded-lg bg-stone-100/80 hover:bg-stone-100 border border-stone-200/80"
              title="Back to Tournova"
            >
              <img src="/logo.png" alt="Tournova Logo" className="size-4.5 object-contain" />
              <span className="hidden sm:inline font-semibold">Tournova</span>
            </Link>
            <span className="text-stone-300">|</span>
            <Link
              to="/hub"
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors font-medium"
            >
              Hub
            </Link>
            <span className="text-stone-300">|</span>
            <Link to="/table-tennis" className="flex items-center gap-2">
              <div className="size-7.5 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200">
                <Activity className="size-4 text-[#8C6D2D]" />
              </div>
              <span className="font-semibold text-base tracking-tight text-stone-900 hidden sm:block">Table Tennis</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100/80 border border-stone-200/80">
            {ttNavLinks.map(({ to, label, icon: Icon, exact }) => {
              const isActive = exact
                ? location.pathname === to
                : location.pathname.startsWith(to) && location.pathname !== '/table-tennis'
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all',
                    isActive
                      ? 'bg-white text-stone-900 border border-stone-200 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {}
        <div className="md:hidden border-t flex overflow-x-auto">
          {ttNavLinks.filter(l => l.label !== 'Home').map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(to) && (to !== '/table-tennis' || location.pathname === '/table-tennis')
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors min-w-[60px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </div>
      </header>

      {}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full min-h-[calc(100svh-3.5rem)]">
        <Outlet />
      </main>

      {}
      <Footer />
    </div>
  )
}
