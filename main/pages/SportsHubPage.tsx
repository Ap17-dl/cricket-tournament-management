import { useEffect, useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Footer } from '@/components/Footer'
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
  Activity,
  ArrowRight,
  LogOut,
  Sparkles,
} from 'lucide-react'

const UPCOMING_SPORTS = [
  {
    name: 'Badminton',
    courtType: 'Indoor Court',
    format: '21-Pt Rally Scoring',
    slots: '16 Doubles Slots',
    desc: 'Singles and doubles scoring engine, interval tracking, and round-robin ladder.',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600',
  },
  {
    name: 'Football / Futsal',
    courtType: 'Turf & Ground',
    format: 'Match Clock & Cards',
    slots: '8 Team Bracket',
    desc: 'Goal timelines, assist tracking, yellow/red cards, and league standings.',
    accent: 'bg-amber-50 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600',
  },
  {
    name: 'Tennis',
    courtType: 'Clay & Hard Court',
    format: 'Game, Set & Match',
    slots: '32 Player Draw',
    desc: 'Advantage scoring, 7-point tiebreakers, server tracking, and Grand Slam draws.',
    accent: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    name: 'Basketball',
    courtType: 'Hardwood Court',
    format: 'Quarters & Box Scores',
    slots: '12 Team League',
    desc: 'Period tracking, 2pt/3pt trackers, team fouls, and box score leaderboards.',
    accent: 'bg-orange-50 text-orange-700 border-orange-200',
    iconColor: 'text-orange-600',
  },
  {
    name: 'Volleyball',
    courtType: 'Beach & Indoor',
    format: '25-Point Sets',
    slots: '8 Team Knockout',
    desc: 'Rotation tracking, side-out switch, and tournament playoff series.',
    accent: 'bg-purple-50 text-purple-700 border-purple-200',
    iconColor: 'text-purple-600',
  },
  {
    name: 'Pickleball',
    courtType: 'Outdoor Court',
    format: '11-Point Side-Out',
    slots: '16 Doubles Slots',
    desc: 'Traditional side-out scoring, server rotation, and quick play tournaments.',
    accent: 'bg-teal-50 text-teal-700 border-teal-200',
    iconColor: 'text-teal-600',
  },
]

