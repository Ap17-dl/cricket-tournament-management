import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Loader2 } from 'lucide-react'
import type { TTMatch, TTMatchPlayer, TTGame } from '@/lib/types'

interface ResultMatch extends TTMatch {
  players: TTMatchPlayer[]
  games: TTGame[]
}

export function TTResultsPage() {
  const [matches, setMatches] = useState<ResultMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    const { data } = await supabase
      .from('tt_matches')
      .select('*, players:tt_match_players(*), games:tt_games(*)')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50)

    setMatches((data || []) as ResultMatch[])
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
          <Trophy className="size-5" /> Results
        </h1>
        <p className="text-sm text-muted-foreground">Completed table tennis matches</p>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No completed matches yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map(match => {
            const playersA = (match.players || []).filter(p => p.side === 'A').sort((a, b) => a.player_order - b.player_order)
            const playersB = (match.players || []).filter(p => p.side === 'B').sort((a, b) => a.player_order - b.player_order)
            const sideAName = playersA.map(p => p.player_name).join(' + ')
            const sideBName = playersB.map(p => p.player_name).join(' + ')

            const sortedGames = [...(match.games || [])].sort((a, b) => a.game_number - b.game_number)
            const gamesWonA = sortedGames.filter(g => g.winner_side === 'A').length
            const gamesWonB = sortedGames.filter(g => g.winner_side === 'B').length
            const isAWinner = match.winner_side === 'A'

            const dateStr = match.completed_at
              ? new Date(match.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : ''

            return (
              <Link key={match.id} to={`/table-tennis/results/${match.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        <Trophy className="size-3 mr-1" /> Completed
                      </Badge>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className={`font-semibold text-sm flex items-center gap-1.5 ${isAWinner ? 'text-primary' : ''}`}>
                          {isAWinner && <Trophy className="size-3.5 text-primary shrink-0" />}{sideAName}
                        </p>
                        <p className={`font-semibold text-sm flex items-center gap-1.5 ${!isAWinner ? 'text-primary' : ''}`}>
                          {!isAWinner && <Trophy className="size-3.5 text-primary shrink-0" />}{sideBName}
                        </p>
                      </div>
                      <div className="text-right">
                        {match.best_of > 1 ? (
                          <div>
                            <p className="font-bold text-lg tabular-nums">{gamesWonA} - {gamesWonB}</p>
                            <div className="flex gap-1 justify-end">
                              {sortedGames.filter(g => g.completed_at).map(g => (
                                <span key={g.id} className="text-xs text-muted-foreground tabular-nums">
                                  {g.score_a}-{g.score_b}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="font-bold text-lg tabular-nums">
                            {sortedGames[0]?.score_a ?? 0} - {sortedGames[0]?.score_b ?? 0}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{match.match_type}</span>
                      <span>·</span>
                      <span>First to {match.format}</span>
                    </div>
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
