import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Match, Tournament, Innings } from '@/lib/types'
import {
  ChevronRight,
  ArrowRight,
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
    <div className="space-y-7 font-sans">
      {/* 1. MATCH TICKER STRIP (Horizontal Carousel) */}
      {tickerMatches.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#8C6D2D] animate-pulse inline-block" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                Fixtures & Live Score Ticker
              </h3>
            </div>
            <Link to="/matches" className="text-xs text-[#8C6D2D] hover:underline font-semibold flex items-center gap-0.5">
              All Matches <ChevronRight className="size-3" />
            </Link>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
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
                  className="min-w-[270px] sm:min-w-[290px] snap-start shrink-0 block group"
                >
                  <div className="rounded-2xl club-card border border-stone-200/80 hover:border-[#8C6D2D]/40 club-card-hover p-4 space-y-2.5 transition-all bg-white shadow-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-stone-500 truncate max-w-[160px]">
                        {m.tournament?.name || `${m.format} Match`}
                      </span>
                      {isLive ? (
                        <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 flex items-center gap-1 rounded-full">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          LIVE
                        </Badge>
                      ) : isCompleted ? (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-700 border-stone-200 rounded-full">
                          RESULT
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-stone-500 border-stone-200 rounded-full">
                          SCHEDULED
                        </Badge>
                      )}
                    </div>

                    {/* Team Scores */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-900 truncate max-w-[140px]">
                          {teamA?.team_name || 'Team A'}
                        </span>
                        <span className="font-mono font-medium tabular-nums text-stone-800">
                          {scoreAData.score} <span className="text-[10px] text-stone-500 font-normal">({scoreAData.overs})</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-900 truncate max-w-[140px]">
                          {teamB?.team_name || 'Team B'}
                        </span>
                        <span className="font-mono font-medium tabular-nums text-stone-800">
                          {scoreBData.score} <span className="text-[10px] text-stone-500 font-normal">({scoreBData.overs})</span>
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-2 flex items-center justify-between">
                      <p className="text-[11px] text-[#8C6D2D] font-medium truncate">
                        {isLive
                          ? `Live match in progress`
                          : isCompleted
                          ? `${m.winner_id === teamA?.id ? teamA?.team_name : teamB?.team_name || 'Match'} won`
                          : `${m.overs} Overs Match`}
                      </p>
                      <ChevronRight className="size-3 text-stone-400 group-hover:text-stone-700 transition-colors" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* 2. FEATURED LIVE MATCH SPOTLIGHT */}
      {featuredLiveMatch ? (
        <div className="rounded-3xl club-card border border-stone-200/80 bg-white overflow-hidden shadow-sm relative">
          {/* Header Strip */}
          <div className="bg-stone-50/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/70">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-sm tracking-wide text-stone-900">
                {featuredLiveMatch.tournament?.name || 'Featured Championship Match'}
              </span>
              <span className="text-stone-300 text-xs">·</span>
              <span className="text-[#8C6D2D] text-xs font-semibold">{featuredLiveMatch.format} ({featuredLiveMatch.overs} ov)</span>
            </div>
            <div className="flex items-center gap-2">
              {featuredLiveMatch.status === 'live' ? (
                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-xs flex items-center gap-1.5 shadow-xs px-3 py-1 rounded-full">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  LIVE NOW
                </Badge>
              ) : (
                <Badge className="bg-stone-100 text-stone-700 border-stone-200 text-xs px-3 py-1 rounded-full">
                  {featuredLiveMatch.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Split Score Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Team A */}
              <div className="flex items-center justify-between p-5 rounded-2xl bg-stone-50 border border-stone-200/80">
                <div className="space-y-1">
                  <h4 className="font-semibold text-lg text-stone-900">{featuredLiveMatch.team_a?.team_name || 'Team A'}</h4>
                  <p className="text-xs text-stone-500">{featuredLiveMatch.overs} Overs Match</p>
                </div>
                <div className="text-right">
                  <p className="font-editorial text-3xl sm:text-4xl font-normal tabular-nums text-stone-900">
                    {featuredTeamAInfo.score}
                  </p>
                  <p className="text-xs text-stone-500 font-mono">
                    {featuredTeamAInfo.overs}
                  </p>
                </div>
              </div>

              {/* Team B */}
              <div className="flex items-center justify-between p-5 rounded-2xl bg-[#FDFBF7] border border-[#8C6D2D]/25">
                <div className="space-y-1">
                  <h4 className="font-semibold text-lg text-stone-900">{featuredLiveMatch.team_b?.team_name || 'Team B'}</h4>
                  <p className="text-xs text-[#8C6D2D] font-medium">{featuredLiveMatch.overs} Overs Match</p>
                </div>
                <div className="text-right">
                  <p className="font-editorial text-3xl sm:text-4xl font-normal tabular-nums text-[#8C6D2D]">
                    {featuredTeamBInfo.score}
                  </p>
                  <p className="text-xs text-stone-500 font-mono">
                    {featuredTeamBInfo.overs}
                  </p>
                </div>
              </div>
            </div>

            {/* Run Rate & Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-100">
              <div className="flex items-center gap-4 text-xs">
                {featuredLiveMatch.venue && (
                  <span className="text-stone-500 font-normal">{featuredLiveMatch.venue}</span>
                )}
                <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Sub-Second Live Scoring Sync Active
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link to={`/matches/${featuredLiveMatch.id}`} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto font-medium bg-stone-900 hover:bg-stone-800 text-white rounded-full gap-1.5 py-4 px-6 text-xs transition-all shadow-xs">
                    Open Full Match Center <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Welcome banner if no match */
        <div className="rounded-3xl club-card p-8 text-stone-900 relative overflow-hidden border border-stone-200/80 bg-white shadow-xs">
          <div className="relative z-10 max-w-xl space-y-3">
            <Badge className="bg-stone-100 text-[#8C6D2D] border border-[#8C6D2D]/25 text-[10px] uppercase tracking-widest rounded-full font-semibold">
              Cricket Arena
            </Badge>
            <h1 className="text-3xl font-normal tracking-tight text-stone-900">
              {profile ? `Welcome, ${profile.name}` : 'Welcome to Cricket Hub'}
            </h1>
            <p className="text-stone-600 text-sm leading-relaxed">
              Create official tournaments, roster teams, track ball-by-ball scoring, and view player career statistics.
            </p>
            {profile?.role === 'organizer' && (
              <div className="pt-2 flex gap-3">
                <Link to="/tournaments/new">
                  <Button className="club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-xs rounded-full px-5 py-2">
                    New Tournament
                  </Button>
                </Link>
                <Link to="/tournaments">
                  <Button variant="outline" className="border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs rounded-full px-5 py-2">
                    My Tournaments
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. QUICK METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tournaments', value: stats.tournaments, to: '/tournaments', color: 'text-[#8C6D2D]' },
          { label: 'Matches Scored', value: stats.matches, to: '/matches', color: 'text-stone-800' },
          { label: 'Registered Teams', value: stats.teams, to: '/tournaments', color: 'text-emerald-700' },
          { label: 'Player Analytics', value: stats.players, to: '/stats', color: 'text-[#8C6D2D]' },
        ].map(({ label, value, to, color }) => (
          <Link
            key={label}
            to={to}
            className="block rounded-2xl club-card border border-stone-200/80 bg-white club-card-hover p-5 group transition-all shadow-xs"
          >
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-widest mb-2">{label}</p>
            <p className={cn('font-editorial text-2xl sm:text-3xl font-normal tracking-tight group-hover:text-[#8C6D2D] transition-colors', color)}>
              {value}
            </p>
          </Link>
        ))}
      </div>

      {/* 4. MAIN TWO-COLUMN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Tournaments & Matches (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Active / Recent Tournaments */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-normal tracking-tight text-stone-900">Active <span className="font-editorial italic text-[#8C6D2D]">Tournaments</span></h2>
              <Link to="/tournaments" className="text-xs text-[#8C6D2D] font-semibold hover:underline flex items-center gap-0.5">
                View All <ChevronRight className="size-3" />
              </Link>
            </div>

            {recentTournaments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentTournaments.map((t) => (
                  <Link key={t.id} to={`/tournaments/${t.id}`} className="group">
                    <div className="rounded-3xl club-card border border-stone-200/80 hover:border-[#8C6D2D]/40 club-card-hover p-5 space-y-4 h-full flex flex-col justify-between transition-all bg-white shadow-xs">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-base text-stone-900 group-hover:text-[#8C6D2D] transition-colors">
                            {t.name}
                          </h3>
                          <Badge
                            className={cn(
                              'text-[10px] capitalize shrink-0 font-medium rounded-full px-2.5 py-0.5',
                              t.status === 'active'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-stone-100 text-stone-700 border-stone-200'
                            )}
                          >
                            {t.status}
                          </Badge>
                        </div>
                        {t.venue && (
                          <p className="text-xs text-stone-500">{t.venue}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-stone-500 border-t border-stone-100 pt-3">
                        <span className="font-medium text-stone-700">{t.format} · {t.overs} ov</span>
                        <span className="text-[11px] truncate max-w-[130px]">
                          by {(t as any).organizer?.name || 'Organizer'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl club-card p-10 text-center space-y-3 border border-stone-200/80 bg-white">
                <p className="text-xs text-stone-500">No active tournaments found</p>
                {profile?.role === 'organizer' && (
                  <Link to="/tournaments/new" className="inline-block pt-1">
                    <Button size="sm" className="club-gold-gradient text-[#122217] font-bold text-xs rounded-full px-4">
                      Create Tournament
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Recent Match Schedule & Results */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-normal tracking-tight text-stone-900">Recent Matches & <span className="font-editorial italic text-[#8C6D2D]">Results</span></h2>
              <Link to="/matches" className="text-xs text-[#8C6D2D] font-semibold hover:underline flex items-center gap-0.5">
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
                    <div className="rounded-2xl club-card border border-stone-200/80 hover:border-[#8C6D2D]/40 club-card-hover p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all bg-white shadow-xs">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <span className="font-medium text-stone-800">{m.tournament?.name || 'Tournament'}</span>
                          <span>·</span>
                          <span>{m.format} ({m.overs} ov)</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold text-stone-900">
                          <span className="truncate max-w-[150px]">{teamA?.team_name || 'Team A'}</span>
                          <span className="text-xs text-stone-400 font-normal">vs</span>
                          <span className="truncate max-w-[150px]">{teamB?.team_name || 'Team B'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0">
                        <div className="text-right font-mono text-xs">
                          <p className="font-semibold text-stone-800 tabular-nums">
                            {scoreAData.score} vs {scoreBData.score}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize border-stone-200 text-stone-700 bg-stone-50 rounded-full px-2.5 py-0.5">
                          {m.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Leaderboards & Tools (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Batsmen */}
          <div className="rounded-3xl club-card border border-stone-200/80 p-5 space-y-4 bg-white shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-medium text-sm text-stone-900">
                Leading Run Scorers
              </span>
              <Link to="/stats" className="text-xs text-[#8C6D2D] hover:underline font-semibold">
                View All
              </Link>
            </div>
            <div>
              {topBatsmen.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {topBatsmen.map((b, idx) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-medium text-stone-400 w-4 text-center">
                          {idx === 0 ? <span className="text-[#8C6D2D] font-bold">1</span> : idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 truncate">{b.name}</p>
                          <p className="text-[10px] text-stone-500 truncate">{b.teamName}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-editorial text-sm font-normal text-stone-900">
                          {b.runs} <span className="text-[10px] text-stone-500 font-sans">runs</span>
                        </p>
                        <p className="text-[10px] text-stone-500 font-mono">SR: {b.strikeRate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-4 text-center">No player stats recorded yet</p>
              )}
            </div>
          </div>

          {/* Top Bowlers */}
          <div className="rounded-3xl club-card border border-stone-200/80 p-5 space-y-4 bg-white shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="font-medium text-sm text-stone-900">
                Leading Wicket Takers
              </span>
              <Link to="/stats" className="text-xs text-emerald-700 hover:underline font-semibold">
                View All
              </Link>
            </div>
            <div>
              {topBowlers.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {topBowlers.map((bw, idx) => (
                    <div key={bw.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-medium text-stone-400 w-4 text-center">
                          {idx === 0 ? <span className="text-emerald-700 font-bold">1</span> : idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 truncate">{bw.name}</p>
                          <p className="text-[10px] text-stone-500 truncate">{bw.teamName}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-editorial text-sm font-normal text-stone-900">
                          {bw.wickets} <span className="text-[10px] text-stone-500 font-sans">wkts</span>
                        </p>
                        <p className="text-[10px] text-stone-500 font-mono">Econ: {bw.economy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-4 text-center">No bowling stats recorded yet</p>
              )}
            </div>
          </div>

          {/* Quick Organizer Tools */}
          <div className="rounded-3xl club-card border border-stone-200/80 p-5 space-y-3.5 bg-white shadow-xs">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              Tournament Actions
            </h4>
            <div className="space-y-2">
              <Link to="/tournaments/new" className="block">
                <Button size="sm" className="w-full justify-start club-gold-gradient hover:brightness-105 text-[#142318] font-bold text-xs rounded-full h-10 shadow-xs border-0 px-4">
                  Create New Tournament
                </Button>
              </Link>
              <Link to="/matches" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start text-xs rounded-full h-10 border-stone-200 bg-white hover:bg-stone-50 text-stone-800 font-medium px-4">
                  Live Match Scorekeeper
                </Button>
              </Link>
              <Link to="/stats" className="block">
                <Button size="sm" variant="outline" className="w-full justify-start text-xs rounded-full h-10 border-stone-200 bg-white hover:bg-stone-50 text-stone-800 font-medium px-4">
                  Career Records & Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
