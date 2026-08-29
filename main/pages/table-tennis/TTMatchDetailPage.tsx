import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trophy, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TTMatch, TTMatchPlayer, TTGame, TTScoreEvent } from '@/lib/types'

interface DetailMatch extends TTMatch {
  players: TTMatchPlayer[]
  games: TTGame[]
}

export function TTMatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<DetailMatch | null>(null)
  const [events, setEvents] = useState<TTScoreEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)

  useEffect(() => {
    if (matchId) fetchMatch(matchId)
  }, [matchId])

  const fetchMatch = async (id: string) => {
    const [matchRes, eventsRes] = await Promise.all([
      supabase
        .from('tt_matches')
        .select('*, players:tt_match_players(*), games:tt_games(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('tt_score_events')
        .select('*')
        .eq('match_id', id)
        .order('created_at'),
    ])

    if (matchRes.data) {
      setMatch(matchRes.data as DetailMatch)
      setEvents((eventsRes.data || []) as TTScoreEvent[])
      const sortedGames = [...(matchRes.data.games || [])].sort((a: TTGame, b: TTGame) => a.game_number - b.game_number)
      if (sortedGames.length > 0) setSelectedGame(sortedGames[0].id)
    }
    setLoading(false)
  }

  if (loading || !match) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const playersA = (match.players || []).filter(p => p.side === 'A').sort((a, b) => a.player_order - b.player_order)
  const playersB = (match.players || []).filter(p => p.side === 'B').sort((a, b) => a.player_order - b.player_order)
  const sideAName = playersA.map(p => p.player_name).join(' + ')
  const sideBName = playersB.map(p => p.player_name).join(' + ')
  const sortedGames = [...(match.games || [])].sort((a, b) => a.game_number - b.game_number)
  const gamesWonA = sortedGames.filter(g => g.winner_side === 'A').length
  const gamesWonB = sortedGames.filter(g => g.winner_side === 'B').length
  const isAWinner = match.winner_side === 'A'

  // Duration
  let duration = ''
  if (match.started_at && match.completed_at) {
    const ms = new Date(match.completed_at).getTime() - new Date(match.started_at).getTime()
    const totalSec = Math.floor(ms / 1000)
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    duration = `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const gameEvents = selectedGame ? events.filter(e => e.game_id === selectedGame) : []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4 mr-1" /> Back
      </Button>

      {/* Match header */}
      <Card>
        <CardContent className="pt-6 pb-6 text-center space-y-3">
          <Badge variant="secondary">
            {match.status === 'completed' ? '✅ Completed' : match.status.toUpperCase()}
          </Badge>
          <h1 className="text-xl font-bold">{match.match_title}</h1>

          <div className="flex items-center justify-center gap-8 text-center">
            <div>
              <p className={cn('font-bold text-lg', isAWinner && 'text-primary')}>{sideAName}</p>
              {isAWinner && <Trophy className="size-4 text-primary mx-auto mt-1" />}
            </div>
            <p className="text-2xl font-black text-muted-foreground">vs</p>
            <div>
              <p className={cn('font-bold text-lg', !isAWinner && match.winner_side && 'text-primary')}>{sideBName}</p>
              {!isAWinner && match.winner_side && <Trophy className="size-4 text-primary mx-auto mt-1" />}
            </div>
          </div>

          {match.winner_side && (
            <p className="text-primary font-semibold">
              🏆 {match.winner_side === 'A' ? sideAName : sideBName} wins!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Match info */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Type</p>
              <p className="font-medium capitalize">{match.match_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Format</p>
              <p className="font-medium">First to {match.format}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Best Of</p>
              <p className="font-medium">{match.best_of === 1 ? 'Single Game' : `Best of ${match.best_of}`}</p>
            </div>
            {duration && (
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="size-3" /> {duration}
                </p>
              </div>
            )}
            {match.venue && (
              <div>
                <p className="text-muted-foreground text-xs">Venue</p>
                <p className="font-medium">{match.venue}</p>
              </div>
            )}
            {match.table_number && (
              <div>
                <p className="text-muted-foreground text-xs">Table</p>
                <p className="font-medium">{match.table_number}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game scores */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          <h2 className="font-semibold">Game Scores</h2>
          {match.best_of > 1 && (
            <p className="text-lg font-bold tabular-nums text-center">
              {gamesWonA} — {gamesWonB}
            </p>
          )}
          <div className="space-y-2">
            {sortedGames.filter(g => g.completed_at || g.score_a > 0 || g.score_b > 0).map(g => (
              <div
                key={g.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors',
                  selectedGame === g.id ? 'bg-primary/10' : 'hover:bg-accent'
                )}
                onClick={() => setSelectedGame(g.id)}
              >
                <span className="text-sm text-muted-foreground">Game {g.game_number}</span>
                <span className="font-bold tabular-nums">
                  {g.score_a} — {g.score_b}
                </span>
                {g.winner_side && (
                  <span className="text-xs text-primary font-medium">
                    {g.winner_side === 'A' ? sideAName.split(' + ')[0] : sideBName.split(' + ')[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Point history */}
      {gameEvents.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-5 space-y-3">
            <h2 className="font-semibold">Point History</h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {gameEvents.map((e, _i) => (
                <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground text-xs w-8">#{e.point_number}</span>
                  <span className={cn(
                    'font-medium',
                    e.scoring_side === 'A' ? 'text-primary' : 'text-foreground'
                  )}>
                    {e.scoring_side === 'A' ? sideAName.split(' + ')[0] : sideBName.split(' + ')[0]} scored
                  </span>
                  <span className="font-bold tabular-nums">{e.score_a_after} — {e.score_b_after}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
