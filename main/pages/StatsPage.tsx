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

    // Compute stats directly from ball_events for all matches in this tournament
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

    // Fetch all innings + ball events for these matches
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

    // Aggregate stats per player
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

      // Maidens
      for (const [bowlerId, overs] of Object.entries(bowlerOverRuns)) {
        ensurePlayer(bowlerId)
        for (const runs of Object.values(overs)) {
          if (runs === 0) playerMap[bowlerId].maidens++
        }
      }

      // Highest score per innings
      for (const [pid, runs] of Object.entries(batsmanInningsRuns)) {
        if (playerMap[pid]) {
          playerMap[pid].highest_score = Math.max(playerMap[pid].highest_score, runs)
        }
      }
    }

    // Fetch player details
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

    // Build the stats array
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Player Statistics</h1>
          <p className="text-muted-foreground text-sm mt-1">Leaderboards, batting, bowling & fielding stats</p>
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Select tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.venue ? ` — ${t.venue}` : ''} ({t.format})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leaderboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Medal className="size-4 text-yellow-500" />
              <span className="text-sm font-semibold">Orange Cap</span>
            </div>
            {topBatsmen[0] ? (
              <div>
                <p className="font-bold text-base">{topBatsmen[0].player?.name}</p>
                <p className="text-xs text-muted-foreground">{topBatsmen[0].player?.team?.team_name}</p>
                <p className="text-3xl font-black text-primary tabular-nums mt-1">{topBatsmen[0].runs}</p>
                <p className="text-xs text-muted-foreground">runs</p>
              </div>
            ) : <p className="text-muted-foreground text-sm">No data yet</p>}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Medal className="size-4 text-purple-500" />
              <span className="text-sm font-semibold">Purple Cap</span>
            </div>
            {topBowlers[0] ? (
              <div>
                <p className="font-bold text-base">{topBowlers[0].player?.name}</p>
                <p className="text-xs text-muted-foreground">{topBowlers[0].player?.team?.team_name}</p>
                <p className="text-3xl font-black text-cricket-wicket tabular-nums mt-1">{topBowlers[0].wickets}</p>
                <p className="text-xs text-muted-foreground">wickets</p>
              </div>
            ) : <p className="text-muted-foreground text-sm">No data yet</p>}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="size-4 text-green-500" />
              <span className="text-sm font-semibold">Best Strike Rate</span>
            </div>
            {topSR[0] ? (
              <div>
                <p className="font-bold text-base">{topSR[0].player?.name}</p>
                <p className="text-xs text-muted-foreground">{topSR[0].player?.team?.team_name}</p>
                <p className="text-3xl font-black text-green-600 tabular-nums mt-1">
                  {sr(topSR[0].runs, topSR[0].balls_faced)}
                </p>
                <p className="text-xs text-muted-foreground">SR</p>
              </div>
            ) : <p className="text-muted-foreground text-sm">No data yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search player or team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="batting">
          <TabsList>
            <TabsTrigger value="batting">Batting</TabsTrigger>
            <TabsTrigger value="bowling">Bowling</TabsTrigger>
          </TabsList>

          <TabsContent value="batting" className="mt-4">
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-xs">#</th>
                    <th className="text-left p-3 font-semibold text-xs">Player</th>
                    <th className="text-center p-3 font-semibold text-xs">M</th>
                    <th className="text-center p-3 font-semibold text-xs">Runs</th>
                    <th className="text-center p-3 font-semibold text-xs">Avg</th>
                    <th className="text-center p-3 font-semibold text-xs">SR</th>
                    <th className="text-center p-3 font-semibold text-xs">HS</th>
                    <th className="text-center p-3 font-semibold text-xs">50s</th>
                    <th className="text-center p-3 font-semibold text-xs">100s</th>
                    <th className="text-center p-3 font-semibold text-xs">4s</th>
                    <th className="text-center p-3 font-semibold text-xs">6s</th>
                  </tr>
                </thead>
                <tbody>
                  {topBatsmen.map((s, i) => (
                    <tr key={s.id} className={cn('border-t', i < 3 && 'bg-primary/5')}>
                      <td className="p-3 text-muted-foreground font-medium">{i + 1}</td>
                      <td className="p-3">
                        <p className="font-semibold">{s.player?.name}</p>
                        <p className="text-xs text-muted-foreground">{s.player?.team?.team_name}</p>
                      </td>
                      <td className="p-3 text-center tabular-nums text-muted-foreground">{s.matches_played}</td>
                      <td className="p-3 text-center tabular-nums font-bold text-primary">{s.runs}</td>
                      <td className="p-3 text-center tabular-nums">{avg(s.runs, s.matches_played)}</td>
                      <td className="p-3 text-center tabular-nums">{sr(s.runs, s.balls_faced)}</td>
                      <td className="p-3 text-center tabular-nums">{s.highest_score}</td>
                      <td className="p-3 text-center tabular-nums">{s.fifties}</td>
                      <td className="p-3 text-center tabular-nums">{s.centuries}</td>
                      <td className="p-3 text-center tabular-nums">{s.fours}</td>
                      <td className="p-3 text-center tabular-nums">{s.sixes}</td>
                    </tr>
                  ))}
                  {topBatsmen.length === 0 && (
                    <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No batting stats yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="bowling" className="mt-4">
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-xs">#</th>
                    <th className="text-left p-3 font-semibold text-xs">Player</th>
                    <th className="text-center p-3 font-semibold text-xs">M</th>
                    <th className="text-center p-3 font-semibold text-xs">Wkts</th>
                    <th className="text-center p-3 font-semibold text-xs">Overs</th>
                    <th className="text-center p-3 font-semibold text-xs">Runs</th>
                    <th className="text-center p-3 font-semibold text-xs">Eco</th>
                    <th className="text-center p-3 font-semibold text-xs">Maidens</th>
                  </tr>
                </thead>
                <tbody>
                  {topBowlers.map((s, i) => (
                    <tr key={s.id} className={cn('border-t', i < 3 && 'bg-primary/5')}>
                      <td className="p-3 text-muted-foreground font-medium">{i + 1}</td>
                      <td className="p-3">
                        <p className="font-semibold">{s.player?.name}</p>
                        <p className="text-xs text-muted-foreground">{s.player?.team?.team_name}</p>
                      </td>
                      <td className="p-3 text-center tabular-nums text-muted-foreground">{s.matches_played}</td>
                      <td className="p-3 text-center tabular-nums font-bold text-cricket-wicket">{s.wickets}</td>
                      <td className="p-3 text-center tabular-nums">{Number(s.overs_bowled).toFixed(1)}</td>
                      <td className="p-3 text-center tabular-nums">{s.runs_conceded}</td>
                      <td className="p-3 text-center tabular-nums">{eco(s.runs_conceded, Number(s.overs_bowled))}</td>
                      <td className="p-3 text-center tabular-nums">{s.maidens}</td>
                    </tr>
                  ))}
                  {topBowlers.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No bowling stats yet</td></tr>
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
