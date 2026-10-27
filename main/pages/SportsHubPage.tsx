import { useEffect, useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Footer } from '@/components/Footer'
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
  ArrowRight,
  LogOut,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'

const UPCOMING_SPORTS = [
  {
    name: 'Badminton',
    courtType: 'Indoor Court',
    format: '21-Pt Rally Scoring',
    slots: '16 Doubles Slots',
    desc: 'Singles and doubles scoring engine, interval tracking, and round-robin ladder.',
    accent: 'bg-white/[0.04] text-emerald-400 border-emerald-700/40',
  },
  {
    name: 'Football / Futsal',
    courtType: 'Turf & Ground',
    format: 'Match Clock & Cards',
    slots: '8 Team Bracket',
    desc: 'Goal timelines, assist tracking, yellow/red cards, and league standings.',
    accent: 'bg-white/[0.04] text-[#C5A059] border-[#C5A059]/40',
  },
  {
    name: 'Tennis',
    courtType: 'Clay & Hard Court',
    format: 'Game, Set & Match',
    slots: '32 Player Draw',
    desc: 'Advantage scoring, 7-point tiebreakers, server tracking, and Grand Slam draws.',
    accent: 'bg-white/[0.04] text-stone-200 border-white/[0.12]',
  },
  {
    name: 'Basketball',
    courtType: 'Hardwood Court',
    format: 'Quarters & Box Scores',
    slots: '12 Team League',
    desc: 'Period tracking, 2pt/3pt trackers, team fouls, and box score leaderboards.',
    accent: 'bg-white/[0.04] text-[#C5A059] border-[#C5A059]/40',
  },
  {
    name: 'Volleyball',
    courtType: 'Beach & Indoor',
    format: '25-Point Sets',
    slots: '8 Team Knockout',
    desc: 'Rotation tracking, side-out switch, and tournament playoff series.',
    accent: 'bg-white/[0.04] text-emerald-400 border-emerald-700/40',
  },
  {
    name: 'Pickleball',
    courtType: 'Outdoor Court',
    format: '11-Point Side-Out',
    slots: '16 Doubles Slots',
    desc: 'Traditional side-out scoring, server rotation, and quick play tournaments.',
    accent: 'bg-white/[0.04] text-stone-200 border-white/[0.12]',
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
      <div className="min-h-svh flex items-center justify-center bg-[#07120D]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-2 border-[#C5A059] border-t-transparent animate-spin" />
          <p className="text-xs text-stone-400 font-medium tracking-wide">Loading Sports Arena...</p>
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

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Member'
  const userInitial = displayName[0]?.toUpperCase() || 'M'

  return (
    <div className="min-h-svh bg-[#FAF9F6] text-stone-900 flex flex-col selection:bg-[#C5A059]/25 selection:text-stone-900 font-sans relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none sports-radial-bg z-0 opacity-70" />
      <div className="fixed inset-0 bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none z-0 opacity-60" />

      {/* STICKY GLASSMORPHIC NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/85 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="Tournova Logo"
                className="size-8.5 object-contain drop-shadow-xs transition-transform group-hover:scale-105"
              />
              <span className="font-semibold text-lg tracking-tight text-stone-900 flex items-center gap-2">
                Tournova
                <span className="text-[10px] uppercase font-semibold tracking-[0.2em] px-2 py-0.5 rounded-full bg-stone-100 text-[#8C6D2D] border border-[#8C6D2D]/20">
                  Sports Hub
                </span>
              </span>
            </Link>

            <span className="text-stone-300 hidden sm:inline">|</span>

            <Link
              to="/"
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors hidden sm:inline font-medium"
            >
              ← Landing Page
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {profile?.role === 'organizer' ? (
              <span className="text-[11px] font-semibold text-[#8C6D2D] bg-amber-50 px-3 py-1 rounded-full border border-amber-200/80 hidden sm:inline-block">
                Organizer Access
              </span>
            ) : (
              <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200 hidden sm:inline-block">
                Member View
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full px-2.5 py-1.5 bg-stone-100/80 hover:bg-stone-100 border border-stone-200/80 transition-colors">
                  <Avatar className="size-7 border border-stone-200">
                    <AvatarFallback className="text-xs bg-stone-900 text-stone-100 font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-stone-800 hidden sm:block max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="size-3 text-stone-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-stone-200 text-stone-800 shadow-xl rounded-2xl p-1.5">
                <div className="px-3 py-2.5">
                  <p className="text-xs font-semibold text-stone-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-stone-100" />
                <DropdownMenuItem onClick={toggleRole} className="text-xs font-medium cursor-pointer rounded-xl hover:bg-stone-100/80">
                  <RefreshCw className="size-3.5 mr-2 text-stone-500" />
                  Switch to {profile?.role === 'organizer' ? 'Viewer' : 'Organizer'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-stone-100" />
                <DropdownMenuItem onClick={handleSignOut} className="text-xs font-medium text-red-600 focus:text-red-700 cursor-pointer rounded-xl hover:bg-red-50">
                  <LogOut className="size-3.5 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-12 relative z-10">
        {/* HERO SPORTS ARENA BANNER */}
        <section className="relative rounded-3xl overflow-hidden club-card p-8 sm:p-12 border border-stone-200/80 bg-white shadow-xs">
          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-100/80 text-[#8C6D2D] text-[11px] font-semibold tracking-[0.2em] border border-[#8C6D2D]/20 uppercase">
              Multi-Sport Management Arena
            </div>

            <h1 className="text-3xl sm:text-5xl font-normal tracking-tight text-stone-900 leading-tight">
              Manage Sports Events, <br className="hidden sm:block" />
              <span className="font-editorial italic text-[#8C6D2D]">Fixtures & Live Scoring.</span>
            </h1>

            <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl font-normal">
              Host official tournaments, auto-generate round-robin brackets, broadcast live matches ball-by-ball or point-by-point, and view comprehensive athlete leaderboards.
            </p>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-stone-200/80">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Tournaments</p>
                <p className="font-editorial text-2xl font-normal text-stone-900">
                  {stats.cricketTournaments + stats.ttTournaments}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Matches Scored</p>
                <p className="font-editorial text-2xl font-normal text-[#8C6D2D]">
                  {stats.cricketMatches + stats.ttMatches}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Athletes</p>
                <p className="font-editorial text-2xl font-normal text-stone-900">
                  {stats.totalPlayers > 0 ? stats.totalPlayers : 'Active'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Engine Protocol</p>
                <p className="text-xs font-semibold text-stone-800 mt-1">
                  Sub-Second Sync
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIVE SPORTS HUBS GRID */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-normal tracking-tight text-stone-900">
                Active Sports <span className="font-editorial italic text-[#8C6D2D]">Disciplines</span>
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Select a sport to create tournaments, run fixtures, or begin live match scoring
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cricket Hub Card */}
            <div className="rounded-3xl club-card p-8 border border-stone-200/80 club-card-hover bg-white flex flex-col justify-between space-y-6 shadow-xs">
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-stone-100 text-[#8C6D2D] border border-[#8C6D2D]/20 text-xs font-medium rounded-full px-3 py-0.5">
                      Cricket Arena
                    </Badge>
                    <span className="text-xs text-stone-500 font-medium">T20 · T10 · ODI · Test</span>
                  </div>
                  <h3 className="text-2xl font-normal text-stone-900">
                    Cricket <span className="font-editorial italic text-[#8C6D2D]">Tournaments</span>
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Ball-by-ball live scorekeeper, custom overs, playing XI rosters, wagon wheel boundary tracking, bowler economy rates, and Cricbuzz-inspired match centre.
                </p>

                {/* Card Stat Row */}
                <div className="grid grid-cols-3 gap-3 py-4 border-y border-stone-200/70 text-center">
                  <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <p className="font-editorial text-xl font-normal text-stone-900">{stats.cricketTournaments}</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Tournaments</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <p className="font-editorial text-xl font-normal text-[#8C6D2D]">{stats.cricketMatches}</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Matches</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <p className="font-editorial text-xl font-normal text-emerald-700">Live</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Sync Active</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link to="/cricket" className="w-full sm:flex-1">
                  <Button className="w-full club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-xs rounded-full h-11 gap-2 shadow-xs border-0">
                    Open Cricket Hub <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link to="/tournaments" className="flex-1 sm:flex-none">
                    <Button variant="outline" className="w-full rounded-full text-xs h-11 border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium px-4 shadow-xs">
                      Tournaments
                    </Button>
                  </Link>
                  <Link to="/matches" className="flex-1 sm:flex-none">
                    <Button variant="outline" className="w-full rounded-full text-xs h-11 border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium px-4 shadow-xs">
                      Matches
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Table Tennis Hub Card */}
            <div className="rounded-3xl club-card p-8 border border-stone-200/80 club-card-hover bg-white flex flex-col justify-between space-y-6 shadow-xs">
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-stone-100 text-stone-800 border border-stone-300 text-xs font-medium rounded-full px-3 py-0.5">
                      Table Tennis Arena
                    </Badge>
                    <span className="text-xs text-stone-500 font-medium">1v1 Singles & 2v2 Doubles</span>
                  </div>
                  <h3 className="text-2xl font-normal text-stone-900">
                    Table Tennis <span className="font-editorial italic text-[#8C6D2D]">Scoring Engine</span>
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Automated round-robin fixture generator, 11 & 21 point formats with 5-serve cycles, deuce alternations, deciding game side-switch, and live standings.
                </p>

                {/* Card Stat Row */}
                <div className="grid grid-cols-3 gap-3 py-4 border-y border-stone-200/70 text-center">
                  <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <p className="font-editorial text-xl font-normal text-stone-900">{stats.ttTournaments}</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Tournaments</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <p className="font-editorial text-xl font-normal text-stone-800">{stats.ttMatches}</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Matches</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <p className="font-editorial text-xl font-normal text-[#8C6D2D]">Fast</p>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Fixtures</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link to="/table-tennis" className="w-full sm:flex-1">
                  <Button className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 font-semibold text-xs rounded-full h-11 gap-2 shadow-xs">
                    Open Table Tennis Hub <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link to="/table-tennis/tournaments" className="flex-1 sm:flex-none">
                    <Button variant="outline" className="w-full rounded-full text-xs h-11 border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium px-4 shadow-xs">
                      Tournaments
                    </Button>
                  </Link>
                  <Link to="/table-tennis/quick-match" className="flex-1 sm:flex-none">
                    <Button variant="outline" className="w-full rounded-full text-xs h-11 border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium px-4 shadow-xs">
                      Quick Match
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* UPCOMING SPORTS PIPELINE */}
        <section className="space-y-5 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-normal tracking-tight text-stone-900">
                Future Sporting <span className="font-editorial italic text-[#8C6D2D]">Disciplines</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                New tournament formats and sport rule engines currently in active development
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#8C6D2D] bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
              6 Disciplines in Pipeline
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {UPCOMING_SPORTS.map((sport) => (
              <div
                key={sport.name}
                className="p-6 rounded-3xl club-card border border-stone-200/80 club-card-hover bg-white space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-stone-100 text-stone-700 border-stone-200">
                    {sport.courtType}
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Coming Soon</span>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-stone-900">{sport.name}</h4>
                  <p className="text-xs font-medium text-[#8C6D2D] mt-0.5">{sport.format}</p>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">{sport.desc}</p>
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
