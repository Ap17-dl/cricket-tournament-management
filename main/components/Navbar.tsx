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
  LogOut,
  ChevronDown,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/cricket', label: 'Cricket' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/matches', label: 'Matches' },
  { to: '/stats', label: 'Stats' },
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

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User'
  const userInitial = displayName[0]?.toUpperCase() || 'U'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-300',
        isTestTheme
          ? 'bg-card/90 border-border'
          : 'bg-white/85 border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.02)]'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand & Sports Switch */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            title="Tournova Landing Page"
          >
            <img
              src="/logo.png"
              alt="Tournova Logo"
              className="size-8.5 object-contain drop-shadow-xs transition-transform group-hover:scale-105"
            />
            <span className="font-semibold text-base tracking-tight text-stone-900 hidden sm:block">
              Tournova
            </span>
          </Link>

          <span className="text-stone-300">|</span>

          <Link
            to="/hub"
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors py-1 px-2.5 rounded-full bg-stone-100/80 hover:bg-stone-100 border border-stone-200/80"
            title="Switch Sports Hub"
          >
            <ArrowLeft className="size-3 text-[#9B7B3E]" />
            <span className="font-medium">All Sports</span>
          </Link>

          <Link
            to="/cricket"
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-stone-800 bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 rounded-full"
          >
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            Cricket Arena
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100/70 border border-stone-200/70">
          {navLinks.map(({ to, label }) => {
            const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all',
                  isActive
                    ? 'bg-white text-stone-900 border border-stone-200 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {profile?.role === 'organizer' && (
            <Link to="/tournaments/new">
              <Button
                size="sm"
                className="hidden sm:flex club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-xs rounded-full shadow-xs border-0 px-4 transition-transform active:scale-95"
              >
                New Tournament
              </Button>
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full px-2.5 py-1.5 bg-stone-100/80 hover:bg-stone-100 border border-stone-200/80 transition-colors">
                  <Avatar className="size-7 border border-stone-200">
                    <AvatarFallback className="text-xs bg-stone-900 text-stone-100 font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-stone-800 hidden sm:block max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <Badge variant="secondary" className="text-[10px] hidden sm:flex capitalize bg-stone-200/70 text-stone-700 border-stone-200 rounded-full px-2">
                    {profile?.role || 'viewer'}
                  </Badge>
                  <ChevronDown className="size-3 text-stone-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white border-stone-200 text-stone-800 shadow-xl rounded-2xl p-1.5">
                {profile?.role === 'organizer' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/tournaments/new" className="flex items-center text-xs font-medium cursor-pointer rounded-xl hover:bg-stone-100/80 px-2.5 py-1.5">
                        New Tournament
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-stone-100" />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/hub" className="flex items-center text-xs font-medium cursor-pointer rounded-xl hover:bg-stone-100/80 px-2.5 py-1.5">
                    Switch Sport (Hub)
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/tournaments" className="flex items-center text-xs font-medium cursor-pointer rounded-xl hover:bg-stone-100/80 px-2.5 py-1.5">
                    My Tournaments
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-stone-100" />
                <DropdownMenuItem onClick={toggleRole} className="cursor-pointer text-xs font-medium rounded-xl hover:bg-stone-100/80 px-2.5 py-1.5">
                  <RefreshCw className="size-3.5 text-stone-500 mr-2" />
                  Switch to {profile?.role === 'viewer' ? 'Organizer' : 'Viewer'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-stone-100" />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-700 text-xs font-medium cursor-pointer rounded-xl hover:bg-red-50 px-2.5 py-1.5">
                  <LogOut className="size-3.5 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium text-xs rounded-full px-3.5 shadow-xs"
                >
                  Sign in
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="sm"
                  className="club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-xs rounded-full px-3.5 border-0 shadow-xs"
                >
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden border-t border-stone-200 bg-white/95 backdrop-blur-md flex">
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex-1 text-center py-3 text-xs font-medium transition-colors',
              location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                ? 'text-[#9B7B3E] font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  )
}
