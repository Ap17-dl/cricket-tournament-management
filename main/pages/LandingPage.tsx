import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Calendar,
  Users,
  Activity,
  ArrowRight,
  LogIn,
  Radio,
  ChevronRight,
  RotateCcw,
  Award,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Tournament } from '@/lib/types'

export function LandingPage() {
  const { user, profile } = useAuthStore()

  // Real-time data from database
  const [dbTournaments, setDbTournaments] = useState<Tournament[]>([])

  // Interactive Scoring Simulator State
  const [simScore, setSimScore] = useState(154)
  const [simWickets, setSimWickets] = useState(3)
  const [simOvers, setSimOvers] = useState(16.2)
  const [simBalls, setSimBalls] = useState<string[]>(['1', '4', '6', '1', 'W', '2'])
  const [simLastAction, setSimLastAction] = useState<string>('Strike rotating smoothly with high precision')

  useEffect(() => {
    fetchLandingData()
  }, [])

  const fetchLandingData = async () => {
    try {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      if (data) setDbTournaments(data as Tournament[])
    } catch (err) {
      console.warn('Error fetching landing data:', err)
    }
  }

  // Interactive scoring simulator handler
  const handleSimScore = (type: 'dot' | '1' | '2' | '4' | '6' | 'wicket') => {
    let nextOvers = simOvers
    const currentBalls = Math.round((simOvers % 1) * 10)
    if (currentBalls >= 5) {
      nextOvers = Math.floor(simOvers) + 1.0
    } else {
      nextOvers = Number((simOvers + 0.1).toFixed(1))
    }
    setSimOvers(nextOvers)

    if (type === 'dot') {
      setSimBalls((prev) => [...prev.slice(-5), '0'])
      setSimLastAction('Good length dot ball outside off stump. Defensive block.')
    } else if (type === '1') {
      setSimScore((s) => s + 1)
      setSimBalls((prev) => [...prev.slice(-5), '1'])
      setSimLastAction('Punched into the cover gap for a crisp single.')
    } else if (type === '2') {
      setSimScore((s) => s + 2)
      setSimBalls((prev) => [...prev.slice(-5), '2'])
      setSimLastAction('Superb placement through mid-wicket, running hard for two.')
    } else if (type === '4') {
      setSimScore((s) => s + 4)
      setSimBalls((prev) => [...prev.slice(-5), '4'])
      setSimLastAction('ELEGANT BOUNDARY! Lofted gracefully over mid-off for four.')
    } else if (type === '6') {
      setSimScore((s) => s + 6)
      setSimBalls((prev) => [...prev.slice(-5), '6'])
      setSimLastAction('MAXIMUM! Clean, effortless strike straight down the fairway.')
    } else if (type === 'wicket') {
      setSimWickets((w) => Math.min(10, w + 1))
      setSimBalls((prev) => [...prev.slice(-5), 'W'])
      setSimLastAction('OUT! High-pressure breakthrough, middle stump uprooted!')
    }
  }

  const handleResetSim = () => {
    setSimScore(154)
    setSimWickets(3)
    setSimOvers(16.2)
    setSimBalls(['1', '4', '6', '1', 'W', '2'])
    setSimLastAction('Simulator reset to 16.2 overs')
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Member'
  const userInitial = displayName[0]?.toUpperCase() || 'M'

  return (
    <div className="min-h-svh bg-[#FAF9F6] text-stone-900 flex flex-col selection:bg-[#C5A059]/25 selection:text-stone-900 font-sans relative overflow-x-hidden">
      {/* Subtle light ambient glow & fine dot grid */}
      <div className="fixed inset-0 pointer-events-none sports-radial-bg z-0 opacity-70" />
      <div className="fixed inset-0 bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none z-0 opacity-60" />

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Logo & Brand (Preserved intact) */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Tournova Logo"
              className="size-9 object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-stone-900 flex items-center gap-2">
                Tournova
                <span className="text-[10px] uppercase font-semibold tracking-[0.2em] px-2 py-0.5 rounded-full bg-stone-100 text-[#8C6D2D] border border-[#8C6D2D]/20 hidden sm:inline-block">
                  Sports Club Edition
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-full bg-stone-100/70 border border-stone-200/70 backdrop-blur-md">
            <Link
              to="/cricket"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-all"
            >
              Cricket Arena
            </Link>
            <Link
              to="/table-tennis"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-all"
            >
              Table Tennis
            </Link>
            <Link
              to="/tournaments"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-all"
            >
              Tournaments
            </Link>
            <Link
              to="/matches"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-all"
            >
              Fixtures & Live
            </Link>
            <Link
              to="/stats"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-white/60 transition-all"
            >
              Leaderboards
            </Link>
          </nav>

          {/* User Auth Buttons / Profile */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                <Link to="/hub">
                  <Button
                    size="sm"
                    className="club-gold-gradient hover:brightness-105 text-[#142318] font-semibold text-xs rounded-full shadow-xs border-0 px-4"
                  >
                    <span className="hidden sm:inline">Sports Hub</span>
                  </Button>
                </Link>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-100/80 border border-stone-200/80">
                  <Avatar className="size-7 border border-stone-200">
                    <AvatarFallback className="bg-stone-900 text-stone-100 text-xs font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-stone-800 hidden md:block max-w-[100px] truncate">
                    {displayName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {/* PROMINENT LOGIN BUTTON (Preserved requirement) */}
                <Link to="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium text-xs rounded-full transition-all px-4 py-2 shadow-xs"
                  >
                    <span>Log in</span>
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    size="sm"
                    className="club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-xs rounded-full shadow-xs border-0 transition-all px-4.5 py-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-16 pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Editorial Headline & Minimalist Value Proposition */}
          <div className="lg:col-span-7 space-y-7 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-100/80 border border-stone-200/80 text-stone-700 text-[11px] font-semibold tracking-[0.2em] uppercase">
              <span className="size-1.5 rounded-full bg-[#8C6D2D] inline-block animate-pulse" />
              <span>EST. 2026 • PRIVATE SPORTING PLATFORM</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight leading-[1.12] text-stone-900">
              The Modern Sporting Arena —{' '}
              <span className="font-editorial italic font-normal text-[#8C6D2D]">
                Engineered for Distinction.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl font-normal">
              Experience championship-grade tournament orchestration, sub-second live scoring broadcasts,
              and immaculate athlete career analytics built with private club refinement.
            </p>

            {/* Hero CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link to="/login">
                <Button
                  size="lg"
                  className="club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-sm rounded-full shadow-xs px-7 py-6 border-0 transition-transform duration-300 hover:scale-102 flex items-center gap-2 group"
                >
                  <Trophy className="size-4.5 transition-transform group-hover:rotate-12 text-[#142318]" />
                  <span>Launch Tournament</span>
                  <ArrowRight className="size-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link to="/cricket">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium text-sm rounded-full shadow-xs px-6 py-6 transition-all"
                >
                  <Radio className="size-4 text-[#8C6D2D] mr-2" />
                  <span>Explore Live Matches</span>
                </Button>
              </Link>
            </div>

            {/* Highlights pill strip */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-6 border-t border-stone-200/80 max-w-xl">
              <div>
                <p className="text-xs font-semibold text-stone-900">Sub-Second Sync</p>
                <p className="text-[11px] text-stone-500">Ultra-low latency scores</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-900">Auto Fixtures</p>
                <p className="text-[11px] text-stone-500">Round-Robin & Knockouts</p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs font-semibold text-stone-900">Player Honors</p>
                <p className="text-[11px] text-stone-500">Detailed career pedigree</p>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Live Match Spotlight Card (Minimalist Luxury Club Style) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl club-card p-7 border border-stone-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] bg-white space-y-5">
              {/* Card Header: Live Pill & Match Metadata */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-600"></span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-[0.2em]">
                    LIVE MATCH • 2nd INNINGS
                  </span>
                </div>
                <Badge variant="outline" className="border-stone-200 text-stone-600 text-[10px] font-medium bg-stone-100/70 rounded-full px-2.5 py-0.5">
                  Championship Final
                </Badge>
              </div>

              {/* Match Teams & Real-Time Score Showcase */}
              <div className="space-y-3.5">
                {/* Team 1 */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/70">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center font-bold text-xs text-stone-800">
                      MUM
                    </div>
                    <div>
                      <p className="font-medium text-sm text-stone-900">Mumbai Strikers</p>
                      <p className="text-[11px] text-stone-500">1st Innings: 20.0 ov</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-base text-stone-800">182/6</p>
                    <p className="text-[11px] text-stone-500">RR 9.10</p>
                  </div>
                </div>

                {/* Team 2 (Chasing & Live) */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/60">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-xs text-amber-900">
                      BLR
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-stone-900">Bengaluru Titans</p>
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-[11px] text-stone-600 font-medium">Chasing 183</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-stone-900 tracking-tight">164/3</p>
                    <p className="text-[11px] text-stone-500 font-medium">17.4 overs</p>
                  </div>
                </div>
              </div>

              {/* Live Target Equation */}
              <div className="px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs">
                <span className="text-stone-700">
                  Need <strong className="text-stone-900 font-semibold">19 runs</strong> in <strong className="text-stone-900 font-semibold">14 balls</strong>
                </span>
                <span className="text-[#8C6D2D] font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 text-[11px]">
                  Req. RR: 8.14
                </span>
              </div>

              {/* Batting on Strike */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/70">
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Striker</p>
                  <p className="font-semibold text-stone-900 truncate mt-0.5">Rohit V. *</p>
                  <p className="text-[11px] text-[#8C6D2D] font-medium">68 (41b, 6x4, 3x6)</p>
                </div>
                <div className="p-3 rounded-2xl bg-stone-50/70 border border-stone-200/70">
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Non-Striker</p>
                  <p className="font-semibold text-stone-800 truncate mt-0.5">Devdutt P.</p>
                  <p className="text-[11px] text-stone-500 font-medium">34 (22b, 4x4)</p>
                </div>
              </div>

              {/* Current Over Beads */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-semibold uppercase tracking-[0.2em] text-[10px]">Over 18</span>
                  <span className="text-stone-500">Bowler: J. Archer (3.4 ov)</span>
                </div>
                <div className="flex items-center gap-2">
                  {['1', '4', '0', '6', '2'].map((ball, i) => (
                    <span
                      key={i}
                      className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        ball === '6'
                          ? 'bg-[#FAF4E5] text-[#8C6D2D] border border-[#E4D5B4]'
                          : ball === '4'
                          ? 'bg-stone-100 text-stone-900 border border-stone-300'
                          : ball === '0'
                          ? 'bg-stone-50 text-stone-400 border border-stone-200'
                          : 'bg-stone-100/70 text-stone-800 border border-stone-200'
                      }`}
                    >
                      {ball}
                    </span>
                  ))}
                  <span className="size-7 rounded-full border border-dashed border-stone-400 flex items-center justify-center text-xs text-stone-600 font-bold animate-pulse">
                    •
                  </span>
                </div>
              </div>

              {/* Quick View Button */}
              <Link to="/matches" className="block pt-2">
                <Button className="w-full bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 font-medium text-xs rounded-full py-5 transition-all">
                  <span>Open Full Match Scorecard</span>
                  <ArrowRight className="size-3.5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS STRIP (Minimalist Architectural Division) */}
      <section className="relative z-10 py-12 border-y border-stone-200/80 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <p className="font-editorial text-4xl sm:text-5xl font-normal text-stone-900 tracking-tight">120+</p>
              <p className="text-[11px] sm:text-xs text-stone-500 uppercase tracking-widest font-medium">Tournaments Hosted</p>
            </div>
            <div className="space-y-1">
              <p className="font-editorial text-4xl sm:text-5xl font-normal text-[#8C6D2D] tracking-tight">
                1,500+
              </p>
              <p className="text-[11px] sm:text-xs text-stone-500 uppercase tracking-widest font-medium">Matches Scored Live</p>
            </div>
            <div className="space-y-1">
              <p className="font-editorial text-4xl sm:text-5xl font-normal text-stone-900 tracking-tight">3,800+</p>
              <p className="text-[11px] sm:text-xs text-stone-500 uppercase tracking-widest font-medium">Registered Athletes</p>
            </div>
            <div className="space-y-1">
              <p className="font-editorial text-4xl sm:text-5xl font-normal text-stone-900 tracking-tight">&lt; 100ms</p>
              <p className="text-[11px] sm:text-xs text-stone-500 uppercase tracking-widest font-medium">Broadcast Latency</p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE LIVE SCORING SIMULATOR */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="outline" className="border-stone-200 text-[#8C6D2D] bg-stone-100/70 px-3.5 py-1 font-semibold text-[10px] uppercase tracking-[0.2em] rounded-full">
            Interactive Test-Drive
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
            Precision Live Scoring — <span className="font-editorial italic text-[#8C6D2D]">At Your Fingertips</span>
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Test the responsiveness of our ball-by-ball scoring console. Select an outcome to update the board, ball beads, and live commentary.
          </p>
        </div>

        <div className="max-w-4xl mx-auto rounded-3xl club-card p-6 sm:p-9 border border-stone-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] bg-white space-y-6">
          {/* Simulated Scoreboard Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-6 rounded-2xl bg-stone-50/70 border border-stone-200/70">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.2em]">Tournament Final</p>
              <p className="text-base font-semibold text-stone-900">Kings XI vs Rising Stars</p>
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-600 animate-ping inline-block" />
                Live Scoring Active
              </p>
            </div>

            <div className="text-center py-2 px-4 rounded-xl bg-white border border-stone-200 space-y-1">
              <p className="font-editorial text-4xl sm:text-5xl font-normal text-stone-900 tracking-tight">
                {simScore}/{simWickets}
              </p>
              <p className="text-xs font-medium text-stone-500">
                Overs: <span className="text-[#8C6D2D] font-semibold">{simOvers}</span> / 20.0
              </p>
            </div>

            <div className="text-left md:text-right space-y-1">
              <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-[0.2em]">Run Rate</p>
              <p className="font-editorial text-2xl font-normal text-[#8C6D2D]">
                {((simScore / Math.max(1, Math.floor(simOvers) + (simOvers % 1) * 1.66))).toFixed(2)}
              </p>
              <p className="text-xs text-stone-500">Target: 188 runs</p>
            </div>
          </div>

          {/* Commentary & Ball Beads Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50/70 border border-stone-200/70">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-widest">Recent:</span>
              <div className="flex items-center gap-1.5">
                {simBalls.map((b, idx) => (
                  <span
                    key={idx}
                    className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      b === 'W'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : b === '6'
                        ? 'bg-[#FAF4E5] text-[#8C6D2D] border border-[#E4D5B4]'
                        : b === '4'
                        ? 'bg-stone-200 text-stone-900 border border-stone-300'
                        : 'bg-white text-stone-700 border border-stone-200'
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-stone-600 italic truncate max-w-xs sm:max-w-md">
              &quot;{simLastAction}&quot;
            </div>

            <button
              onClick={handleResetSim}
              className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors shrink-0"
              title="Reset Simulator"
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          </div>

          {/* Scorer Buttons Pad */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <Button
              onClick={() => handleSimScore('dot')}
              variant="outline"
              className="h-13 font-semibold text-xs border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl"
            >
              Dot (0)
            </Button>
            <Button
              onClick={() => handleSimScore('1')}
              variant="outline"
              className="h-13 font-semibold text-xs border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl"
            >
              +1 Single
            </Button>
            <Button
              onClick={() => handleSimScore('2')}
              variant="outline"
              className="h-13 font-semibold text-xs border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl"
            >
              +2 Runs
            </Button>
            <Button
              onClick={() => handleSimScore('4')}
              className="h-13 font-semibold text-xs bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 rounded-xl shadow-xs"
            >
              Four (4)
            </Button>
            <Button
              onClick={() => handleSimScore('6')}
              className="h-13 font-semibold text-xs bg-[#FAF4E5] hover:bg-[#F2E8D2] text-[#8C6D2D] border border-[#E4D5B4] rounded-xl shadow-xs"
            >
              Six (6)
            </Button>
            <Button
              onClick={() => handleSimScore('wicket')}
              className="h-13 font-semibold text-xs bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl shadow-xs"
            >
              Wicket
            </Button>
          </div>

          <div className="text-center pt-2">
            <Link to="/login">
              <span className="text-xs font-medium text-[#8C6D2D] hover:text-[#A6823E] inline-flex items-center gap-1 cursor-pointer">
                Sign in to manage and score official matches with custom rosters <ArrowRight className="size-3" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED TOURNAMENTS & CHAMPIONSHIPS */}
      <section id="tournaments" className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="space-y-2">
            <Badge variant="outline" className="border-stone-200 text-stone-600 bg-stone-100/70 px-3 py-1 font-semibold text-[10px] uppercase tracking-[0.2em] rounded-full">
              Championship Circuit
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
              Featured Tournaments & <span className="font-editorial italic text-[#8C6D2D]">Leagues</span>
            </h2>
            <p className="text-sm text-stone-500">
              Browse championship leagues, live brackets, standings, and team fixtures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/tournaments">
              <Button variant="outline" className="border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-medium rounded-full px-4.5 py-2 shadow-xs">
                <span>View All Tournaments</span>
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Tournament Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dbTournaments.length > 0 ? (
            dbTournaments.slice(0, 3).map((t) => (
              <div key={t.id} className="rounded-3xl club-card p-6 border border-stone-200/80 club-card-hover bg-white flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-stone-100 text-[#8C6D2D] border border-[#8C6D2D]/20 text-[11px] font-medium rounded-full px-2.5 py-0.5">
                      {t.format} Championship
                    </Badge>
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <Calendar className="size-3.5" /> {t.overs ? `${t.overs} ov` : 'Open'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900 tracking-tight">{t.name}</h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {t.venue ? `Official championship scheduled at ${t.venue}.` : 'Premier competitive tournament hosted on Tournova.'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-2 text-xs">
                    <div className="flex justify-between text-stone-500">
                      <span>Status</span>
                      <span className="font-medium text-emerald-700 capitalize">{t.status}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>Format</span>
                      <span className="font-medium text-stone-800">{t.format}</span>
                    </div>
                  </div>
                </div>
                <Link to={`/tournaments/${t.id}`}>
                  <Button className="w-full bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 font-medium text-xs rounded-full py-5">
                    View Tournament Details
                  </Button>
                </Link>
              </div>
            ))
          ) : (
            /* Default featured Card */
            <div className="rounded-3xl club-card p-6 border border-stone-200/80 club-card-hover bg-white flex flex-col justify-between space-y-6 shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-stone-100 text-[#8C6D2D] border border-[#8C6D2D]/20 text-[11px] font-medium rounded-full px-2.5 py-0.5">
                    Cricket • Premier Cup
                  </Badge>
                  <span className="text-xs text-stone-500 flex items-center gap-1">
                    <Calendar className="size-3.5" /> 8 Clubs
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-900 tracking-tight">Super League Championship</h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                    Premier invitational club T20 cricket tournament with ball-by-ball broadcast and round-robin ladder.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-500">
                    <span>Honor Purse</span>
                    <span className="font-medium text-[#8C6D2D]">₹1,00,000 Trophy</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Format</span>
                    <span className="font-medium text-stone-800">20 Overs Round-Robin</span>
                  </div>
                </div>
              </div>
              <Link to="/tournaments">
                <Button className="w-full bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 font-medium text-xs rounded-full py-5">
                  View Tournament Details
                </Button>
              </Link>
            </div>
          )}

          {/* Card 2: Table Tennis */}
          <div className="rounded-3xl club-card p-6 border border-stone-200/80 club-card-hover bg-white flex flex-col justify-between space-y-6 shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-stone-100 text-stone-800 border border-stone-300 text-[11px] font-medium rounded-full px-2.5 py-0.5">
                  Table Tennis • Masters Draw
                </Badge>
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Users className="size-3.5" /> 16 Seeds
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">Smash Masters Invitational</h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                  Fast-paced 11-point table tennis tournament with service rotation and knockout bracket progression.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-2 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Match Setup</span>
                  <span className="font-medium text-stone-800">Best of 5 Sets</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Deuce Protocol</span>
                  <span className="font-medium text-stone-800">2-Point Margin</span>
                </div>
              </div>
            </div>
            <Link to="/table-tennis/tournaments">
              <Button className="w-full bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 font-medium text-xs rounded-full py-5">
                View Tournament Details
              </Button>
            </Link>
          </div>

          {/* Card 3: T10 Blitz */}
          <div className="rounded-3xl club-card p-6 border border-stone-200/80 club-card-hover bg-white flex flex-col justify-between space-y-6 shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-stone-100 text-[#8C6D2D] border border-[#8C6D2D]/20 text-[11px] font-medium rounded-full px-2.5 py-0.5">
                  Cricket • T10 Invitational
                </Badge>
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Award className="size-3.5 text-[#8C6D2D]" /> Weekend Cup
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">Monsoon Blitz Trophy</h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                  High-octane 10-over tournament featuring rapid powerplays, live scorecards, and MVP awards.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/60 space-y-2 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Fixtures</span>
                  <span className="font-medium text-stone-800">15 Matches Total</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Status</span>
                  <span className="font-medium text-emerald-700">Registration Open</span>
                </div>
              </div>
            </div>
            <Link to="/tournaments">
              <Button className="w-full bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200 font-medium text-xs rounded-full py-5">
                View Tournament Details
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* MULTI-SPORT PLATFORM SUITES */}
      <section className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="outline" className="border-stone-200 text-stone-600 bg-stone-100/70 px-3.5 py-1 font-semibold text-[10px] uppercase tracking-[0.2em] rounded-full">
            Sporting Disciplines
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
            Tailored Engines for <span className="font-editorial italic text-[#8C6D2D]">Every Sport</span>
          </h2>
          <p className="text-sm text-stone-500">
            Dedicated scoring logic, custom rulebooks, and tournament bracket algorithms fine-tuned for each sport.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cricket Suite Banner */}
          <div className="rounded-3xl club-card p-8 sm:p-9 border border-stone-200/80 bg-white relative overflow-hidden group shadow-xs">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Trophy className="size-48 text-[#8C6D2D]" />
            </div>
            <div className="relative z-10 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-[#8C6D2D] text-[11px] font-semibold border border-[#8C6D2D]/20 tracking-widest uppercase">
                Active Discipline
              </div>
              <h3 className="text-2xl font-normal text-stone-900">
                Cricket Tournament <span className="font-editorial italic text-[#8C6D2D]">Arena</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md">
                Full T20, ODI, T10, and Test cricket support. Real-time ball-by-ball inputs, extras,
                wagon wheels, partnership charts, and automated Cricbuzz-style league tables.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {['Ball-by-Ball Live', 'Wagon Wheel', 'Net Run Rate', 'Player of Match'].map((t) => (
                  <span key={t} className="text-[11px] font-medium px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    {t}
                  </span>
                ))}
              </div>
              <div className="pt-2">
                <Link to="/cricket">
                  <Button className="club-gold-gradient hover:brightness-105 text-[#142318] font-semibold text-xs rounded-full px-5 py-2.5 border-0 shadow-xs">
                    Enter Cricket Hub <ArrowRight className="size-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Table Tennis Suite Banner */}
          <div className="rounded-3xl club-card p-8 sm:p-9 border border-stone-200/80 bg-white relative overflow-hidden group shadow-xs">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <Activity className="size-48 text-stone-300" />
            </div>
            <div className="relative z-10 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-[11px] font-semibold border border-stone-300 tracking-widest uppercase">
                Active Discipline
              </div>
              <h3 className="text-2xl font-normal text-stone-900">
                Table Tennis <span className="font-editorial italic text-[#8C6D2D]">Scoring Engine</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md">
                Singles and doubles scoring, 11-point sets, automated server rotation indicators, deuce advantage rules,
                and tournament knockout fixtures.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {['Server Rotation', '11-Pt Sets', 'Deuce Engine', 'Quick Match'].map((t) => (
                  <span key={t} className="text-[11px] font-medium px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    {t}
                  </span>
                ))}
              </div>
              <div className="pt-2">
                <Link to="/table-tennis">
                  <Button className="bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 font-semibold text-xs rounded-full px-5 py-2.5 shadow-xs">
                    Enter Table Tennis <ArrowRight className="size-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE PLATFORM FEATURES GRID */}
      <section id="features" className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <Badge variant="outline" className="border-stone-200 text-stone-600 bg-stone-100/70 px-3.5 py-1 font-semibold text-[10px] uppercase tracking-[0.2em] rounded-full">
            Club Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
            Engineered for Organizers and <span className="font-editorial italic text-[#8C6D2D]">Athletes</span>
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            From bracket formation to championship trophy presentation, Tournova provides effortless management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-3xl club-card p-6 border border-stone-200/80 bg-white space-y-3 shadow-xs">
            <span className="font-editorial text-2xl text-[#8C6D2D] font-normal block leading-none">01</span>
            <h4 className="text-base font-semibold text-stone-900">Automated Fixtures</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Generate round-robin schedules or single/double knockout brackets in seconds.
            </p>
          </div>

          <div className="rounded-3xl club-card p-6 border border-stone-200/80 bg-white space-y-3 shadow-xs">
            <span className="font-editorial text-2xl text-[#8C6D2D] font-normal block leading-none">02</span>
            <h4 className="text-base font-semibold text-stone-900">Real-Time Scoring</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Spectators and remote supporters track live runs, points, and overs with zero latency.
            </p>
          </div>

          <div className="rounded-3xl club-card p-6 border border-stone-200/80 bg-white space-y-3 shadow-xs">
            <span className="font-editorial text-2xl text-[#8C6D2D] font-normal block leading-none">03</span>
            <h4 className="text-base font-semibold text-stone-900">Athlete Honors</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Automated batting strike rates, bowling economies, MVP points, and permanent player histories.
            </p>
          </div>

          <div className="rounded-3xl club-card p-6 border border-stone-200/80 bg-white space-y-3 shadow-xs">
            <span className="font-editorial text-2xl text-[#8C6D2D] font-normal block leading-none">04</span>
            <h4 className="text-base font-semibold text-stone-900">Role-Based Access</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Dedicated organizer dashboard for match officials and streamlined viewer experience for fans.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION (CTA BANNER) */}
      <section className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-br from-[#FCFAF6] via-[#F8F5EE] to-[#F2EFE8] p-8 sm:p-14 border border-[#E4DCB2]/60 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden text-center space-y-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(197,160,89,0.08),transparent_70%)] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <Badge className="bg-white/80 text-[#8C6D2D] border border-[#8C6D2D]/30 text-[10px] font-semibold uppercase tracking-[0.25em] rounded-full px-3 py-1">
              Host with Distinction
            </Badge>

            <h2 className="text-3xl sm:text-5xl font-normal text-stone-900 tracking-tight leading-tight">
              Elevate Your Next Tournament with <span className="font-editorial italic text-[#8C6D2D]">Tournova</span>
            </h2>

            <p className="text-sm text-stone-600 leading-relaxed max-w-lg mx-auto">
              Join clubs, sporting organizers, and academies managing competitions with unmatched elegance and reliability.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link to="/login">
                <Button
                  size="lg"
                  className="club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-sm rounded-full shadow-xs px-8 py-6 border-0 transition-transform hover:scale-102 flex items-center gap-2"
                >
                  <LogIn className="size-4" />
                  <span>Log in / Sign up to Get Started</span>
                </Button>
              </Link>
              <Link to="/tournaments">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-medium text-sm rounded-full px-7 py-6 shadow-xs"
                >
                  Browse Tournaments
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  )
}