export function SportsHubPage() {
  const { user, profile, signOut, updateRole, loading } = useAuthStore()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    cricketTournaments: 0,
    cricketMatches: 0,
    ttTournaments: 0,
    ttMatches: 0,
    totalPlayers: 0,
  })

  useEffect(() => {
    fetchHubStats()
  }, [])

  const fetchHubStats = async () => {
    try {
      const [cTour, cMatch, ttTour, ttMatch, pCount] = await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('tt_tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('tt_matches').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        cricketTournaments: cTour.count ?? 0,
        cricketMatches: cMatch.count ?? 0,
        ttTournaments: ttTour.count ?? 0,
        ttMatches: ttMatch.count ?? 0,
        totalPlayers: pCount.count ?? 0,
      })
    } catch (err) {
      console.warn('Hub stats error:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="size-9 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-medium tracking-wide">Loading Sports Platform...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
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
  const userInitial = displayName[0]?.toUpperCase() || 'P'

  return (
    <div className="min-h-svh bg-slate-50/70 text-slate-900 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* AceCourt Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="size-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white transition-transform group-hover:scale-105">
              <Trophy className="size-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                Tournova <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Tournaments</span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {profile?.role === 'organizer' ? (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Organizer Mode
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Viewer Mode
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-all border border-slate-200">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs bg-emerald-600 text-white font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-slate-700 hidden sm:block max-w-[120px] truncate pr-1">
                    {displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-xl rounded-xl">
                <div className="px-3 py-2">
                  <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleRole} className="text-xs cursor-pointer">
                  Switch to {profile?.role === 'organizer' ? 'Viewer' : 'Organizer'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-xs text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="size-3.5 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main AceCourt Hub Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-12">
        {/* AceCourt Athletic Hero Section */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 p-8 sm:p-12 text-white shadow-xl">
          {/* Subtle Court Line Graphic Overlay */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none border-l-2 border-dashed border-white" />
          <div className="absolute -right-16 -bottom-16 size-80 rounded-full border-8 border-white/5 pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold backdrop-blur-md border border-white/10">
              <Sparkles className="size-3.5" /> All-in-One Sports & Tournament Management
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.1]">
              Manage Sports Events, <br className="hidden sm:block" />
              Fixtures & Live Scoring.
            </h1>

            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl font-normal">
              Create official tournaments, auto-generate round-robin fixtures, score live matches ball-by-ball or point-by-point, and view player statistics and standings.
            </p>

            {/* AceCourt Metric Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/15">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-300/80">Tournaments</p>
                <p className="text-2xl font-extrabold font-mono text-white tabular-nums">
                  {stats.cricketTournaments + stats.ttTournaments}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-300/80">Matches Scored</p>
                <p className="text-2xl font-extrabold font-mono text-white tabular-nums">
                  {stats.cricketMatches + stats.ttMatches}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-300/80">Athletes</p>
                <p className="text-2xl font-extrabold font-mono text-white tabular-nums">
                  {stats.totalPlayers > 0 ? stats.totalPlayers : 'Active'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-300/80">Engine</p>
                <p className="text-xs font-bold text-white bg-emerald-500/30 px-2 py-1 rounded-md inline-block mt-1 border border-emerald-400/30">
                  Live Ball & Point Tracking
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Sports Event Hubs (AceCourt Cards) */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Active Sports Hubs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a sport to create tournaments, run fixtures, or begin live match scoring
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cricket Event Card */}
            <Card className="rounded-3xl border border-slate-200/80 bg-white hover:border-emerald-500/40 hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col justify-between">
              <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-600" />

              <CardContent className="p-7 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        Cricket Hub
                      </Badge>
                      <span className="text-xs text-slate-400 font-medium">T20 · T10 · ODI</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Cricket Tournaments
                    </h3>
                  </div>

                  <div className="size-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
                    <Trophy className="size-6" />
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Ball-by-ball live scorekeeper, custom overs, playing XI rosters, wagon wheel boundary tracking, bowler economy rates, and Cricbuzz-inspired match centre.
                </p>

                {/* Event Highlights Strip */}
                <div className="grid grid-cols-3 gap-2.5 py-3 border-y border-slate-100 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{stats.cricketTournaments}</p>
                    <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Tournaments</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{stats.cricketMatches}</p>
                    <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Matches</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm font-bold text-emerald-600 font-sans uppercase">Active</p>
                    <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Scorekeeper</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <Link to="/cricket" className="w-full sm:flex-1">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-11 gap-2 shadow-md shadow-emerald-600/20">
                      Open Cricket Hub <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link to="/tournaments" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full rounded-xl text-xs h-11 border-slate-200 text-slate-700 hover:bg-slate-50">
                        Tournaments
                      </Button>
                    </Link>
                    <Link to="/matches" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full rounded-xl text-xs h-11 border-slate-200 text-slate-700 hover:bg-slate-50">
                        Matches
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table Tennis Event Card */}
            <Card className="rounded-3xl border border-slate-200/80 bg-white hover:border-blue-500/40 hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col justify-between">
              <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />

              <CardContent className="p-7 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        Table Tennis Hub
                      </Badge>
                      <span className="text-xs text-slate-400 font-medium">1v1 Singles & 2v2 Doubles</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                      Table Tennis Tournaments
                    </h3>
                  </div>

                  <div className="size-13 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
                    <Activity className="size-6" />
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Automated round-robin fixture generator, 11 & 21 point formats with 5-serve cycles, deuce alternations, deciding game side-switch, and live standings.
                </p>

                {/* Event Highlights Strip */}
                <div className="grid grid-cols-3 gap-2.5 py-3 border-y border-slate-100 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{stats.ttTournaments}</p>
                    <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Tournaments</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{stats.ttMatches}</p>
                    <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Matches</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm font-bold text-blue-600 font-sans uppercase">Automated</p>
                    <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Fixtures</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <Link to="/table-tennis" className="w-full sm:flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-11 gap-2 shadow-md shadow-blue-600/20">
                      Open Table Tennis Hub <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link to="/table-tennis/tournaments" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full rounded-xl text-xs h-11 border-slate-200 text-slate-700 hover:bg-slate-50">
                        Tournaments
                      </Button>
                    </Link>
                    <Link to="/table-tennis/quick-match" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full rounded-xl text-xs h-11 border-slate-200 text-slate-700 hover:bg-slate-50">
                        Quick Match
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* AceCourt Upcoming Sports Pipeline */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Upcoming Sports Pipeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                New tournament formats and sport rule engines in active development
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              6 Upcoming Formats
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {UPCOMING_SPORTS.map((sport) => (
              <div
                key={sport.name}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sport.accent}`}>
                    {sport.courtType}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Coming Soon</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{sport.name}</h4>
                  <p className="text-xs font-medium text-emerald-700 mt-0.5">{sport.format}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{sport.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Universal Footer */}
      <Footer />
    </div>
  )
}
