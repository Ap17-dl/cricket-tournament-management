import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Match, Tournament, Innings } from '@/lib/types'
import {
  Trophy,
  Zap,
  Calendar,
  Users,
  Activity,
  ChevronRight,
  Radio,
  Flame,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopPlayerStat {
  id: string
  name: string
  teamName: string
  runs?: number
  wickets?: number
  strikeRate?: number
  economy?: number
}

function getTeamInningsData(innings: Innings[] | undefined, teamId: string | undefined): { score: string; overs: string } {
  if (!innings || !Array.isArray(innings) || !teamId) {
    return { score: '0/0', overs: '0.0 ov' }
  }
  const matchInnings = innings.find((inn) => inn && inn.batting_team_id === teamId)
  if (!matchInnings) {
    return { score: '0/0', overs: '0.0 ov' }
  }
  return {
    score: `${matchInnings.total_runs ?? 0}/${matchInnings.wickets ?? 0}`,
    overs: `${matchInnings.overs_completed ?? 0} ov`,
  }
}

export function HomePage() {
  const { profile } = useAuthStore()
  const [liveMatches, setLiveMatches] = useState<Match[]>([])
  const [recentMatches, setRecentMatches] = useState<Match[]>([])
  const [recentTournaments, setRecentTournaments] = useState<Tournament[]>([])
  const [topBatsmen, setTopBatsmen] = useState<TopPlayerStat[]>([])
  const [topBowlers, setTopBowlers] = useState<TopPlayerStat[]>([])
  const [stats, setStats] = useState({ tournaments: 0, matches: 0, teams: 0, players: 0 })

  useEffect(() => {
    fetchCricbuzzDashboard()

    const channel = supabase
      .channel('cricbuzz-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchCricbuzzDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchCricbuzzDashboard)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchCricbuzzDashboard = async () => {
    // 1. Fetch live matches safely
    try {
      const { data: liveData } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!matches_team_a_id_fkey(*),
          team_b:teams!matches_team_b_id_fkey(*),
          tournament:tournaments(*),
          innings(*)
        `)
        .eq('status', 'live')
        .limit(8)
      if (liveData) setLiveMatches(liveData as unknown as Match[])
    } catch (e) {
      console.warn('Error fetching live matches:', e)
    }

    // 2. Fetch recent/scheduled matches safely
    try {
      const { data: recentData } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!matches_team_a_id_fkey(*),
          team_b:teams!matches_team_b_id_fkey(*),
          tournament:tournaments(*),
          innings(*)
        `)
        .in('status', ['completed', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(8)
      if (recentData) setRecentMatches(recentData as unknown as Match[])
    } catch (e) {
      console.warn('Error fetching recent matches:', e)
    }

    // 3. Fetch tournaments safely
    try {
      const { data: tourData } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      if (tourData) {
        const organizerIds = [...new Set(tourData.map((t: any) => t.organizer_id).filter(Boolean))]
        let orgMap: Record<string, string> = {}
        if (organizerIds.length > 0) {
          const { data: organizers } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', organizerIds)
          if (organizers) {
            organizers.forEach((o: any) => { orgMap[o.id] = o.name })
          }
        }
        const enriched = tourData.map((t: any) => ({
          ...t,
          organizer: { name: orgMap[t.organizer_id] || 'Organizer' },
        }))
        setRecentTournaments(enriched as Tournament[])
      }
    } catch (e) {
      console.warn('Error fetching tournaments:', e)
    }

    // 4. Fetch counts safely
    try {
      const [tRes, mRes, tmRes, pRes] = await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        tournaments: tRes.count ?? 0,
        matches: mRes.count ?? 0,
        teams: tmRes.count ?? 0,
        players: pRes.count ?? 0,
      })
    } catch (e) {
      console.warn('Error fetching counts:', e)
    }

    // 5. Fetch top batsmen & bowlers from player_stats table safely
    try {
      const { data: statsData } = await supabase
        .from('player_stats')
        .select(`
          runs, wickets, balls_faced, overs_bowled, runs_conceded,
          player:players(id, name, team:teams(team_name))
        `)
        .limit(50)

      if (statsData && statsData.length > 0) {
        const batsmen = [...statsData]
          .filter((s: any) => s.player && (s.runs || 0) > 0)
          .sort((a: any, b: any) => (b.runs || 0) - (a.runs || 0))
          .slice(0, 5)
          .map((s: any) => ({
            id: s.player.id,
            name: s.player.name,
            teamName: s.player.team?.team_name || 'Team',
            runs: s.runs || 0,
            strikeRate: s.balls_faced > 0 ? Number(((s.runs / s.balls_faced) * 100).toFixed(1)) : 0,
          }))
        setTopBatsmen(batsmen)

        const bowlers = [...statsData]
          .filter((s: any) => s.player && (s.wickets || 0) > 0)
          .sort((a: any, b: any) => (b.wickets || 0) - (a.wickets || 0))
          .slice(0, 5)
          .map((s: any) => {
            const overs = Number(s.overs_bowled) || 0
            return {
              id: s.player.id,
              name: s.player.name,
              teamName: s.player.team?.team_name || 'Team',
              wickets: s.wickets || 0,
              economy: overs > 0 ? Number(((s.runs_conceded || 0) / overs).toFixed(2)) : 0,
            }
          })
        setTopBowlers(bowlers)
      } else {
        // Fallback: fetch any registered players for roster preview
        const { data: playerList } = await supabase
          .from('players')
          .select('id, name, role, team:teams(team_name)')
          .limit(5)
        if (playerList && playerList.length > 0) {
          setTopBatsmen(
            playerList.map((pl: any) => ({
              id: pl.id,
              name: pl.name,
              teamName: pl.team?.team_name || 'Team',
              runs: 0,
              strikeRate: 0,
            }))
          )
        }
      }
    } catch (e) {
      console.warn('Error fetching player stats:', e)
    }
  }

  // All matches for the top Cricbuzz-style live ticker
  const tickerMatches = [...liveMatches, ...recentMatches.slice(0, 6)]
  const featuredLiveMatch = liveMatches[0] || (recentMatches.length > 0 ? recentMatches[0] : null)

  const featuredTeamAInfo = featuredLiveMatch
    ? getTeamInningsData(featuredLiveMatch.innings, featuredLiveMatch.team_a?.id)
    : { score: '0/0', overs: '0.0 ov' }

  const featuredTeamBInfo = featuredLiveMatch
    ? getTeamInningsData(featuredLiveMatch.innings, featuredLiveMatch.team_b?.id)
    : { score: '0/0', overs: '0.0 ov' }

  return (
    <div className="space-y-6">
      {/* 1. CRICBUZZ MATCH TICKER STRIP (Horizontal Carousel) */}
      {tickerMatches.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse inline-block" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Matches & Scores Ticker
              </h3>
            </div>
            <Link to="/matches" className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5">
              All Matches <ChevronRight className="size-3" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
            {tickerMatches.map((m) => {
              const isLive = m.status === 'live'
              const isCompleted = m.status === 'completed'
              const teamA = m.team_a
              const teamB = m.team_b
              const scoreAData = getTeamInningsData(m.innings, teamA?.id)
              const scoreBData = getTeamInningsData(m.innings, teamB?.id)

              return (
                <Link
                  key={m.id}
                  to={`/matches/${m.id}`}
                  className="min-w-[260px] sm:min-w-[290px] snap-start shrink-0 block group"
                >
                  <Card className="hover:border-emerald-600/60 hover:shadow-md transition-all border-border/80 bg-card">
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-muted-foreground truncate max-w-[150px]">
                          {m.tournament?.name || `${m.format} Match`}
                        </span>
                        {isLive ? (
                          <Badge className="bg-red-500/15 text-red-600 border-0 text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-red-600 animate-pulse inline-block" />
                            LIVE
                          </Badge>
                        ) : isCompleted ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            RESULT
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                            UPCOMING
                          </Badge>
                        )}
                      </div>

                      {/* Team Scores */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate max-w-[130px]">
                            {teamA?.team_name || 'Team A'}
                          </span>
                          <span className="font-mono font-bold tabular-nums text-foreground">
                            {scoreAData.score} ({scoreAData.overs})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate max-w-[130px]">
                            {teamB?.team_name || 'Team B'}
                          </span>
                          <span className="font-mono font-bold tabular-nums text-foreground">
                            {scoreBData.score} ({scoreBData.overs})
                          </span>
                        </div>
                      </div>

                      <Separator className="my-1.5" />

                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                        {isLive
                          ? `Live match in progress`
                          : isCompleted
                          ? `${m.winner_id === teamA?.id ? teamA?.team_name : teamB?.team_name || 'Match'} completed`
                          : `${m.overs} Overs · Scheduled`}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* 2. HERO / CRICBUZZ FEATURED MATCH CARD */}
      {featuredLiveMatch ? (
        <Card className="border-2 border-emerald-600/30 overflow-hidden shadow-lg bg-gradient-to-b from-card via-card to-emerald-950/[0.02]">
          {/* Header Strip */}
          <div className="bg-emerald-700 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide">
                {featuredLiveMatch.tournament?.name || 'Featured Cricket Match'}
              </span>
              <span className="text-emerald-200 text-xs">·</span>
              <span className="text-emerald-100 text-xs">{featuredLiveMatch.format} ({featuredLiveMatch.overs} ov)</span>
            </div>
            <div className="flex items-center gap-2">
              {featuredLiveMatch.status === 'live' ? (
                <Badge className="bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-sm">
                  <span className="size-1.5 rounded-full bg-red-600 animate-ping inline-block" />
                  LIVE NOW
                </Badge>
              ) : (
                <Badge className="bg-emerald-900/60 text-white border-emerald-400/40 text-xs">
                  {featuredLiveMatch.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          <CardContent className="p-5 sm:p-7 space-y-6">
            {/* Split Score Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Team A */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border/50">
                <div className="space-y-1">
                  <h4 className="font-bold text-lg text-foreground">{featuredLiveMatch.team_a?.team_name || 'Team A'}</h4>
                  <p className="text-xs text-muted-foreground">{featuredLiveMatch.overs} Overs Match</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl sm:text-4xl font-extrabold tabular-nums font-mono text-foreground">
                    {featuredTeamAInfo.score}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {featuredTeamAInfo.overs}
                  </p>
                </div>
              </div>

              {/* Team B */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border/50">
                <div className="space-y-1">
                  <h4 className="font-bold text-lg text-foreground">{featuredLiveMatch.team_b?.team_name || 'Team B'}</h4>
                  <p className="text-xs text-muted-foreground">{featuredLiveMatch.overs} Overs Match</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl sm:text-4xl font-extrabold tabular-nums font-mono text-foreground">
                    {featuredTeamBInfo.score}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {featuredTeamBInfo.overs}
                  </p>
                </div>
              </div>
            </div>

            {/* Run Rate & Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-4 text-xs">
                {featuredLiveMatch.venue && (
                  <span className="text-muted-foreground font-medium">📍 {featuredLiveMatch.venue}</span>
                )}
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Ball-by-Ball Live Scoring Engine Active
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link to={`/matches/${featuredLiveMatch.id}`} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-1.5">
                    Open Full Match Center <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Welcome banner if no match */
        <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-8 text-white relative overflow-hidden shadow-lg">
          <div className="relative z-10 max-w-xl space-y-3">
            <Badge className="bg-emerald-900/60 text-white border-emerald-400/40 text-xs">
              Cricket Tournament Platform
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {profile ? `Welcome back, ${profile.name}` : 'Welcome to Cricket Hub'}
            </h1>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Create tournaments, manage teams, ball-by-ball live scoring, wagon wheel analytics, and player statistics.
            </p>
            {profile?.role === 'organizer' && (
              <div className="pt-2 flex gap-3">
                <Link to="/tournaments/new">
                  <Button className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold gap-1.5">
                    <Zap className="size-4" /> New Tournament
                  </Button>
                </Link>
                <Link to="/tournaments">
                  <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20">
                    My Tournaments
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. QUICK STATS TILES (Cricbuzz metrics ribbon) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tournaments', value: stats.tournaments, icon: Trophy, to: '/tournaments', color: 'text-emerald-600' },
          { label: 'Matches', value: stats.matches, icon: Calendar, to: '/matches', color: 'text-blue-600' },
          { label: 'Teams', value: stats.teams, icon: Users, to: '/tournaments', color: 'text-purple-600' },
          { label: 'Player Stats', value: stats.players, icon: Activity, to: '/stats', color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, to, color }) => (
          <Link
            key={label}
            to={to}
            className="block rounded-xl border bg-card text-card-foreground shadow-xs hover:shadow-md hover:border-emerald-600/40 transition-all duration-200 p-4"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <Icon className={cn('size-4', color)} />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{value}</p>
          </Link>
        ))}
      </div>

      {/* 4. CRICBUZZ TWO-COLUMN MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Tournaments & Matches (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active / Recent Tournaments */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-emerald-600" />
                <h2 className="text-lg font-bold tracking-tight">Active Tournaments</h2>
              </div>
              <Link to="/tournaments" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                View All <ChevronRight className="size-3" />
              </Link>
            </div>

            {recentTournaments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {recentTournaments.map((t) => (
                  <Link key={t.id} to={`/tournaments/${t.id}`} className="group">
                    <Card className="hover:border-emerald-600/50 hover:shadow-md transition-all h-full border-border/80 flex flex-col justify-between">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">
                              {t.name}
                            </h3>
                            {t.venue && (
                              <p className="text-xs text-muted-foreground mt-0.5">📍 {t.venue}</p>
                            )}
                          </div>
                          <Badge
                            className={cn(
                              'text-[10px] capitalize shrink-0',
                              t.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {t.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
                          <span className="font-medium">{t.format} · {t.overs} ov</span>
                          <span className="text-[11px] truncate max-w-[120px]">
                            by {(t as any).organizer?.name || 'Organizer'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center space-y-2">
                  <Trophy className="size-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">No tournaments found</p>
                  {profile?.role === 'organizer' && (
                    <Link to="/tournaments/new" className="inline-block pt-1">
                      <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                        Create Tournament
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Recent Match Schedule & Results */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-emerald-600" />
                <h2 className="text-lg font-bold tracking-tight">Recent Matches & Results</h2>
              </div>
              <Link to="/matches" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                Full Schedule <ChevronRight className="size-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentMatches.slice(0, 5).map((m) => {
                const teamA = m.team_a
                const teamB = m.team_b
                const scoreAData = getTeamInningsData(m.innings, teamA?.id)
                const scoreBData = getTeamInningsData(m.innings, teamB?.id)

                return (
                  <Link key={m.id} to={`/matches/${m.id}`} className="block group">
                    <Card className="hover:border-emerald-600/40 hover:shadow-xs transition-all border-border/70 bg-card">
                      <CardContent className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{m.tournament?.name || 'Tournament'}</span>
                            <span>·</span>
                            <span>{m.format} ({m.overs} ov)</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm font-semibold">
                            <span className="truncate max-w-[140px]">{teamA?.team_name || 'Team A'}</span>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <span className="truncate max-w-[140px]">{teamB?.team_name || 'Team B'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0">
                          <div className="text-right font-mono text-xs">
                            <p className="font-bold tabular-nums">
                              {scoreAData.score} vs {scoreBData.score}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {m.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Cricbuzz Leaderboards & Tools (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Cricbuzz Leaderboard: Top Batsmen */}
          <Card className="border-border/80">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flame className="size-4 text-amber-500" /> Leading Run Scorers
                </span>
                <Link to="/stats" className="text-[11px] text-primary hover:underline font-normal">
                  View All
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {topBatsmen.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {topBatsmen.map((b, idx) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-muted-foreground w-3 text-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{b.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{b.teamName}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                          {b.runs} <span className="text-[10px] font-sans font-normal text-muted-foreground">runs</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">SR: {b.strikeRate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No player stats recorded yet</p>
              )}
            </CardContent>
          </Card>

          {/* Cricbuzz Leaderboard: Top Bowlers */}
          <Card className="border-border/80">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="size-4 text-purple-500" /> Leading Wicket Takers
                </span>
                <Link to="/stats" className="text-[11px] text-primary hover:underline font-normal">
                  View All
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {topBowlers.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {topBowlers.map((bw, idx) => (
                    <div key={bw.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-muted-foreground w-3 text-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{bw.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{bw.teamName}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-purple-700 dark:text-purple-400 text-sm">
                          {bw.wickets} <span className="text-[10px] font-sans font-normal text-muted-foreground">wkts</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">Econ: {bw.economy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No bowling stats recorded yet</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Organizer Tools */}
          <Card className="bg-muted/30 border-dashed border-border">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Tournament Quick Actions
              </h4>
              <div className="space-y-2">
                <Link to="/tournaments/new" className="block">
                  <Button size="sm" className="w-full justify-start gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs">
                    <Zap className="size-3.5 text-amber-300" /> Create New Tournament
                  </Button>
                </Link>
                <Link to="/matches" className="block">
                  <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-xs">
                    <Radio className="size-3.5 text-emerald-600" /> Live Match Scorekeeper
                  </Button>
                </Link>
                <Link to="/stats" className="block">
                  <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-xs">
                    <TrendingUp className="size-3.5 text-blue-600" /> Career Records & Leaderboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
