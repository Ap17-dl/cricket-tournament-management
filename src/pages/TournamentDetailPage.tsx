import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useAppStore } from '@/store/app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import type { Tournament, Team, Player, Match, PointsTableEntry, PlayerRole, BattingStyle } from '@/lib/types'
import {
  Trophy, Plus, Users, Calendar, MapPin, Edit, Trash2,
  ChevronRight, Target, BarChart3, Crown, Medal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function PointsTable({ tournamentId }: { tournamentId: string }) {
  const [entries, setEntries] = useState<PointsTableEntry[]>([])

  useEffect(() => {
    calcPointsTable()
  }, [tournamentId])

  const calcPointsTable = async () => {
    const { data: teams } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId)
    const { data: matches } = await supabase
      .from('matches')
      .select('*, innings(*)')
      .eq('tournament_id', tournamentId)
      .in('status', ['completed'])

    if (!teams || !matches) return

    const table: Record<string, PointsTableEntry> = {}
    teams.forEach((team) => {
      table[team.id] = { team, played: 0, won: 0, lost: 0, tied: 0, no_result: 0, points: 0, nrr: 0 }
    })

    matches.forEach((match: Match) => {
      const a = table[match.team_a_id]
      const b = table[match.team_b_id]
      if (!a || !b) return
      a.played++
      b.played++
      if (match.winner_id === match.team_a_id) {
        a.won++; a.points += 2; b.lost++
      } else if (match.winner_id === match.team_b_id) {
        b.won++; b.points += 2; a.lost++
      } else {
        a.tied++; b.tied++; a.points++; b.points++
      }

      // NRR calculation
      const inns = match.innings || []
      inns.forEach((inn: { batting_team_id: string; total_runs: number; overs_completed: number; overs?: number }) => {
        const entry = table[inn.batting_team_id]
        if (!entry) return
        const overs = inn.overs_completed || 1
        const rr = inn.total_runs / overs
        const oppEntry = inn.batting_team_id === match.team_a_id ? table[match.team_b_id] : table[match.team_a_id]
        if (oppEntry) {
          entry.nrr += rr - entry.nrr
        }
      })
    })

    const sorted = Object.values(table).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return b.nrr - a.nrr
    })
    setEntries(sorted)
  }

  if (entries.length === 0) return (
    <div className="py-8 text-center text-sm text-muted-foreground">
      No teams or completed matches yet.
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-semibold">#</th>
            <th className="text-left p-3 font-semibold">Team</th>
            <th className="text-center p-3 font-semibold">P</th>
            <th className="text-center p-3 font-semibold">W</th>
            <th className="text-center p-3 font-semibold">L</th>
            <th className="text-center p-3 font-semibold">T</th>
            <th className="text-center p-3 font-semibold">Pts</th>
            <th className="text-center p-3 font-semibold">NRR</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={entry.team.id} className={cn('border-t', i < 4 && 'bg-primary/5')}>
              <td className="p-3 text-muted-foreground font-medium">{i + 1}</td>
              <td className="p-3 font-semibold flex items-center gap-2">
                {i === 0 && <Crown className="size-3.5 text-yellow-500" />}
                {entry.team.team_name}
              </td>
              <td className="p-3 text-center tabular-nums">{entry.played}</td>
              <td className="p-3 text-center tabular-nums font-medium text-primary">{entry.won}</td>
              <td className="p-3 text-center tabular-nums text-destructive">{entry.lost}</td>
              <td className="p-3 text-center tabular-nums text-muted-foreground">{entry.tied}</td>
              <td className="p-3 text-center tabular-nums font-bold">{entry.points}</td>
              <td className="p-3 text-center tabular-nums text-xs text-muted-foreground">
                {entry.nrr >= 0 ? '+' : ''}{entry.nrr.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TeamsTab({
  tournament,
  teams,
  onRefresh,
}: {
  tournament: Tournament
  teams: Team[]
  onRefresh: () => void
}) {
  const { profile } = useAuthStore()
  const [newTeamName, setNewTeamName] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isOrganizer = profile?.id === tournament.organizer_id

  const addTeam = async () => {
    if (!newTeamName.trim()) return
    setLoading(true)
    await supabase.from('teams').insert({
      tournament_id: tournament.id,
      team_name: newTeamName.trim(),
    })
    setNewTeamName('')
    setAddOpen(false)
    setLoading(false)
    onRefresh()
  }

  const deleteTeam = async (teamId: string) => {
    await supabase.from('teams').delete().eq('id', teamId)
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {isOrganizer && (
        <div className="flex justify-end">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-2">
                  <Label>Team name</Label>
                  <Input
                    placeholder="e.g. Mumbai Warriors"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addTeam} disabled={loading || !newTeamName.trim()}>
                  {loading ? 'Adding...' : 'Add Team'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {team.team_name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-semibold">{team.team_name}</span>
                  </div>
                  {isOrganizer && (
                    <div className="flex gap-1">
                      <Link to={`/tournaments/${tournament.id}/teams/${team.id}`}>
                        <Button variant="ghost" size="icon" className="size-7">
                          <Users className="size-3.5" />
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete team?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete "{team.team_name}" and all its players.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => deleteTeam(team.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {(team.players?.length ?? 0)} players
                  </Badge>
                  <Link to={`/tournaments/${tournament.id}/teams/${team.id}`} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    Manage <ChevronRight className="size-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No teams yet. {isOrganizer ? 'Add your first team to get started.' : ''}
        </div>
      )}
    </div>
  )
}

function MatchesTab({
  tournament,
  matches,
  teams,
  onRefresh,
}: {
  tournament: Tournament
  matches: Match[]
  teams: Team[]
  onRefresh: () => void
}) {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ team_a_id: '', team_b_id: '', match_type: 'League', scheduled_at: '' })
  const [loading, setLoading] = useState(false)

  const isOrganizer = profile?.id === tournament.organizer_id

  const addMatch = async () => {
    if (!form.team_a_id || !form.team_b_id) return
    setLoading(true)
    const { data } = await supabase.from('matches').insert({
      tournament_id: tournament.id,
      team_a_id: form.team_a_id,
      team_b_id: form.team_b_id,
      match_type: form.match_type,
      scheduled_at: form.scheduled_at || null,
      format: tournament.format,
      overs: tournament.overs || 20,
      match_number: matches.length + 1,
    }).select().single()
    setAddOpen(false)
    setLoading(false)
    onRefresh()
    if (data) navigate(`/matches/${data.id}`)
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-muted text-muted-foreground',
    live: 'bg-primary/10 text-primary',
    completed: 'bg-secondary text-secondary-foreground',
    abandoned: 'bg-destructive/10 text-destructive',
  }

  return (
    <div className="space-y-4">
      {isOrganizer && teams.length >= 2 && (
        <div className="flex justify-end">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Schedule Match
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Match</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-2">
                  <Label>Team A</Label>
                  <Select value={form.team_a_id} onValueChange={(v) => setForm((p) => ({ ...p, team_a_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Team B</Label>
                  <Select value={form.team_b_id} onValueChange={(v) => setForm((p) => ({ ...p, team_b_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                    <SelectContent>
                      {teams.filter((t) => t.id !== form.team_a_id).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Match type</Label>
                  <Select value={form.match_type} onValueChange={(v) => setForm((p) => ({ ...p, match_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['League', 'Knockout', 'Semi-final', 'Final'].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scheduled date & time</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addMatch} disabled={loading || !form.team_a_id || !form.team_b_id}>
                  {loading ? 'Scheduling...' : 'Schedule Match'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {matches.length > 0 ? (
        <div className="space-y-2">
          {matches.map((match) => {
            const teamA = teams.find((t) => t.id === match.team_a_id)
            const teamB = teams.find((t) => t.id === match.team_b_id)
            return (
              <Link key={match.id} to={`/matches/${match.id}`}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground">{match.match_type}</p>
                          <p className="text-xs text-muted-foreground">#{match.match_number}</p>
                        </div>
                        <div className="flex items-center gap-2 font-semibold text-sm min-w-0">
                          <span className="truncate">{teamA?.team_name || 'TBD'}</span>
                          <span className="text-muted-foreground shrink-0">vs</span>
                          <span className="truncate">{teamB?.team_name || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={cn('text-xs capitalize', statusColors[match.status])}>
                          {match.status}
                        </Badge>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                    {match.scheduled_at && (
                      <p className="text-xs text-muted-foreground mt-1 ml-12">
                        {new Date(match.scheduled_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No matches scheduled yet. {isOrganizer && teams.length >= 2 ? 'Schedule the first match.' : ''}
          {isOrganizer && teams.length < 2 ? 'Add at least 2 teams first.' : ''}
        </div>
      )}
    </div>
  )
}

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuthStore()
  const { setTheme } = useAppStore()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id) return
    const [tourRes, teamsRes, matchesRes] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('teams').select('*, players(*)').eq('tournament_id', id).order('created_at'),
      supabase.from('matches').select('*').eq('tournament_id', id).order('match_number'),
    ])
    if (tourRes.data) {
      setTournament(tourRes.data as Tournament)
      setTheme(tourRes.data.theme)
    }
    if (teamsRes.data) setTeams(teamsRes.data as Team[])
    if (matchesRes.data) setMatches(matchesRes.data as Match[])
    setLoading(false)
  }, [id, setTheme])

  useEffect(() => {
    fetchData()
    return () => setTheme('default')
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-12 rounded-lg bg-muted" />
      </div>
    )
  }

  if (!tournament) {
    return <div className="text-center py-16 text-muted-foreground">Tournament not found.</div>
  }

  const isOrganizer = profile?.id === tournament.organizer_id

  const statusColors: Record<string, string> = {
    upcoming: 'bg-muted/80 text-muted-foreground',
    active: 'bg-primary/15 text-primary',
    completed: 'bg-secondary text-secondary-foreground',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(
        'rounded-2xl p-6 relative overflow-hidden',
        tournament.theme === 'test'
          ? 'bg-[oklch(0.16_0.03_145)] border border-[oklch(1_0_0/10%)]'
          : 'bg-primary text-primary-foreground'
      )}>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn(
                  'text-xs capitalize',
                  tournament.theme === 'test'
                    ? 'bg-cricket-red/20 text-cricket-red border-0'
                    : 'bg-primary-foreground/20 text-primary-foreground border-0',
                  statusColors[tournament.status]
                )}>
                  {tournament.status}
                </Badge>
                <Badge className={cn(
                  'text-xs',
                  tournament.theme === 'test'
                    ? 'bg-cricket-red/20 text-cricket-red border-0'
                    : 'bg-primary-foreground/20 text-primary-foreground border-0'
                )}>
                  {tournament.format}
                </Badge>
              </div>
              <h1 className={cn(
                'text-2xl font-bold tracking-tight',
                tournament.theme === 'test' ? 'text-foreground' : 'text-primary-foreground'
              )}>
                {tournament.name}
              </h1>
              <div className={cn(
                'flex flex-wrap items-center gap-3 mt-2 text-sm',
                tournament.theme === 'test' ? 'text-muted-foreground' : 'text-primary-foreground/80'
              )}>
                {tournament.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {tournament.venue}
                  </span>
                )}
                {tournament.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {new Date(tournament.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
                {tournament.overs && (
                  <span className="flex items-center gap-1">
                    <Target className="size-3.5" />
                    {tournament.overs} overs
                  </span>
                )}
              </div>
            </div>
            {isOrganizer && (
              <div className="flex gap-2 shrink-0">
                <Link to={`/tournaments/${tournament.id}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'gap-1.5',
                      tournament.theme === 'test'
                        ? 'border-border'
                        : 'bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10'
                    )}
                  >
                    <Edit className="size-3.5" />
                    Edit
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className={cn(
              'text-center',
              tournament.theme === 'test' ? 'text-foreground' : 'text-primary-foreground'
            )}>
              <p className="text-2xl font-bold tabular-nums">{teams.length}</p>
              <p className="text-xs opacity-70">Teams</p>
            </div>
            <Separator orientation="vertical" className="h-8 opacity-30" />
            <div className={cn(
              'text-center',
              tournament.theme === 'test' ? 'text-foreground' : 'text-primary-foreground'
            )}>
              <p className="text-2xl font-bold tabular-nums">{matches.length}</p>
              <p className="text-xs opacity-70">Matches</p>
            </div>
            {tournament.prize_pool && (
              <>
                <Separator orientation="vertical" className="h-8 opacity-30" />
                <div className={cn(
                  'text-center',
                  tournament.theme === 'test' ? 'text-foreground' : 'text-primary-foreground'
                )}>
                  <p className="text-lg font-bold">{tournament.prize_pool}</p>
                  <p className="text-xs opacity-70">Prize Pool</p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 size-40 rounded-full border-8 border-current opacity-10" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="matches">
        <TabsList>
          <TabsTrigger value="matches" className="gap-1.5">
            <Calendar className="size-3.5" />
            Matches
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-1.5">
            <Users className="size-3.5" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-1.5">
            <Trophy className="size-3.5" />
            Points Table
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Stats
          </TabsTrigger>
        </TabsList>
        <TabsContent value="matches" className="mt-4">
          <MatchesTab tournament={tournament} matches={matches} teams={teams} onRefresh={fetchData} />
        </TabsContent>
        <TabsContent value="teams" className="mt-4">
          <TeamsTab tournament={tournament} teams={teams} onRefresh={fetchData} />
        </TabsContent>
        <TabsContent value="table" className="mt-4">
          <PointsTable tournamentId={tournament.id} />
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <TournamentStatsTab tournamentId={tournament.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TournamentStatsTab({ tournamentId }: { tournamentId: string }) {
  const [topBatsmen, setTopBatsmen] = useState<Array<{ player: Player; stats: any }>>([])
  const [topBowlers, setTopBowlers] = useState<Array<{ player: Player; stats: any }>>([])

  useEffect(() => {
    fetchStats()
  }, [tournamentId])

  const fetchStats = async () => {
    const { data } = await supabase
      .from('player_stats')
      .select('*, player:players(*, team:teams(team_name))')
      .eq('tournament_id', tournamentId)
      .order('runs', { ascending: false })

    if (data) {
      setTopBatsmen(data.slice(0, 5).map((s) => ({ player: s.player, stats: s })))
      const sorted = [...data].sort((a, b) => b.wickets - a.wickets)
      setTopBowlers(sorted.slice(0, 5).map((s) => ({ player: s.player, stats: s })))
    }
  }

  if (topBatsmen.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No stats available yet. Play some matches first.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Medal className="size-4 text-yellow-500" />
            Orange Cap — Top Batsmen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topBatsmen.map(({ player, stats }, i) => (
              <div key={player?.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{player?.name}</p>
                  <p className="text-xs text-muted-foreground">{player?.team?.team_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-primary tabular-nums">{stats.runs}</p>
                  <p className="text-xs text-muted-foreground">runs</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Medal className="size-4 text-purple-500" />
            Purple Cap — Top Bowlers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topBowlers.map(({ player, stats }, i) => (
              <div key={player?.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{player?.name}</p>
                  <p className="text-xs text-muted-foreground">{player?.team?.team_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-primary tabular-nums">{stats.wickets}</p>
                  <p className="text-xs text-muted-foreground">wkts</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function TeamPlayersPage() {
  const { id: tournamentId, teamId } = useParams<{ id: string; teamId: string }>()
  const { profile } = useAuthStore()
  const [team, setTeam] = useState<Team | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    jersey_number: '',
    batting_style: 'Right-handed' as BattingStyle,
    bowling_style: 'Right-arm medium',
    role: 'Batsman' as PlayerRole,
  })

  useEffect(() => {
    fetchData()
  }, [teamId])

  const fetchData = async () => {
    if (!teamId) return
    const [teamRes, tourRes, playersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
      supabase.from('players').select('*').eq('team_id', teamId).order('jersey_number'),
    ])
    if (teamRes.data) setTeam(teamRes.data)
    if (tourRes.data) setTournament(tourRes.data)
    if (playersRes.data) setPlayers(playersRes.data as Player[])
  }

  const addPlayer = async () => {
    if (!form.name.trim() || !teamId) return
    setLoading(true)
    await supabase.from('players').insert({
      team_id: teamId,
      name: form.name.trim(),
      jersey_number: form.jersey_number ? parseInt(form.jersey_number) : null,
      batting_style: form.batting_style,
      bowling_style: form.bowling_style,
      role: form.role,
    })
    setForm({ name: '', jersey_number: '', batting_style: 'Right-handed', bowling_style: 'Right-arm medium', role: 'Batsman' })
    setAddOpen(false)
    setLoading(false)
    fetchData()
  }

  const deletePlayer = async (playerId: string) => {
    await supabase.from('players').delete().eq('id', playerId)
    setPlayers((prev) => prev.filter((p) => p.id !== playerId))
  }

  const isOrganizer = profile?.id === tournament?.organizer_id

  const roleColors: Record<PlayerRole, string> = {
    'Batsman': 'bg-primary/10 text-primary',
    'Bowler': 'bg-cricket-red/10 text-cricket-red',
    'All-rounder': 'bg-accent text-accent-foreground',
    'Wicket-keeper': 'bg-secondary text-secondary-foreground',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/tournaments/${tournamentId}`} className="text-sm text-muted-foreground hover:text-foreground">
              {tournament?.name}
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{team?.team_name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{team?.team_name}</h1>
          <p className="text-sm text-muted-foreground">{players.length} players</p>
        </div>
        {isOrganizer && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Player</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Player name *</Label>
                    <Input
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Jersey number</Label>
                    <Input
                      type="number"
                      placeholder="#"
                      value={form.jersey_number}
                      onChange={(e) => setForm((p) => ({ ...p, jersey_number: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as PlayerRole }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'].map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Batting style</Label>
                    <Select value={form.batting_style} onValueChange={(v) => setForm((p) => ({ ...p, batting_style: v as BattingStyle }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right-handed">Right-handed</SelectItem>
                        <SelectItem value="Left-handed">Left-handed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bowling style</Label>
                    <Input
                      placeholder="e.g. Right-arm fast"
                      value={form.bowling_style}
                      onChange={(e) => setForm((p) => ({ ...p, bowling_style: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addPlayer} disabled={loading || !form.name.trim()}>
                  {loading ? 'Adding...' : 'Add Player'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {players.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {players.map((player) => (
            <Card key={player.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {player.jersey_number ? (
                        <span className="text-primary font-bold text-sm">#{player.jersey_number}</span>
                      ) : (
                        <span className="text-primary font-bold text-sm">{player.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{player.name}</p>
                      <Badge className={cn('text-xs mt-0.5', roleColors[player.role])}>
                        {player.role}
                      </Badge>
                    </div>
                  </div>
                  {isOrganizer && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove player?</AlertDialogTitle>
                          <AlertDialogDescription>Remove {player.name} from this team?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => deletePlayer(player.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Batting: {player.batting_style}</p>
                  {player.bowling_style && <p>Bowling: {player.bowling_style}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No players yet.</p>
            {isOrganizer && <p className="text-xs text-muted-foreground mt-1">Add players to build your squad.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
