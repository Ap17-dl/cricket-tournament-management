import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Medal, Search, TrendingUp, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerStats, Player, Tournament } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StatsWithPlayer extends PlayerStats {
  player: Player & { team: { team_name: string } }
}

export function StatsPage() {
  const [stats, setStats] = useState<StatsWithPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const [tournamentsLoading, setTournamentsLoading] = useState(true)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    setTournamentsLoading(true)
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
    if (data && data.length > 0) {
      setTournaments(data as Tournament[])
      setSelectedTournamentId(data[0].id)
    } else {
      setTournamentsLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTournamentId) {
      fetchStats(selectedTournamentId)
    }
  }, [selectedTournamentId])

  const fetchStats = async (tournamentId: string) => {
    setLoading(true)

    
    const { data: matches } = await supabase
      .from('matches')
      .select('id, status')
      .eq('tournament_id', tournamentId)

    if (!matches || matches.length === 0) {
      setStats([])
      setLoading(false)
      setTournamentsLoading(false)
      return
    }

    const matchIds = matches.map((m) => m.id)

    
    const { data: inningsData } = await supabase
      .from('innings')
      .select('*, ball_events(*)')
      .in('match_id', matchIds)

    if (!inningsData || inningsData.length === 0) {
      setStats([])
      setLoading(false)
      setTournamentsLoading(false)
      return
    }

    
    const playerMap: Record<string, {
      runs: number; balls_faced: number; fours: number; sixes: number;
      wickets: number; overs_balls: number; runs_conceded: number; maidens: number;
      highest_score: number; matchIds: Set<string>;
    }> = {}

    const ensurePlayer = (pid: string) => {
      if (!playerMap[pid]) {
        playerMap[pid] = {
          runs: 0, balls_faced: 0, fours: 0, sixes: 0,
          wickets: 0, overs_balls: 0, runs_conceded: 0, maidens: 0,
          highest_score: 0, matchIds: new Set(),
        }
      }
    }

    for (const inn of inningsData) {
      const balls = inn.ball_events || []
      const batsmanInningsRuns: Record<string, number> = {}
      const bowlerOverRuns: Record<string, Record<number, number>> = {}

      for (const b of balls) {
        if (b.batsman_id) {
          ensurePlayer(b.batsman_id)
          const bat = playerMap[b.batsman_id]
          bat.matchIds.add(inn.match_id)
          if (b.extra_type !== 'wide') bat.balls_faced++
          if (!b.extra_type || b.extra_type === 'no_ball') {
            bat.runs += b.runs
            if (!batsmanInningsRuns[b.batsman_id]) batsmanInningsRuns[b.batsman_id] = 0
            batsmanInningsRuns[b.batsman_id] += b.runs
            if (b.runs === 4) bat.fours++
            if (b.runs === 6) bat.sixes++
          }
        }

        if (b.bowler_id) {
          ensurePlayer(b.bowler_id)
          const bowl = playerMap[b.bowler_id]
          bowl.matchIds.add(inn.match_id)
          if (!b.extra_type || b.extra_type === 'bye' || b.extra_type === 'leg_bye') {
            bowl.overs_balls++
          }
          const conceded = (b.extra_type === 'bye' || b.extra_type === 'leg_bye')
            ? 0 : (b.runs + (b.extra_runs || 0))
          bowl.runs_conceded += conceded
          if (b.is_wicket && b.wicket_type !== 'run_out') bowl.wickets++

          if (!bowlerOverRuns[b.bowler_id]) bowlerOverRuns[b.bowler_id] = {}
          if (!bowlerOverRuns[b.bowler_id][b.over_number]) bowlerOverRuns[b.bowler_id][b.over_number] = 0
          bowlerOverRuns[b.bowler_id][b.over_number] += conceded
        }
      }

      
      for (const [bowlerId, overs] of Object.entries(bowlerOverRuns)) {
        ensurePlayer(bowlerId)
        for (const runs of Object.values(overs)) {
          if (runs === 0) playerMap[bowlerId].maidens++
        }
      }

      
      for (const [pid, runs] of Object.entries(batsmanInningsRuns)) {
        if (playerMap[pid]) {
          playerMap[pid].highest_score = Math.max(playerMap[pid].highest_score, runs)
        }
      }
    }

    
    const playerIds = Object.keys(playerMap)
    if (playerIds.length === 0) {
      setStats([])
      setLoading(false)
      setTournamentsLoading(false)
      return
    }

    const { data: playersData } = await supabase
      .from('players')
      .select('*, team:teams(team_name)')
      .in('id', playerIds)

    const playersById: Record<string, any> = {}
    if (playersData) playersData.forEach((p) => { playersById[p.id] = p })

    
    const computed: StatsWithPlayer[] = playerIds
      .filter((pid) => playersById[pid])
      .map((pid) => {
        const s = playerMap[pid]
        const oversFloat = Math.floor(s.overs_balls / 6) + (s.overs_balls % 6) / 10
        return {
          id: pid,
          player_id: pid,
          tournament_id: tournamentId,
          matches_played: s.matchIds.size,
          runs: s.runs,
          balls_faced: s.balls_faced,
          fours: s.fours,
          sixes: s.sixes,
          fifties: 0,
          centuries: 0,
          highest_score: s.highest_score,
          wickets: s.wickets,
          overs_bowled: oversFloat,
          runs_conceded: s.runs_conceded,
          maidens: s.maidens,
          player: playersById[pid],
        } as StatsWithPlayer
      })

    setStats(computed)
    setLoading(false)
    setTournamentsLoading(false)
  }

  const searchFilter = (s: StatsWithPlayer) =>
    s.player?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.player?.team?.team_name?.toLowerCase().includes(search.toLowerCase())

  const filtered = stats.filter(searchFilter)

  const topBatsmen = [...filtered].sort((a, b) => b.runs - a.runs).slice(0, 20)
  const topBowlers = [...filtered].sort((a, b) => b.wickets - a.wickets).slice(0, 20)
  const topSR = [...filtered].filter((s) => s.balls_faced >= 10).sort((a, b) => (b.runs / b.balls_faced) - (a.runs / a.balls_faced)).slice(0, 20)

  const sr = (runs: number, balls: number) => balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0'
  const eco = (runs: number, overs: number) => overs > 0 ? (runs / overs).toFixed(2) : '0.00'
  const avg = (runs: number, matches: number) => matches > 0 ? (runs / matches).toFixed(1) : '0.0'

  if (tournamentsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Player Statistics</h1>
          <p className="text-muted-foreground text-sm mt-1">Leaderboards, batting, bowling & fielding stats</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-16 rounded-xl bg-muted" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (tournaments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Player Statistics</h1>
          <p className="text-muted-foreground text-sm mt-1">Leaderboards, batting, bowling & fielding stats</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="size-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold mb-1 text-lg">No tournaments yet</h3>
            <p className="text-sm text-muted-foreground">Stats will appear once tournaments are created and matches are played.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-stone-100">
            Player Honors & <span className="font-editorial italic text-[#C5A059]">Statistics</span>
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1">Leaderboards, Orange/Purple caps, strike rates & career bowling records</p>
        </div>
        <div className="w-full md:w-72">
          <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
            <SelectTrigger className="w-full bg-white/[0.04] border-white/[0.08] text-stone-100 rounded-full h-11 text-xs sm:text-sm font-medium">
              <SelectValue placeholder="Select tournament" />
            </SelectTrigger>
            <SelectContent className="bg-[#0C1A13] border-white/[0.1] text-stone-200 rounded-2xl">
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs cursor-pointer rounded-xl">
                  {t.name}{t.venue ? ` — ${t.venue}` : ''} ({t.format})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leaderboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Orange Cap */}
        <div className="rounded-3xl club-card border border-white/[0.08] hover:border-[#C5A059]/40 club-card-hover p-6 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#C5A059]">
                <Medal className="size-4" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">Orange Cap</span>
            </div>
            <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.04] text-[#C5A059] border border-[#C5A059]/30">
              Top Scorer
            </span>
          </div>
          {topBatsmen[0] ? (
            <div className="space-y-1">
              <p className="font-semibold text-lg text-stone-100 truncate">{topBatsmen[0].player?.name}</p>
              <p className="text-xs text-stone-400 truncate">{topBatsmen[0].player?.team?.team_name}</p>
              <div className="pt-2 flex items-baseline gap-2">
                <span className="font-editorial text-3xl sm:text-4xl font-normal text-[#C5A059] tabular-nums">
                  {topBatsmen[0].runs}
                </span>
                <span className="text-xs text-stone-400 font-medium">runs in tournament</span>
              </div>
            </div>
          ) : <p className="text-stone-500 text-xs py-2">No stats recorded yet</p>}
        </div>

        {/* Purple Cap */}
        <div className="rounded-3xl club-card border border-white/[0.08] hover:border-[#C5A059]/40 club-card-hover p-6 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-emerald-400">
                <Medal className="size-4" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Purple Cap</span>
            </div>
            <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.04] text-emerald-300 border border-emerald-700/40">
              Top Bowler
            </span>
          </div>
          {topBowlers[0] ? (
            <div className="space-y-1">
              <p className="font-semibold text-lg text-stone-100 truncate">{topBowlers[0].player?.name}</p>
              <p className="text-xs text-stone-400 truncate">{topBowlers[0].player?.team?.team_name}</p>
              <div className="pt-2 flex items-baseline gap-2">
                <span className="font-editorial text-3xl sm:text-4xl font-normal text-emerald-300 tabular-nums">
                  {topBowlers[0].wickets}
                </span>
                <span className="text-xs text-stone-400 font-medium">wickets taken</span>
              </div>
            </div>
          ) : <p className="text-stone-500 text-xs py-2">No stats recorded yet</p>}
        </div>

        {/* Best Strike Rate */}
        <div className="rounded-3xl club-card border border-white/[0.08] hover:border-[#C5A059]/40 club-card-hover p-6 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-stone-200">
                <TrendingUp className="size-4" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-300">Strike Master</span>
            </div>
            <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.04] text-stone-300 border border-white/[0.1]">
              Best SR (10b+)
            </span>
          </div>
          {topSR[0] ? (
            <div className="space-y-1">
              <p className="font-semibold text-lg text-stone-100 truncate">{topSR[0].player?.name}</p>
              <p className="text-xs text-stone-400 truncate">{topSR[0].player?.team?.team_name}</p>
              <div className="pt-2 flex items-baseline gap-2">
                <span className="font-editorial text-3xl sm:text-4xl font-normal text-stone-100 tabular-nums">
                  {sr(topSR[0].runs, topSR[0].balls_faced)}
                </span>
                <span className="text-xs text-stone-400 font-medium">strike rate</span>
              </div>
            </div>
          ) : <p className="text-stone-500 text-xs py-2">No stats recorded yet</p>}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
        <Input
          className="pl-11 h-11 bg-white/[0.03] border-white/[0.08] text-stone-100 placeholder:text-stone-500 rounded-full text-xs sm:text-sm focus:border-[#C5A059]/50"
          placeholder="Search player or team name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06]" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="batting">
          <TabsList className="bg-white/[0.03] border border-white/[0.08] p-1 rounded-full h-11">
            <TabsTrigger
              value="batting"
              className="data-[state=active]:club-gold-gradient data-[state=active]:text-[#122217] font-semibold text-xs rounded-full px-5 transition-all"
            >
              Batting Leaderboard
            </TabsTrigger>
            <TabsTrigger
              value="bowling"
              className="data-[state=active]:club-gold-gradient data-[state=active]:text-[#122217] font-semibold text-xs rounded-full px-5 transition-all"
            >
              Bowling Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batting" className="mt-4">
            <div className="rounded-3xl club-card border border-white/[0.08] overflow-hidden overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                  <tr>
                    <th className="text-left p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">#</th>
                    <th className="text-left p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Player</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">M</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Runs</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Avg</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">SR</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">HS</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">50s</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">100s</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">4s</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">6s</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {topBatsmen.map((s, i) => (
                    <tr key={s.id} className={cn('hover:bg-white/[0.02] transition-colors', i === 0 && 'bg-[#C5A059]/5')}>
                      <td className="p-3.5 text-stone-400 font-medium">
                        {i === 0 ? <span className="text-[#C5A059] font-bold">1</span> : i + 1}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-stone-100">{s.player?.name}</p>
                        <p className="text-[11px] text-stone-400">{s.player?.team?.team_name}</p>
                      </td>
                      <td className="p-3.5 text-center tabular-nums text-stone-400 font-mono">{s.matches_played}</td>
                      <td className="p-3.5 text-center tabular-nums font-semibold text-[#C5A059] font-mono">{s.runs}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{avg(s.runs, s.matches_played)}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{sr(s.runs, s.balls_faced)}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{s.highest_score}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{s.fifties}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{s.centuries}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{s.fours}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{s.sixes}</td>
                    </tr>
                  ))}
                  {topBatsmen.length === 0 && (
                    <tr><td colSpan={11} className="p-8 text-center text-stone-500">No batting stats yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="bowling" className="mt-4">
            <div className="rounded-3xl club-card border border-white/[0.08] overflow-hidden overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                  <tr>
                    <th className="text-left p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">#</th>
                    <th className="text-left p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Player</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">M</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Wkts</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Overs</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Runs</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Eco</th>
                    <th className="text-center p-3.5 font-semibold text-[11px] text-stone-400 uppercase tracking-wider">Maidens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {topBowlers.map((s, i) => (
                    <tr key={s.id} className={cn('hover:bg-white/[0.02] transition-colors', i === 0 && 'bg-emerald-950/20')}>
                      <td className="p-3.5 text-stone-400 font-medium">
                        {i === 0 ? <span className="text-emerald-400 font-bold">1</span> : i + 1}
                      </td>
                      <td className="p-3.5">
                        <p className="font-semibold text-stone-100">{s.player?.name}</p>
                        <p className="text-[11px] text-stone-400">{s.player?.team?.team_name}</p>
                      </td>
                      <td className="p-3.5 text-center tabular-nums text-stone-400 font-mono">{s.matches_played}</td>
                      <td className="p-3.5 text-center tabular-nums font-semibold text-emerald-400 font-mono">{s.wickets}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{Number(s.overs_bowled).toFixed(1)}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{s.runs_conceded}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{eco(s.runs_conceded, Number(s.overs_bowled))}</td>
                      <td className="p-3.5 text-center tabular-nums font-mono text-stone-300">{s.maidens}</td>
                    </tr>
                  ))}
                  {topBowlers.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-stone-500">No bowling stats yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
