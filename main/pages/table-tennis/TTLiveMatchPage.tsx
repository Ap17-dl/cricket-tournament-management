import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTTStore } from '@/store/tt'
import { supabase } from '@/lib/supabase'
import {
  calculateGameStatus,
  calculateServer,
  calculateDoublesServer,
  calculateMatchStatus,
} from '@/lib/tt-scoring'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Undo2, Trophy, ArrowLeft, Loader2 } from 'lucide-react'

export function TTLiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { match, players, games, currentGame, scoreEvents, loading, loadMatch, addPoint, undoLastPoint } = useTTStore()
  const [showComplete, setShowComplete] = useState(false)
  const [scoring, setScoring] = useState(false)

  useEffect(() => {
    if (matchId) loadMatch(matchId)
  }, [matchId, loadMatch])

  // Realtime subscription
  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`tt-match-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tt_games', filter: `match_id=eq.${matchId}` }, () => {
        loadMatch(matchId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tt_score_events', filter: `match_id=eq.${matchId}` }, () => {
        loadMatch(matchId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tt_matches', filter: `id=eq.${matchId}` }, () => {
        loadMatch(matchId)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, loadMatch])

  // Detect match completion
  useEffect(() => {
    if (match?.status === 'completed' && !showComplete) {
      setShowComplete(true)
    }
  }, [match?.status, showComplete])

  const handleAddPoint = useCallback(async (side: 'A' | 'B') => {
    if (scoring) return
    setScoring(true)
    await addPoint(side)
    setScoring(false)
  }, [addPoint, scoring])

  const handleUndo = useCallback(async () => {
    if (scoring) return
    setScoring(true)
    await undoLastPoint()
    setScoring(false)
  }, [undoLastPoint, scoring])

  if (loading || !match || !currentGame) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading match...</p>
        </div>
      </div>
    )
  }

  const playersA = players.filter(p => p.side === 'A').sort((a, b) => a.player_order - b.player_order)
  const playersB = players.filter(p => p.side === 'B').sort((a, b) => a.player_order - b.player_order)
  const sideAName = playersA.map(p => p.player_name).join(' + ')
  const sideBName = playersB.map(p => p.player_name).join(' + ')

  const gameStatus = calculateGameStatus(currentGame.score_a, currentGame.score_b, match.format)
  const matchStatus = calculateMatchStatus(
    games.map(g => ({ winner_side: g.winner_side as 'A' | 'B' | null })),
    match.best_of
  )

  // Current server
  let serverName = ''
  let receiverName = ''
  if (match.match_type === 'doubles') {
    const info = calculateDoublesServer(currentGame.score_a, currentGame.score_b, match.format, currentGame.first_server_side)
    const serverSidePlayers = info.servingSide === 'A' ? playersA : playersB
    const receiverSidePlayers = info.servingSide === 'A' ? playersB : playersA
    serverName = serverSidePlayers.find(p => p.player_order === info.serverPlayerOrder)?.player_name || ''
    receiverName = receiverSidePlayers.find(p => p.player_order === info.receiverPlayerOrder)?.player_name || ''
  } else {
    const servingSide = calculateServer(currentGame.score_a, currentGame.score_b, match.format, currentGame.first_server_side)
    serverName = (servingSide === 'A' ? playersA[0] : playersB[0])?.player_name || ''
    receiverName = (servingSide === 'A' ? playersB[0] : playersA[0])?.player_name || ''
  }

  const isMatchOver = match.status === 'completed'
  const gamesWonA = games.filter(g => g.winner_side === 'A').length
  const gamesWonB = games.filter(g => g.winner_side === 'B').length

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/table-tennis')}>
          <ArrowLeft className="size-4 mr-1" /> Back
        </Button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">🏓 TABLE TENNIS</p>
          <p className="text-sm font-semibold">{match.match_title}</p>
        </div>
        <Badge variant={isMatchOver ? 'secondary' : 'default'} className={cn(!isMatchOver && 'bg-red-500 text-white')}>
          {isMatchOver ? 'COMPLETED' : '🔴 LIVE'}
        </Badge>
      </div>

      {/* Deuce indicator */}
      {gameStatus.isDeuce && (
        <div className="text-center py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-lg font-bold text-amber-600">⚡ DEUCE</p>
        </div>
      )}

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3">
        {/* Side A */}
        <Card className={cn(
          'transition-all',
          match.winner_side === 'A' && 'ring-2 ring-primary'
        )}>
          <CardContent className="pt-4 pb-4 text-center space-y-3">
            <p className="font-bold text-sm truncate">{sideAName}</p>
            <p className="text-6xl sm:text-7xl font-black tabular-nums text-foreground">
              {currentGame.score_a}
            </p>
            {!isMatchOver && !gameStatus.isFinished && (
              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold gap-2"
                onClick={() => handleAddPoint('A')}
                disabled={scoring}
              >
                + POINT
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Side B */}
        <Card className={cn(
          'transition-all',
          match.winner_side === 'B' && 'ring-2 ring-primary'
        )}>
          <CardContent className="pt-4 pb-4 text-center space-y-3">
            <p className="font-bold text-sm truncate">{sideBName}</p>
            <p className="text-6xl sm:text-7xl font-black tabular-nums text-foreground">
              {currentGame.score_b}
            </p>
            {!isMatchOver && !gameStatus.isFinished && (
              <Button
                size="lg"
                className="w-full h-14 text-lg font-bold gap-2"
                onClick={() => handleAddPoint('B')}
                disabled={scoring}
              >
                + POINT
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Server indicator + Game info */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Game {currentGame.game_number}</p>
              <p className="text-sm font-medium">First to {match.format}</p>
            </div>
            {!isMatchOver && !gameStatus.isFinished && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Server</p>
                <p className="text-sm font-semibold flex items-center gap-1.5 justify-end">
                  <span className="size-2 rounded-full bg-blue-500 inline-block" />
                  {serverName}
                </p>
                {match.match_type === 'doubles' && (
                  <>
                    <p className="text-xs text-muted-foreground mt-1">Receiver</p>
                    <p className="text-sm font-semibold">{receiverName}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Games won summary */}
          {match.best_of > 1 && (
            <>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Games</span>
                <div className="flex items-center gap-4">
                  <span className={cn('font-bold', gamesWonA > gamesWonB && 'text-primary')}>{sideAName}: {gamesWonA}</span>
                  <span className={cn('font-bold', gamesWonB > gamesWonA && 'text-primary')}>{sideBName}: {gamesWonB}</span>
                </div>
              </div>
              {/* Game scores */}
              <div className="mt-2 flex gap-2 flex-wrap">
                {games.filter(g => g.completed_at).map(g => (
                  <Badge key={g.id} variant="secondary" className="text-xs">
                    G{g.game_number}: {g.score_a}-{g.score_b}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Undo button */}
      {!isMatchOver && scoreEvents.length > 0 && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleUndo}
          disabled={scoring}
        >
          <Undo2 className="size-4" />
          UNDO LAST POINT
        </Button>
      )}

      {/* Point history */}
      {scoreEvents.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-2">Point History (Game {currentGame.game_number})</p>
            <div className="flex flex-wrap gap-1.5">
              {scoreEvents
                .filter(e => e.game_id === currentGame.id)
                .map((e, i) => (
                  <Badge
                    key={e.id}
                    variant="outline"
                    className={cn(
                      'text-xs tabular-nums',
                      e.scoring_side === 'A' ? 'border-primary/30' : 'border-muted-foreground/30'
                    )}
                  >
                    {e.score_a_after}-{e.score_b_after}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match complete dialog */}
      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent className="text-center max-w-md">
          <DialogHeader className="items-center">
            <DialogTitle className="text-2xl flex items-center gap-2 justify-center">
              <Trophy className="size-6 text-primary" />
              MATCH COMPLETE
            </DialogTitle>
            <DialogDescription>
              {match.match_title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xl font-bold text-primary">
              {match.winner_side === 'A' ? sideAName : sideBName}
            </p>
            <p className="text-lg font-semibold text-muted-foreground">WINS!</p>

            {match.best_of > 1 ? (
              <div className="space-y-2">
                <p className="text-2xl font-black tabular-nums">
                  {gamesWonA} - {gamesWonB}
                </p>
                <div className="space-y-1">
                  {games.filter(g => g.completed_at).map(g => (
                    <p key={g.id} className="text-sm text-muted-foreground">
                      Game {g.game_number}: {g.score_a} - {g.score_b}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-3xl font-black tabular-nums">
                {currentGame.score_a} - {currentGame.score_b}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/table-tennis/results')}>
              View Results
            </Button>
            <Button className="flex-1" onClick={() => navigate('/table-tennis/quick-match')}>
              New Match
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
