import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Medal, Search, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerStats, Player } from '@/lib/types'

interface StatsWithPlayer extends PlayerStats {
  player: Player & { team: { team_name: string } }
}

export function StatsPage() {
  const [stats, setStats] = useState<StatsWithPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { data } = await supabase
      .from('player_stats')
      .select('*, player:players(*, team:teams(team_name))')
      .order('runs', { ascending: false })
    if (data) setStats(data as StatsWithPlayer[])
    setLoading(false)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Player Statistics</h1>
        <p className="text-muted-foreground text-sm mt-1">Leaderboards, batting, bowling & fielding stats</p>
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
