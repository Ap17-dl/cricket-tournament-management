import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Award, ArrowLeft, Calendar, MapPin, Trophy, Play, Loader2, Radio, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TTTournament, TTMatch, TTMatchPlayer } from '@/lib/types'

interface TournamentMatch extends TTMatch {
  players: TTMatchPlayer[]
}

interface StandingRow {
  name: string
  played: number
  won: number
  lost: number
  points: number
}

export function TTTournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const [tournament, setTournament] = useState<TTTournament | null>(null)
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchDetails(id)

      const channel = supabase
        .channel(`tt-tournament-detail-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tt_matches', filter: `tournament_id=eq.${id}` }, () => {
          fetchDetails(id)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
  }, [id])

  const fetchDetails = async (tourId: string) => {
    setLoading(true)
    const [tourRes, matchesRes] = await Promise.all([
      supabase.from('tt_tournaments').select('*').eq('id', tourId).single(),
      supabase.from('tt_matches').select('*, players:tt_match_players(*)').eq('tournament_id', tourId).order('created_at'),
    ])

    if (tourRes.data) {
      setTournament(tourRes.data as TTTournament)
    }

    if (matchesRes.data) {
      const matchData = matchesRes.data as TournamentMatch[]
      setMatches(matchData)
      calculateStandings(matchData, tourRes.data?.match_type || 'singles')
    }

    setLoading(false)
  }

  const getSideName = (match: TournamentMatch, side: 'A' | 'B', matchType: string) => {
    const sidePlayers = match.players.filter(p => p.side === side).sort((a, b) => a.player_order - b.player_order)
    if (matchType === 'singles') {
      return sidePlayers[0]?.player_name || 'Unknown'
    } else {
      const parts = match.match_title.split(' vs ')
      if (side === 'A') return parts[0] || sidePlayers.map(p => p.player_name).join(' + ')
      return parts[1] || sidePlayers.map(p => p.player_name).join(' + ')
    }
  }

  const calculateStandings = (tourMatches: TournamentMatch[], matchType: string) => {
    const stats: Record<string, { played: number; won: number; lost: number; points: number }> = {}

    // Initialize stats keys from all matches
    tourMatches.forEach(m => {
      const nameA = getSideName(m, 'A', matchType)
      const nameB = getSideName(m, 'B', matchType)

      if (!stats[nameA]) stats[nameA] = { played: 0, won: 0, lost: 0, points: 0 }
      if (!stats[nameB]) stats[nameB] = { played: 0, won: 0, lost: 0, points: 0 }

      if (m.status === 'completed' && m.winner_side) {
        stats[nameA].played += 1
        stats[nameB].played += 1

        if (m.winner_side === 'A') {
          stats[nameA].won += 1
          stats[nameA].points += 2
          stats[nameB].lost += 1
        } else {
          stats[nameB].won += 1
          stats[nameB].points += 2
          stats[nameA].lost += 1
        }
      }
    })

    const rows: StandingRow[] = Object.keys(stats).map(name => ({
      name,
      ...stats[name],
    }))

    // Sort by Points (descending), then Won (descending)
    rows.sort((a, b) => b.points - a.points || b.won - a.won)
    setStandings(rows)
  }

  if (loading || !tournament) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading tournament details...</p>
        </div>
      </div>
    )
  }

  const isOrganizer = profile?.role === 'organizer' && profile.id === tournament.created_by
  const isAllCompleted = matches.length > 0 && matches.every(m => m.status === 'completed')

  const statusColors: Record<string, string> = {
    upcoming: 'bg-muted text-muted-foreground',
    active: 'bg-primary/10 text-primary',
    completed: 'bg-secondary text-secondary-foreground',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/table-tennis/tournaments')}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Button>
        {isOrganizer && tournament.status !== 'completed' && isAllCompleted && (
          <Button
            size="sm"
            onClick={async () => {
              await supabase.from('tt_tournaments').update({ status: 'completed' }).eq('id', tournament.id)
              fetchDetails(tournament.id)
            }}
          >
            Mark Tournament Completed
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 pb-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge className={cn('capitalize text-xs mb-2', statusColors[tournament.status])}>
                {tournament.status}
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight">{tournament.name}</h1>
            </div>
            <Award className="size-10 text-primary shrink-0" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-muted-foreground">
            {tournament.venue && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                <span className="truncate">{tournament.venue}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              <span>Created {new Date(tournament.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="size-3.5" />
              <span className="capitalize">{tournament.match_type} match</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold">Format:</span>
              <span>Best of {tournament.best_of} · {tournament.format} points</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="size-4 text-amber-500" /> Leaderboard / Standings
          </CardTitle>
          <CardDescription>
            Standing points: 2 points for a win, 0 for a loss.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {standings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No standings calculated yet. Matches need to be completed.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Pos</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead className="text-center w-20">Played</TableHead>
                  <TableHead className="text-center w-20">Won</TableHead>
                  <TableHead className="text-center w-20">Lost</TableHead>
                  <TableHead className="text-center w-24 font-bold text-foreground">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row, idx) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-semibold text-muted-foreground">#{idx + 1}</TableCell>
                    <TableCell className="font-medium text-foreground flex items-center gap-1.5">
                      {idx === 0 && row.won > 0 && <Trophy className="size-3.5 text-amber-500 shrink-0" />}
                      {row.name}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{row.played}</TableCell>
                    <TableCell className="text-center text-primary tabular-nums font-semibold">{row.won}</TableCell>
                    <TableCell className="text-center text-destructive tabular-nums">{row.lost}</TableCell>
                    <TableCell className="text-center font-bold text-foreground tabular-nums">{row.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Matches / Fixtures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="size-4 text-primary" /> Generated League Fixtures
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No fixtures generated.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matches.map(m => {
                const nameA = getSideName(m, 'A', tournament.match_type)
                const nameB = getSideName(m, 'B', tournament.match_type)

                const isLive = m.status === 'live'
                const isCompleted = m.status === 'completed'

                return (
                  <Card key={m.id} className={cn('border-border/60 hover:shadow-sm transition-all', isLive && 'border-red-500/30 bg-red-500/[0.02]')}>
                    <CardContent className="pt-4 pb-4 flex flex-col justify-between h-full gap-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn(
                          isLive && 'bg-red-500/10 text-red-600 border-red-500/20',
                          isCompleted && 'bg-secondary text-secondary-foreground border-transparent'
                        )}>
                          {isLive && <span className="size-1.5 rounded-full bg-red-500 inline-block mr-1.5 animate-pulse" />}
                          {m.status.toUpperCase()}
                        </Badge>
                        {m.table_number && <span className="text-xs text-muted-foreground">{m.table_number}</span>}
                      </div>

                      <div className="text-sm font-semibold space-y-1">
                        <p className={cn('flex items-center gap-1.5', isCompleted && m.winner_side === 'A' && 'text-primary font-bold')}>
                          {isCompleted && m.winner_side === 'A' && <Trophy className="size-3.5 text-primary shrink-0" />}{nameA}
                        </p>
                        <p className="text-xs text-muted-foreground font-normal">vs</p>
                        <p className={cn('flex items-center gap-1.5', isCompleted && m.winner_side === 'B' && 'text-primary font-bold')}>
                          {isCompleted && m.winner_side === 'B' && <Trophy className="size-3.5 text-primary shrink-0" />}{nameB}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 mt-1">
                        {isCompleted ? (
                          <Link to={`/table-tennis/results/${m.id}`} className="w-full">
                            <Button variant="outline" size="sm" className="w-full text-xs font-semibold gap-1">
                              <CheckCircle2 className="size-3.5 text-primary" /> View results
                            </Button>
                          </Link>
                        ) : isLive ? (
                          <Link to={`/table-tennis/live/${m.id}`} className="w-full">
                            <Button size="sm" className="w-full text-xs font-semibold gap-1 bg-red-600 hover:bg-red-500">
                              <Radio className="size-3.5 animate-pulse" /> Resume score
                            </Button>
                          </Link>
                        ) : (
                          isOrganizer ? (
                            <Link to={`/table-tennis/live/${m.id}`} className="w-full">
                              <Button size="sm" className="w-full text-xs font-semibold gap-1">
                                <Play className="size-3.5" /> Start scoring
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground italic w-full text-center">Scheduled</span>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
