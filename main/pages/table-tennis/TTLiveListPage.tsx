import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Radio, Loader2 } from 'lucide-react'
import type { TTMatch, TTMatchPlayer, TTGame } from '@/lib/types'

interface LiveMatch extends TTMatch {
  players: TTMatchPlayer[]
  games: TTGame[]
}

export function TTLiveListPage() {
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLive()

    const channel = supabase
      .channel('tt-live-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tt_matches' }, () => {
        fetchLive()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tt_games' }, () => {
        fetchLive()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchLive = async () => {
    const { data } = await supabase
      .from('tt_matches')
      .select('*, players:tt_match_players(*), games:tt_games(*)')
      .eq('status', 'live')
      .order('started_at', { ascending: false })

    setMatches((data || []) as LiveMatch[])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="size-5" /> Live Matches
        </h1>
        <p className="text-sm text-muted-foreground">Currently active table tennis matches</p>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Radio className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No live matches right now</p>
            <Link to="/table-tennis/quick-match" className="mt-3 inline-block">
              <Button size="sm">Start a Match</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {matches.map(match => {
            const playersA = (match.players || []).filter(p => p.side === 'A').sort((a, b) => a.player_order - b.player_order)
            const playersB = (match.players || []).filter(p => p.side === 'B').sort((a, b) => a.player_order - b.player_order)
            const sideAName = playersA.map(p => p.player_name).join(' + ')
            const sideBName = playersB.map(p => p.player_name).join(' + ')

            const sortedGames = [...(match.games || [])].sort((a, b) => a.game_number - b.game_number)
            const currentGame = sortedGames.find(g => !g.completed_at) || sortedGames[sortedGames.length - 1]
            const gamesWonA = sortedGames.filter(g => g.winner_side === 'A').length
            const gamesWonB = sortedGames.filter(g => g.winner_side === 'B').length

            const deuceThreshold = match.format - 1
            const isDeuce = currentGame &&
              currentGame.score_a >= deuceThreshold &&
              currentGame.score_b >= deuceThreshold &&
              Math.abs(currentGame.score_a - currentGame.score_b) < 2

            return (
              <Link key={match.id} to={`/table-tennis/live/${match.id}`}>
                <Card className="hover:shadow-md transition-shadow border-red-500/20">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-red-500/10 text-red-600 text-xs flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
                        LIVE
                      </Badge>
                      {match.table_number && (
                        <span className="text-xs text-muted-foreground">{match.table_number}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{sideAName}</span>
                        <span className="font-bold text-lg tabular-nums">{currentGame?.score_a ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{sideBName}</span>
                        <span className="font-bold text-lg tabular-nums">{currentGame?.score_b ?? 0}</span>
                      </div>
                    </div>
                    {isDeuce && (
                      <p className="text-xs font-semibold text-amber-600 mt-2">DEUCE</p>
                    )}
                    {match.best_of > 1 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Games: {gamesWonA} - {gamesWonB} (Game {currentGame?.game_number})
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
