import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Trophy,
  Users,
  Calendar,
  BarChart3,
  Home,
  LogOut,
  ChevronDown,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/matches', label: 'Matches', icon: Calendar },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
]

export function Navbar() {
  const { user, profile, signOut, updateRole } = useAuthStore()
  const { theme } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()

  const isTestTheme = theme === 'test'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleRole = async () => {
    const currentRole = profile?.role || 'viewer'
    const nextRole = currentRole === 'viewer' ? 'organizer' : 'viewer'
    await updateRole(nextRole)
  }

  const displayName = profile?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'User'
  const userInitial = displayName.charAt(0).toUpperCase()

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-sm transition-colors',
        isTestTheme
          ? 'bg-card/90 border-border'
          : 'bg-background/90 border-border'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="LocalCricket Logo" className="size-8 object-contain" />
          <span className="font-bold text-lg tracking-tight hidden sm:block">LocalCricket</span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {profile?.role === 'organizer' && (
            <Link to="/tournaments/new">
              <Button size="sm" className="hidden sm:flex gap-1.5">
                <Zap className="size-3.5" />
                New Tournament
              </Button>
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <Badge variant="secondary" className="text-xs hidden sm:flex capitalize">
                    {profile?.role || 'viewer'}
                  </Badge>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {profile?.role === 'organizer' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/tournaments/new" className="flex items-center gap-2">
                        <Trophy className="size-4" />
                        New Tournament
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/tournaments" className="flex items-center gap-2">
                    <Users className="size-4" />
                    My Tournaments
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleRole} className="cursor-pointer">
                  <RefreshCw className="size-4 text-muted-foreground mr-2" />
                  Switch to {profile?.role === 'viewer' ? 'Organizer' : 'Viewer'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t flex">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
              location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </div>
    </header>
  )
}
