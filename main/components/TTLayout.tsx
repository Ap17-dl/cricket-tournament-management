import { useEffect } from 'react'
import { Link, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { Zap, Calendar, Radio, Trophy, BookOpen, ArrowLeft, Home } from 'lucide-react'

const ttNavLinks = [
  { to: '/table-tennis', label: 'Home', icon: Home, exact: true },
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
    document.title = '🏓 Table Tennis — LocalCricket'
  }, [])

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl animate-pulse">🏓</div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* TT Navbar */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-sm bg-background/90 border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo / Back */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Back to LocalCricket"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">LocalCricket</span>
            </a>
            <span className="text-border">|</span>
            <Link to="/table-tennis" className="flex items-center gap-2">
              <span className="text-xl">🏓</span>
              <span className="font-bold text-lg tracking-tight hidden sm:block">Table Tennis</span>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {ttNavLinks.map(({ to, label, icon: Icon, exact }) => {
              const isActive = exact
                ? location.pathname === to
                : location.pathname.startsWith(to) && location.pathname !== '/table-tennis'
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Mobile nav */}
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            🏓 Table Tennis Module — LocalCricket
          </p>
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Cricket
          </a>
        </div>
      </footer>
    </div>
  )
}
