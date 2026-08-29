import { useEffect, useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Zap,
  Calendar,
  BarChart3,
  LogOut,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Clock,
  Radio,
  Flame,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SportCardProps {
  title: string
  emoji: string
  tagline: string
  description: string
  status: 'active' | 'coming_soon'
  color: string
  to?: string
  features: string[]
  stats?: { label: string; value: number | string }[]
  quickLinks?: { label: string; to: string; icon?: any }[]
}

const UPCOMING_SPORTS = [
  {
    name: 'Badminton',
    emoji: '🏸',
    tagline: 'Rally Point Scoring & Tournaments',
    desc: 'Singles and doubles scoring, 21-point sets, interval tracking, and league fixtures.',
  },
  {
    name: 'Football / Futsal',
    emoji: '⚽',
    tagline: 'Match Timer, Goals & Cards',
    desc: 'Goal timeline, assist tracking, penalty shootouts, substitutions, and tournament tables.',
  },
  {
    name: 'Tennis',
    emoji: '🎾',
    tagline: 'Game, Set & Match Engine',
    desc: 'Advantage scoring, 7-point tiebreakers, server tracking, and Grand Slam style brackets.',
  },
  {
    name: 'Basketball',
    emoji: '🏀',
    tagline: 'Quarters, Fouls & Shot Clock',
    desc: 'Quarter-by-quarter scoring, 2pt/3pt trackers, team fouls, and tournament leaderboards.',
  },
  {
    name: 'Volleyball',
    emoji: '🏐',
    tagline: 'Rotation & Set Scoring',
    desc: '25-point set scoring, player position rotation tracking, and tournament playoffs.',
  },
  {
    name: 'Pickleball',
    emoji: '🏓',
    tagline: 'Side-out & Kitchen Tracker',
    desc: 'Traditional side-out scoring, 11-point games, doubles server number, and quick matches.',
  },
]

export function SportsHubPage() {
  const { user, profile, signOut, updateRole, loading } = useAuthStore()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    cricketTournaments: 0,
    cricketLive: 0,
    ttMatches: 0,
    ttTournaments: 0,
  })

  useEffect(() => {
    fetchHubStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Loading..." className="size-10 object-contain animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading Sports Hub...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const fetchHubStats = async () => {
    try {
      const [cTourRes, cLiveRes, ttMatchRes, ttTourRes] = await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'live'),
        supabase.from('tt_matches').select('id', { count: 'exact', head: true }),
        supabase.from('tt_tournaments').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        cricketTournaments: cTourRes.count ?? 0,
        cricketLive: cLiveRes.count ?? 0,
        ttMatches: ttMatchRes.count ?? 0,
        ttTournaments: ttTourRes.count ?? 0,
      })
    } catch {
      // ignore
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleRole = async () => {
    const currentRole = profile?.role || 'viewer'
    const nextRole = currentRole === 'viewer' ? 'organizer' : 'viewer'
    await updateRole(nextRole)
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Player'
  const userInitial = displayName[0]?.toUpperCase() || 'U'

  return (
    <div className="min-h-svh bg-background flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-sm bg-background/90 border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Local Tournament Logo" className="size-8 object-contain" />
            <span className="font-bold text-lg tracking-tight">Local Tournament</span>
          </Link>

          <div className="flex items-center gap-3">
            {profile?.role === 'organizer' && (
              <Badge variant="outline" className="hidden sm:inline-flex border-primary/40 text-primary bg-primary/5 text-xs">
                Organizer Mode
              </Badge>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
                      {displayName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.name || displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleRole}>
                    Switch to {profile?.role === 'organizer' ? 'Viewer' : 'Organizer'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="size-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-10">
        <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-8 sm:p-10 text-primary-foreground relative overflow-hidden shadow-lg">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-semibold mb-4 backdrop-blur-sm">
              <Sparkles className="size-3.5" /> Multi-Sport Tournament Platform
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Welcome back, {displayName}!
            </h1>
            <p className="text-primary-foreground/85 text-sm sm:text-base leading-relaxed">
              Choose your sport to create tournaments, auto-generate round-robin fixtures, score live matches ball-by-ball or point-by-point, and view player statistics.
            </p>
          </div>

          {/* Decorative circles */}
          <div className="absolute -right-12 -bottom-12 size-60 rounded-full border-8 border-primary-foreground/10 opacity-40 pointer-events-none" />
          <div className="absolute -right-4 -bottom-4 size-36 rounded-full border-4 border-primary-foreground/10 opacity-30 pointer-events-none" />
        </div>

        {/* Primary Sports Selection */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Select a Sport</h2>
            <p className="text-sm text-muted-foreground">Pick a sport module to manage tournaments or start live scoring</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cricket Card */}
            <Card className="relative overflow-hidden border-2 hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-3xl shrink-0 shadow-sm">
                      🏏
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-foreground">Cricket</h3>
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                          Live Scoring
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Tournaments · Overs · Ball-by-Ball · Stats</p>
                    </div>
                  </div>

                  {stats.cricketLive > 0 && (
                    <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-xs flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                      {stats.cricketLive} Live
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Comprehensive cricket management suite with custom overs, playing XI rosters, wagon wheel ball events, strike rate and bowling economy analytics.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold tabular-nums">{stats.cricketTournaments}</p>
                    <p className="text-[11px] text-muted-foreground">Tournaments</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold tabular-nums">T20 / ODI</p>
                    <p className="text-[11px] text-muted-foreground">Formats</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold tabular-nums">Wagon Wheel</p>
                    <p className="text-[11px] text-muted-foreground">Ball Tracking</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Link to="/cricket" className="w-full sm:flex-1">
                    <Button className="w-full gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                      Open Cricket Hub <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link to="/tournaments" className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                        <Trophy className="size-3.5" /> Tournaments
                      </Button>
                    </Link>
                    <Link to="/matches" className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                        <Calendar className="size-3.5" /> Matches
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table Tennis Card */}
            <Card className="relative overflow-hidden border-2 hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20 text-3xl shrink-0 shadow-sm">
                      🏓
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-foreground">Table Tennis</h3>
                        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs font-semibold">
                          Quick Match & Tournaments
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">1v1 & 2v2 · Deuce Engine · Auto-Fixtures</p>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-xs bg-blue-500/5 text-blue-600 border-blue-500/30">
                    <Flame className="size-3 mr-1 text-blue-500" /> New
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fast-paced table tennis scoring engine. Handles 11 & 21 point formats, deuce advantage, server rotations, doubles 4-step rotations, and auto-generated round-robin fixtures.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold tabular-nums">{stats.ttTournaments}</p>
                    <p className="text-[11px] text-muted-foreground">Tournaments</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold tabular-nums">11 & 21 pts</p>
                    <p className="text-[11px] text-muted-foreground">Scoring Formats</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-base font-bold tabular-nums">1v1 & 2v2</p>
                    <p className="text-[11px] text-muted-foreground">Singles / Doubles</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Link to="/table-tennis" className="w-full sm:flex-1">
                    <Button className="w-full gap-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                      Open Table Tennis Hub <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link to="/table-tennis/tournaments" className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                        <Award className="size-3.5" /> Tournaments
                      </Button>
                    </Link>
                    <Link to="/table-tennis/quick-match" className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                        <Zap className="size-3.5" /> Quick Match
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* More Sports Loading Section */}
        <section className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">More Sports Loading...</h2>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold animate-pulse">
                  <Clock className="size-3 mr-1" /> Expanding Soon
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                We are actively building tournament & scoring engines for more community sports
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {UPCOMING_SPORTS.map((sport) => (
              <Card key={sport.name} className="border-border/60 bg-card/60 backdrop-blur-xs hover:border-border transition-all">
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 rounded-xl bg-muted/60 inline-block">{sport.emoji}</span>
                      <div>
                        <h4 className="font-bold text-base">{sport.name}</h4>
                        <p className="text-xs text-primary/80 font-medium">{sport.tagline}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground border-border shrink-0">
                      Loading...
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {sport.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Local Tournament Logo" className="size-6 object-contain" />
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Local Tournament. All-in-One Multi-Sport Management.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/careers" className="hover:text-foreground transition-colors">
              Careers
            </Link>
            <span>·</span>
            <a href="mailto:ankush170306@gmail.com" className="hover:text-foreground transition-colors">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
