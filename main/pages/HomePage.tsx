import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Match, Tournament } from '@/lib/types'
import { Trophy, Zap, Calendar, Users, Activity, ChevronRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'

function LiveMatchCard({ match }: { match: Match }) {
  const teamA = match.team_a
  const teamB = match.team_b
  const inns = match.innings || []
  const inns1 = inns[0]
  const inns2 = inns[1]

  const battingInns = inns.find((i) => !i.is_complete) || inns[inns.length - 1]
  const battingTeam = battingInns?.batting_team
  const currentScore = battingInns ? `${battingInns.total_runs}/${battingInns.wickets}` : '0/0'
  const currentOvers = battingInns ? battingInns.overs_completed.toFixed(1) : '0.0'

  return (
    <Link to={`/matches/${match.id}`}>
      <Card className="hover:shadow-md transition-shadow border-primary/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <Badge className="bg-cricket-live/15 text-cricket-live border-0 text-xs font-semibold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-cricket-live live-indicator inline-block" />
              LIVE
            </Badge>
            <span className="text-xs text-muted-foreground">{match.format} · {match.overs} ov</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={cn(
                'font-semibold text-sm',
                battingTeam?.id === teamA?.id ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {teamA?.team_name || 'Team A'}
              </span>
              <span className="font-bold text-base tabular-nums">
                {inns1 && inns1.batting_team_id === teamA?.id
                  ? `${inns1.total_runs}/${inns1.wickets}`
                  : inns2 && inns2.batting_team_id === teamA?.id
                  ? `${inns2.total_runs}/${inns2.wickets}`
                  : battingTeam?.id === teamA?.id ? currentScore : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn(
                'font-semibold text-sm',
                battingTeam?.id === teamB?.id ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {teamB?.team_name || 'Team B'}
              </span>
              <span className="font-bold text-base tabular-nums">
                {inns1 && inns1.batting_team_id === teamB?.id
                  ? `${inns1.total_runs}/${inns1.wickets}`
                  : inns2 && inns2.batting_team_id === teamB?.id
                  ? `${inns2.total_runs}/${inns2.wickets}`
                  : battingTeam?.id === teamB?.id ? currentScore : '-'}
              </span>
            </div>
          </div>
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground">
            {battingTeam?.team_name} batting · {currentOvers}/{match.overs} overs
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const statusColors: Record<string, string> = {
    upcoming: 'bg-muted text-muted-foreground',
    active: 'bg-primary/10 text-primary',
    completed: 'bg-secondary text-secondary-foreground',
  }
  const formatThemeClass = tournament.format === 'Test Match' ? 'border-l-4 border-l-cricket-red' : 'border-l-4 border-l-cricket-green'

  return (
    <Link to={`/tournaments/${tournament.id}`}>
      <Card className={cn('hover:shadow-md transition-shadow', formatThemeClass)}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{tournament.name}</h3>
              {tournament.venue && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{tournament.venue}</p>
              )}
            </div>
            <Badge className={cn('shrink-0 text-xs capitalize', statusColors[tournament.status])}>
              {tournament.status}
            </Badge>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Trophy className="size-3" />
              {tournament.format}
            </span>
            {tournament.overs && (
              <span>{tournament.overs} overs</span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="size-3" />
            <span className="truncate">by {(tournament as any).organizer?.name || 'Unknown'}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function HomePage() {
  const { profile } = useAuthStore()
  const [liveMatches, setLiveMatches] = useState<Match[]>([])
  const [recentTournaments, setRecentTournaments] = useState<Tournament[]>([])
  const [stats, setStats] = useState({ tournaments: 0, matches: 0, teams: 0, players: 0 })

  useEffect(() => {
    fetchData()

    // Realtime subscription so tournament deletions propagate to dashboard
    const channel = supabase
      .channel('home-tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchData = async () => {
    const [liveRes, tourRes, statsRes] = await Promise.all([
      supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!matches_team_a_id_fkey(*),
          team_b:teams!matches_team_b_id_fkey(*),
          innings(*, batting_team:teams!innings_batting_team_id_fkey(*), bowling_team:teams!innings_bowling_team_id_fkey(*))
        `)
        .eq('status', 'live')
        .limit(6),
      supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6),
      Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
      ]),
    ])

    if (liveRes.data) setLiveMatches(liveRes.data as Match[])
    if (tourRes.data) {
      // Fetch organizer names separately
      const organizerIds = [...new Set(tourRes.data.map((t: any) => t.organizer_id))]
      const { data: organizers } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', organizerIds)
      const orgMap: Record<string, string> = {}
      if (organizers) organizers.forEach((o: any) => { orgMap[o.id] = o.name })
      const enriched = tourRes.data.map((t: any) => ({ ...t, organizer: { name: orgMap[t.organizer_id] || 'Unknown' } }))
      setRecentTournaments(enriched as Tournament[])
    }
    const [t, m, teams, p] = statsRes
    setStats({
      tournaments: t.count ?? 0,
      matches: m.count ?? 0,
      teams: teams.count ?? 0,
      players: p.count ?? 0,
    })
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-primary p-8 text-primary-foreground relative overflow-hidden">
        <div className="relative z-10">
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-3">
            Cricket Tournament Platform
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {profile ? `Welcome back, ${profile.name}` : 'Welcome to LocalCricket'}
          </h1>
          <p className="text-primary-foreground/80 text-sm max-w-md">
            Live scoring, tournament management, player analytics — all in one place.
          </p>
          {profile?.role === 'organizer' && (
            <div className="flex gap-3 mt-5">
              <Link to="/tournaments/new">
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <Zap className="size-3.5" />
                  New Tournament
                </Button>
              </Link>
              <Link to="/tournaments">
                <Button variant="outline" size="sm" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  My Tournaments
                </Button>
              </Link>
            </div>
          )}
        </div>
        {/* Decorative cricket ball */}
        <div className="absolute -right-8 -bottom-8 size-40 rounded-full border-8 border-primary-foreground/10 opacity-50" />
        <div className="absolute -right-4 -bottom-4 size-24 rounded-full border-4 border-primary-foreground/10 opacity-30" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tournaments', value: stats.tournaments, icon: Trophy, to: '/tournaments' },
          { label: 'Matches', value: stats.matches, icon: Calendar, to: '/matches' },
          { label: 'Teams', value: stats.teams, icon: Users, to: '/tournaments' },
          { label: 'Players', value: stats.players, icon: Activity, to: '/stats' },
        ].map(({ label, value, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="block rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer"
          >
            <div className="px-6 pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Live matches */}
      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-cricket-live live-indicator inline-block" />
              Live Now
            </h2>
            <Link to="/matches" className="text-sm text-primary flex items-center gap-1 hover:underline">
              All matches <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveMatches.map((match) => (
              <LiveMatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* Tournaments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tournaments</h2>
          <Link to="/tournaments" className="text-sm text-primary flex items-center gap-1 hover:underline">
            View all <ChevronRight className="size-3" />
          </Link>
        </div>
        {recentTournaments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentTournaments.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No tournaments yet</p>
              {profile?.role === 'organizer' && (
                <Link to="/tournaments/new" className="mt-3 inline-block">
                  <Button size="sm">Create your first tournament</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
