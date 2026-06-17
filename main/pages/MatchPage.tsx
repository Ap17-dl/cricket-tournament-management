import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useAppStore } from '@/store/app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { Match, Innings, BallEvent, Player, PlayingXI, TossDecision, WicketType, ExtraType } from '@/lib/types'
import {
  Trophy, Activity, RotateCcw,
  Users, ArrowLeftRight, BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'


function OverTracker({ balls }: { balls: BallEvent[] }) {
  const getBallDisplay = (ball: BallEvent) => {
    if (ball.is_wicket) return { label: 'W', cls: 'bg-cricket-wicket text-white' }
    if (ball.extra_type === 'wide') return { label: 'Wd', cls: 'bg-muted-foreground/20 text-muted-foreground text-[9px]' }
    if (ball.extra_type === 'no_ball') return { label: 'Nb', cls: 'bg-orange-500/20 text-orange-500 text-[9px]' }
    if (ball.runs === 4) return { label: '4', cls: 'bg-cricket-boundary text-white' }
    if (ball.runs === 6) return { label: '6', cls: 'bg-cricket-six text-white' }
    if (ball.runs === 0) return { label: '·', cls: 'bg-muted text-muted-foreground' }
    return { label: String(ball.runs), cls: 'bg-secondary text-secondary-foreground' }
  }

  const legalCount = balls.filter(
    (b) => !b.extra_type || b.extra_type === 'bye' || b.extra_type === 'leg_bye'
  ).length
  const totalSlots = balls.length + Math.max(0, 6 - legalCount)

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: totalSlots }).map((_, i) => {
        const ball = balls[i]
        if (!ball) {
          return (
            <div
              key={i}
              className="size-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
            />
          )
        }
        const { label, cls } = getBallDisplay(ball)
        return (
          <div
            key={i}
            className={cn('size-8 rounded-full flex items-center justify-center text-xs font-bold ball-filled', cls)}
          >
            {label}
          </div>
        )
      })}
    </div>
  )
}

// ===================== SCORING BUTTON =====================
function ScoringButton({
  label,
  onClick,
  variant = 'default',
  className,
  disabled,
}: {
  label: string
  onClick: () => void
  variant?: 'default' | 'boundary' | 'six' | 'wicket' | 'extra' | 'muted'
  className?: string
  disabled?: boolean
}) {
  const variantClasses = {
    default: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
    boundary: 'bg-cricket-boundary hover:bg-cricket-boundary/80 text-white',
    six: 'bg-cricket-six hover:bg-cricket-six/80 text-white',
    wicket: 'bg-cricket-wicket hover:bg-cricket-wicket/80 text-white',
    extra: 'bg-muted hover:bg-muted/80 text-muted-foreground',
    muted: 'bg-muted/50 hover:bg-muted text-muted-foreground border border-dashed border-border',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-14 w-full rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
        variantClasses[variant],
        className
      )}
    >
      {label}
    </button>
  )
}

function ScorecardTab({ innings, players }: { innings: Innings | null; players: Player[] }) {
  if (!innings) return <div className="py-8 text-center text-sm text-muted-foreground">No innings data yet.</div>

  const balls = innings.ball_events || []

  const batsmenMap: Record<string, { runs: number; balls: number; fours: number; sixes: number; out: boolean; wicketType?: string }> = {}
  const bowlersMap: Record<string, { overs: number; balls: number; maidens: number; runs: number; wickets: number }> = {}

  balls.forEach((b) => {
    if (b.batsman_id) {
      if (!batsmenMap[b.batsman_id]) batsmenMap[b.batsman_id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false }
      const bm = batsmenMap[b.batsman_id]
      if (b.extra_type !== 'wide') bm.balls++
      // Only runs off the bat (from normal balls or no-balls) go to the batsman.
      // Wides, Byes, and Leg Byes go to the team as extras.
      if (b.extra_type === null || b.extra_type === 'no_ball') {
        bm.runs += b.runs
        if (b.runs === 4) bm.fours++
        if (b.runs === 6) bm.sixes++
      }
      if (b.is_wicket && b.wicket_type !== 'run_out') bm.out = true
      if (b.is_wicket && b.wicket_type) bm.wicketType = b.wicket_type
    }
    if (b.bowler_id) {
      if (!bowlersMap[b.bowler_id]) bowlersMap[b.bowler_id] = { overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 }
      const bw = bowlersMap[b.bowler_id]
      if (!b.extra_type || b.extra_type === 'bye' || b.extra_type === 'leg_bye') bw.balls++
      // Bowler runs conceded: runs off bat + wides/no-balls. Byes and Leg Byes are NOT conceded by the bowler.
      const bowlerRunsConceded = (b.extra_type === 'bye' || b.extra_type === 'leg_bye') ? 0 : (b.runs + b.extra_runs)
      bw.runs += bowlerRunsConceded
      if (b.is_wicket && b.wicket_type !== 'run_out') bw.wickets++
      bw.overs = Math.floor(bw.balls / 6) + (bw.balls % 6) / 10
    }
  })

  const batsmenArr = Object.entries(batsmenMap)
    .map(([pid, stats]) => ({ player: players.find((p) => p.id === pid), ...stats }))
    .filter((b) => b.player)

  const bowlersArr = Object.entries(bowlersMap)
    .map(([pid, stats]) => ({ player: players.find((p) => p.id === pid), ...stats }))
    .filter((b) => b.player)

  const sr = (runs: number, balls: number) => balls > 0 ? ((runs / balls) * 100).toFixed(1) : '-'
  const eco = (runs: number, balls: number) => balls > 0 ? ((runs / balls) * 6).toFixed(2) : '-'
  const oversDisplay = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-xl font-bold tabular-nums">{innings.total_runs}/{innings.wickets}</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="text-center">
          <p className="text-xl font-bold tabular-nums">{Number(innings.overs_completed).toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Overs</p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="text-center">
          <p className="text-xl font-bold tabular-nums">{innings.extras}</p>
          <p className="text-xs text-muted-foreground">Extras</p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="text-center">
          <p className="text-xl font-bold tabular-nums">
            {innings.overs_completed > 0 ? (innings.total_runs / Number(innings.overs_completed)).toFixed(2) : '-'}
          </p>
          <p className="text-xs text-muted-foreground">RR</p>
        </div>
      </div>

      {/* Batting */}
      <div>
        <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Batting</h4>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium text-xs text-muted-foreground">Batsman</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">R</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">B</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">4s</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">6s</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">SR</th>
              </tr>
            </thead>
            <tbody>
              {batsmenArr.map((b) => (
                <tr key={b.player?.id} className="border-t">
                  <td className="p-2">
                    <p className="font-medium">{b.player?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.out ? b.wicketType?.replace('_', ' ') : 'not out'}</p>
                  </td>
                  <td className="p-2 text-center font-bold tabular-nums">{b.runs}</td>
                  <td className="p-2 text-center tabular-nums text-muted-foreground">{b.balls}</td>
                  <td className="p-2 text-center tabular-nums">{b.fours}</td>
                  <td className="p-2 text-center tabular-nums">{b.sixes}</td>
                  <td className="p-2 text-center tabular-nums text-xs">{sr(b.runs, b.balls)}</td>
                </tr>
              ))}
              {batsmenArr.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">No batting data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bowling */}
      <div>
        <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Bowling</h4>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium text-xs text-muted-foreground">Bowler</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">O</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">R</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">W</th>
                <th className="text-center p-2 font-medium text-xs text-muted-foreground">Eco</th>
              </tr>
            </thead>
            <tbody>
              {bowlersArr.map((b) => (
                <tr key={b.player?.id} className="border-t">
                  <td className="p-2 font-medium">{b.player?.name}</td>
                  <td className="p-2 text-center tabular-nums text-muted-foreground">{oversDisplay(b.balls)}</td>
                  <td className="p-2 text-center tabular-nums">{b.runs}</td>
                  <td className="p-2 text-center font-bold tabular-nums text-cricket-wicket">{b.wickets}</td>
                  <td className="p-2 text-center tabular-nums text-xs">{eco(b.runs, b.balls)}</td>
                </tr>
              ))}
              {bowlersArr.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">No bowling data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function MatchPage() {
  const { id: matchId } = useParams<{ id: string }>()
  const { profile } = useAuthStore()
  const { setTheme } = useAppStore()

  const [match, setMatch] = useState<Match | null>(null)
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null)
  const [allInnings, setAllInnings] = useState<Innings[]>([])
  const [playingXI, setPlayingXI] = useState<PlayingXI[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  // Scoring state
  const [strikerId, setStrikerId] = useState<string | null>(null)
  const [nonStrikerId, setNonStrikerId] = useState<string | null>(null)
  const [bowlerId, setBowlerId] = useState<string | null>(null)
  const [currentOverBalls, setCurrentOverBalls] = useState<BallEvent[]>([])
  const [wicketDialog, setWicketDialog] = useState(false)
  const [wicketType, setWicketType] = useState<WicketType>('bowled')
  const [fielderId, setFielderId] = useState<string>('')
  const [newBatsmanId, setNewBatsmanId] = useState<string>('')
  const [pendingExtra, setPendingExtra] = useState<{ type: ExtraType; runs: number } | null>(null)
  const [selectBowlerDialog, setSelectBowlerDialog] = useState(false)
  const [setupDialog, setSetupDialog] = useState(false)
  const [tossDialog, setTossDialog] = useState(false)
  const [tossWinnerId, setTossWinnerId] = useState('')
  const [tossDecision, setTossDecision] = useState<TossDecision>('bat')
  const [selectXIDialog, setSelectXIDialog] = useState(false)
  const [xiTeamId, setXITeamId] = useState<string>('')
  const [xiPlayerIds, setXIPlayerIds] = useState<string[]>([])
  const scoringRef = useRef(false)
  const restoredRef = useRef(false)

  const isOrganizer = match?.tournament?.organizer_id === profile?.id

  const fetchMatch = useCallback(async () => {
    if (!matchId) return
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        team_a:teams!matches_team_a_id_fkey(*, players(*)),
        team_b:teams!matches_team_b_id_fkey(*, players(*)),
        tournament:tournaments(*)
      `)
      .eq('id', matchId)
      .single()

    if (data) {
      setMatch(data as Match)
      setTheme((data as any).tournament?.theme || 'default')
      const allP = [
        ...((data as any).team_a?.players || []),
        ...((data as any).team_b?.players || []),
      ]
      setAllPlayers(allP)
    }
  }, [matchId, setTheme])

  const fetchInnings = useCallback(async () => {
    if (!matchId) return
    const { data } = await supabase
      .from('innings')
      .select(`*, batting_team:teams!innings_batting_team_id_fkey(*), bowling_team:teams!innings_bowling_team_id_fkey(*), ball_events(*, batsman:players!ball_events_batsman_id_fkey(*), bowler:players!ball_events_bowler_id_fkey(*))`)
      .eq('match_id', matchId)
      .order('innings_number')

    if (data) {
      // Recalculate stats for each innings to guarantee correctness
      const updatedInningsList = (data as Innings[]).map((inn) => {
        const balls = inn.ball_events || []
        const totalRuns = balls.reduce((s, b) => s + b.runs + b.extra_runs, 0)
        const wickets = balls.filter((b) => b.is_wicket).length
        const extras = balls.reduce((s, b) => s + b.extra_runs, 0)
        const legalBalls = balls.filter((b) => !b.extra_type || b.extra_type === 'bye' || b.extra_type === 'leg_bye').length
        const oversCompleted = Math.floor(legalBalls / 6) + (legalBalls % 6) / 10

        const hasMismatch = 
          inn.total_runs !== totalRuns || 
          inn.wickets !== wickets || 
          inn.extras !== extras || 
          Number(inn.overs_completed) !== oversCompleted

        if (hasMismatch && isOrganizer) {
          // Sync database in background
          supabase.from('innings').update({
            total_runs: totalRuns,
            wickets: wickets,
            extras: extras,
            overs_completed: oversCompleted
          }).eq('id', inn.id).then(() => {})
        }

        return {
          ...inn,
          total_runs: totalRuns,
          wickets: wickets,
          extras: extras,
          overs_completed: oversCompleted
        }
      })

      setAllInnings(updatedInningsList)
      const active = updatedInningsList.find((i) => !i.is_complete) || updatedInningsList[updatedInningsList.length - 1]
      if (active) {
        setCurrentInnings(active)
        const balls = active.ball_events || []
        const currentOver = active.overs_completed ? Math.floor(Number(active.overs_completed)) : 0
        setCurrentOverBalls(balls.filter((b) => b.over_number === currentOver))
      }
    }
  }, [matchId, isOrganizer])

  const fetchPlayingXI = useCallback(async () => {
    if (!matchId) return
    const { data } = await supabase
      .from('playing_xi')
      .select('*, player:players(*)')
      .eq('match_id', matchId)
    if (data) setPlayingXI(data as PlayingXI[])
  }, [matchId])

  useEffect(() => {
    Promise.all([fetchMatch(), fetchInnings(), fetchPlayingXI()]).then(() => setLoading(false))

    // Realtime subscription
    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ball_events' }, () => {
        fetchInnings()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'innings' }, () => {
        fetchInnings()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      setTheme('default')
    }
  }, [fetchMatch, fetchInnings, fetchPlayingXI])

  // Restore striker/non-striker/bowler when reopening a live match
  useEffect(() => {
    if (!matchId || !currentInnings || currentInnings.is_complete || loading) return
    if (restoredRef.current) return
    restoredRef.current = true

    // Try localStorage first (most accurate — includes post-wicket new batsman)
    const saved = localStorage.getItem(`match-scoring-${matchId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.inningsId === currentInnings.id) {
          if (parsed.strikerId) setStrikerId(parsed.strikerId)
          if (parsed.nonStrikerId) setNonStrikerId(parsed.nonStrikerId)
          if (parsed.bowlerId) setBowlerId(parsed.bowlerId)
          return
        }
      } catch { /* ignore parse errors */ }
    }

    // Fallback: derive from ball events
    const balls = currentInnings.ball_events || []
    if (balls.length === 0) return

    // Find not-out batsmen
    const outBatsmenIds = new Set<string>()
    balls.forEach(b => { if (b.is_wicket && b.batsman_id) outBatsmenIds.add(b.batsman_id) })

    const batsmenOrder: string[] = []
    balls.forEach(b => {
      if (b.batsman_id && !batsmenOrder.includes(b.batsman_id)) {
        batsmenOrder.push(b.batsman_id)
      }
    })
    const notOutBatsmen = batsmenOrder.filter(id => !outBatsmenIds.has(id))

    if (notOutBatsmen.length >= 2) {
      const lastBall = balls[balls.length - 1]
      let derivedStriker: string | null = lastBall.batsman_id ?? null
      let derivedNonStriker: string | null = notOutBatsmen.find(id => id !== derivedStriker) ?? null

      // Account for strike rotation on odd runs
      const runsToRotate = (lastBall.extra_type === 'bye' || lastBall.extra_type === 'leg_bye')
        ? lastBall.extra_runs : lastBall.runs
      if (runsToRotate % 2 !== 0) {
        const tmp = derivedStriker
        derivedStriker = derivedNonStriker
        derivedNonStriker = tmp
      }

      // Account for end-of-over strike rotation
      const lastOverBalls = balls.filter(b => b.over_number === lastBall.over_number)
      const legalInLastOver = lastOverBalls.filter(
        b => !b.extra_type || b.extra_type === 'bye' || b.extra_type === 'leg_bye'
      ).length
      if (legalInLastOver >= 6) {
        const tmp = derivedStriker
        derivedStriker = derivedNonStriker
        derivedNonStriker = tmp
      }

      if (derivedStriker) setStrikerId(derivedStriker)
      if (derivedNonStriker) setNonStrikerId(derivedNonStriker)
    } else if (notOutBatsmen.length === 1) {
      setStrikerId(notOutBatsmen[0])
    }

    // Restore bowler from current over
    const currentOver = Math.floor(Number(currentInnings.overs_completed))
    const currentOverBallsList = balls.filter(b => b.over_number === currentOver)
    if (currentOverBallsList.length > 0) {
      setBowlerId(currentOverBallsList[0].bowler_id ?? null)
    }
  }, [matchId, currentInnings, loading])

  // Persist player selections to localStorage for session recovery
  useEffect(() => {
    if (!matchId || !currentInnings) return
    if (!strikerId && !nonStrikerId && !bowlerId) return
    localStorage.setItem(`match-scoring-${matchId}`, JSON.stringify({
      strikerId, nonStrikerId, bowlerId, inningsId: currentInnings.id
    }))
  }, [matchId, strikerId, nonStrikerId, bowlerId, currentInnings])

  const doToss = async () => {
    if (!match || !tossWinnerId) return
    const battingFirstId = tossDecision === 'bat' ? tossWinnerId : (tossWinnerId === match.team_a_id ? match.team_b_id : match.team_a_id)
    await supabase.from('matches').update({
      toss_winner_id: tossWinnerId,
      toss_decision: tossDecision,
      batting_first_id: battingFirstId,
      status: 'live',
    }).eq('id', match.id)
    setTossDialog(false)
    fetchMatch()
  }

  async function startInnings(battingTeamId: string, bowlingTeamId: string, inningsNum: number) {
    const { data } = await supabase.from('innings').insert({
      match_id: matchId,
      innings_number: inningsNum,
      batting_team_id: battingTeamId,
      bowling_team_id: bowlingTeamId,
    }).select().single()
    if (data) {
      setCurrentInnings(data as Innings)
      setStrikerId(null)
      setNonStrikerId(null)
      setBowlerId(null)
      setCurrentOverBalls([])
      restoredRef.current = true // Don't restore stale state for new innings
      if (matchId) localStorage.removeItem(`match-scoring-${matchId}`)
      fetchInnings()
    }
  }

  const savePlayingXI = async () => {
    if (!xiTeamId || xiPlayerIds.length === 0) return
    await supabase.from('playing_xi').delete().eq('match_id', matchId).eq('team_id', xiTeamId)
    await supabase.from('playing_xi').insert(
      xiPlayerIds.map((pid, i) => ({
        match_id: matchId,
        player_id: pid,
        team_id: xiTeamId,
        batting_order: i + 1,
      }))
    )
    setSelectXIDialog(false)
    fetchPlayingXI()
  }

  async function checkAndEndInnings(newOvers: number, newWickets: number, newTotalRuns: number) {
    if (!currentInnings || !match) return false

    // 1. All out check
    const currentBattingXI = playingXI.filter((xi) => xi.team_id === currentInnings.batting_team_id)
    const battingXIList = currentBattingXI.length > 0
      ? currentBattingXI
      : allPlayers.filter((p) => p.team_id === currentInnings.batting_team_id)
    const maxWickets = battingXIList.length > 0 ? Math.min(10, battingXIList.length - 1) : 10
    const isAllOut = newWickets >= maxWickets

    // 2. Overs completed check
    const isOversCompleted = newOvers >= match.overs

    // 3. Target chased check (only in 2nd innings)
    // Find the COMPLETED 1st innings (different from currentInnings)
    const completedFirstInnings = allInnings.find(
      (i) => i.id !== currentInnings.id && i.is_complete
    )
    const targetVal = completedFirstInnings ? completedFirstInnings.total_runs + 1 : null
    const isTargetChased = targetVal !== null && newTotalRuns >= targetVal

    if (isAllOut || isOversCompleted || isTargetChased) {
      await endInnings()
      return true
    }
    return false
  }

  async function recordBall(runs: number, extraType?: ExtraType, extraRuns = 0) {
    if (!currentInnings || !strikerId || !bowlerId) return
    if (scoringRef.current) return // Prevent rapid double-tap race condition
    scoringRef.current = true

    try {
      const overNum = Math.floor(Number(currentInnings.overs_completed))
      const ballNum = currentOverBalls.length + 1

      const { data: ball } = await supabase.from('ball_events').insert({
        innings_id: currentInnings.id,
        over_number: overNum,
        ball_number: ballNum,
        batsman_id: strikerId,
        bowler_id: bowlerId,
        runs,
        extra_type: extraType || null,
        extra_runs: extraRuns,
        is_wicket: false,
        commentary: buildCommentary(runs, extraType, extraRuns),
      }).select().single()

      if (ball) {
        const isLegalBall = !extraType || extraType === 'bye' || extraType === 'leg_bye'
        // Derive legal ball count from local currentOverBalls to avoid stale overs_completed
        const currentLegalBalls = currentOverBalls.filter(
          (b) => !b.extra_type || b.extra_type === 'bye' || b.extra_type === 'leg_bye'
        ).length
        const newLegalBallsCount = isLegalBall ? currentLegalBalls + 1 : currentLegalBalls
        const overCompleted = newLegalBallsCount >= 6

        const newTotalRuns = currentInnings.total_runs + runs + extraRuns
        const newExtras = currentInnings.extras + extraRuns
        let newOvers = currentInnings.overs_completed

        if (isLegalBall) {
          const oversInt = Math.floor(Number(currentInnings.overs_completed))
          if (newLegalBallsCount >= 6) {
            newOvers = oversInt + 1
          } else {
            newOvers = oversInt + newLegalBallsCount / 10
          }
        }

        await supabase.from('innings').update({
          total_runs: newTotalRuns,
          extras: newExtras,
          overs_completed: newOvers,
        }).eq('id', currentInnings.id)

        // Rotate strike on odd runs (runs off bat, or odd byes/leg_byes)
        const runsToRotate = (extraType === 'bye' || extraType === 'leg_bye') ? extraRuns : runs
        if (runsToRotate % 2 !== 0) {
          const tmp = strikerId
          setStrikerId(nonStrikerId)
          setNonStrikerId(tmp)
        }

        // Check if innings completed automatically
        const inningsEnded = await checkAndEndInnings(newOvers, currentInnings.wickets, newTotalRuns)

        if (!inningsEnded) {
          // End of over
          if (overCompleted) {
            const tmp = strikerId
            setStrikerId(nonStrikerId)
            setNonStrikerId(tmp)
            setCurrentOverBalls([])
            setSelectBowlerDialog(true)
          } else {
            setCurrentOverBalls((prev) => [...prev, ball as BallEvent])
          }
        }

        await fetchInnings()
      }
    } finally {
      scoringRef.current = false
    }
  }

  const confirmExtra = () => {
    if (!pendingExtra) return
    const { type, runs } = pendingExtra
    if (type === 'wide') {
      // Wide penalty (1) + any additional runs are all extras
      recordBall(0, 'wide', 1 + runs)
    } else if (type === 'no_ball') {
      // No ball penalty (1) extra + batsman runs score normally
      recordBall(runs, 'no_ball', 1)
    } else {
      // Bye or Leg Bye: batsman gets 0 runs, team gets 'runs' as extras
      recordBall(0, type, runs)
    }
    setPendingExtra(null)
  }

  async function recordWicket() {
    if (!currentInnings || !strikerId || !bowlerId) return
    if (scoringRef.current) return // Prevent rapid double-tap race condition
    scoringRef.current = true

    try {
      const overNum = Math.floor(Number(currentInnings.overs_completed))
      const ballNum = currentOverBalls.length + 1

      const { data: ball } = await supabase.from('ball_events').insert({
        innings_id: currentInnings.id,
        over_number: overNum,
        ball_number: ballNum,
        batsman_id: strikerId,
        bowler_id: bowlerId,
        runs: 0,
        is_wicket: true,
        wicket_type: wicketType,
        fielder_id: fielderId || null,
        commentary: `OUT! ${players(strikerId)?.name} - ${wicketType.replace('_', ' ')}`,
      }).select().single()

      const newWickets = currentInnings.wickets + 1
      // Derive legal ball count from local currentOverBalls to avoid stale state
      const currentLegalBalls = currentOverBalls.filter(
        (b) => !b.extra_type || b.extra_type === 'bye' || b.extra_type === 'leg_bye'
      ).length
      const newLegalBallsCount = currentLegalBalls + 1
      const overCompleted = newLegalBallsCount >= 6

      const oversInt = Math.floor(Number(currentInnings.overs_completed))
      const newOversFloat = overCompleted ? oversInt + 1 : oversInt + newLegalBallsCount / 10

      await supabase.from('innings').update({
        wickets: newWickets,
        overs_completed: newOversFloat,
      }).eq('id', currentInnings.id)

      setWicketDialog(false)
      
      let finalStrikerId = strikerId
      if (newBatsmanId) {
        finalStrikerId = newBatsmanId
        setStrikerId(newBatsmanId)
      }
      setNewBatsmanId('')
      setWicketType('bowled')
      setFielderId('')

      // Check if innings completed automatically
      const inningsEnded = await checkAndEndInnings(newOversFloat, newWickets, currentInnings.total_runs)

      if (!inningsEnded) {
        if (overCompleted) {
          setStrikerId(nonStrikerId)
          setNonStrikerId(finalStrikerId)
          setCurrentOverBalls([])
          setSelectBowlerDialog(true)
        } else {
          if (ball) {
            setCurrentOverBalls((prev) => [...prev, ball as BallEvent])
          }
        }
      }

      await fetchInnings()
    } finally {
      scoringRef.current = false
    }
  }

  async function undoLastBall() {
    if (!currentInnings) return
    const balls = currentInnings.ball_events || []
    if (balls.length === 0) return
    const last = balls[balls.length - 1]
    await supabase.from('ball_events').delete().eq('id', last.id)

    const runsBack = last.runs + last.extra_runs
    const wicketsBack = last.is_wicket ? 1 : 0
    const isLegal = !last.extra_type || last.extra_type === 'bye' || last.extra_type === 'leg_bye'

    let oversBack = Number(currentInnings.overs_completed)
    if (isLegal) {
      const tenths = Math.round((oversBack % 1) * 10)
      if (tenths === 0) {
        oversBack = Math.floor(oversBack) - 1 + 0.5
      } else {
        oversBack = Math.floor(oversBack) + (tenths - 1) / 10
      }
    }

    await supabase.from('innings').update({
      total_runs: Math.max(0, currentInnings.total_runs - runsBack),
      wickets: Math.max(0, currentInnings.wickets - wicketsBack),
      extras: Math.max(0, currentInnings.extras - last.extra_runs),
      overs_completed: Math.max(0, oversBack),
    }).eq('id', currentInnings.id)

    fetchInnings()
  }

  async function updatePlayerStats() {
    if (!match) return
    const tournamentId = match.tournament_id

    try {
      // Fetch all ball events for this match across both innings
      const { data: inningsData, error: inningsError } = await supabase
        .from('innings')
        .select('*, ball_events(*)')
        .eq('match_id', match.id)

      if (inningsError || !inningsData) {
        console.error('Failed to fetch innings for stats:', inningsError?.message)
        return
      }

      // Collect all participating player IDs (batsmen + bowlers)
      const playerMap: Record<string, {
        runs: number; balls_faced: number; fours: number; sixes: number;
        wickets: number; overs_balls: number; runs_conceded: number; maidens: number;
        highest_score: number;
      }> = {}

      const ensurePlayer = (pid: string) => {
        if (!playerMap[pid]) {
          playerMap[pid] = {
            runs: 0, balls_faced: 0, fours: 0, sixes: 0,
            wickets: 0, overs_balls: 0, runs_conceded: 0, maidens: 0,
            highest_score: 0,
          }
        }
      }

      // Per-innings batsman scores for highest score tracking
      const batsmanInningsRuns: Record<string, number> = {}

      for (const inn of inningsData) {
        const balls = inn.ball_events || []

        // Track per-over runs for maiden calculation
        const bowlerOverRuns: Record<string, Record<number, number>> = {}

        for (const b of balls) {
          // Batting stats
          if (b.batsman_id) {
            ensurePlayer(b.batsman_id)
            const bat = playerMap[b.batsman_id]
            if (b.extra_type !== 'wide') bat.balls_faced++
            if (!b.extra_type || b.extra_type === 'no_ball') {
              bat.runs += b.runs
              if (!batsmanInningsRuns[b.batsman_id]) batsmanInningsRuns[b.batsman_id] = 0
              batsmanInningsRuns[b.batsman_id] += b.runs
              if (b.runs === 4) bat.fours++
              if (b.runs === 6) bat.sixes++
            }
          }

          // Bowling stats
          if (b.bowler_id) {
            ensurePlayer(b.bowler_id)
            const bowl = playerMap[b.bowler_id]
            if (!b.extra_type || b.extra_type === 'bye' || b.extra_type === 'leg_bye') {
              bowl.overs_balls++
            }
            const bowlerRunsConceded = (b.extra_type === 'bye' || b.extra_type === 'leg_bye')
              ? 0 : (b.runs + (b.extra_runs || 0))
            bowl.runs_conceded += bowlerRunsConceded
            if (b.is_wicket && b.wicket_type !== 'run_out') bowl.wickets++

            // Track over runs for maidens
            if (!bowlerOverRuns[b.bowler_id]) bowlerOverRuns[b.bowler_id] = {}
            if (!bowlerOverRuns[b.bowler_id][b.over_number]) bowlerOverRuns[b.bowler_id][b.over_number] = 0
            bowlerOverRuns[b.bowler_id][b.over_number] += bowlerRunsConceded
          }
        }

        // Calculate maidens
        for (const [bowlerId, overs] of Object.entries(bowlerOverRuns)) {
          ensurePlayer(bowlerId)
          for (const runs of Object.values(overs)) {
            if (runs === 0) playerMap[bowlerId].maidens++
          }
        }
      }

      // Update highest score
      for (const [pid, runs] of Object.entries(batsmanInningsRuns)) {
        if (playerMap[pid]) {
          playerMap[pid].highest_score = Math.max(playerMap[pid].highest_score, runs)
        }
      }

      // Upsert player_stats for each player
      for (const [playerId, stats] of Object.entries(playerMap)) {
        const oversFloat = Math.floor(stats.overs_balls / 6) + (stats.overs_balls % 6) / 10

        // Check if entry exists — use maybeSingle to avoid error when no row found
        const { data: existing } = await supabase
          .from('player_stats')
          .select('*')
          .eq('player_id', playerId)
          .eq('tournament_id', tournamentId)
          .maybeSingle()

        if (existing) {
          // Update existing stats
          const { error: updateErr } = await supabase.from('player_stats').update({
            matches_played: existing.matches_played + 1,
            runs: existing.runs + stats.runs,
            balls_faced: existing.balls_faced + stats.balls_faced,
            fours: existing.fours + stats.fours,
            sixes: existing.sixes + stats.sixes,
            fifties: existing.fifties + (stats.runs >= 50 && stats.runs < 100 ? 1 : 0),
            centuries: existing.centuries + (stats.runs >= 100 ? 1 : 0),
            highest_score: Math.max(existing.highest_score, stats.highest_score),
            wickets: existing.wickets + stats.wickets,
            overs_bowled: Number(existing.overs_bowled) + oversFloat,
            runs_conceded: existing.runs_conceded + stats.runs_conceded,
            maidens: existing.maidens + stats.maidens,
          }).eq('id', existing.id)
          if (updateErr) console.error(`Failed to update stats for ${playerId}:`, updateErr.message)
        } else {
          // Insert new entry
          const { error: insertErr } = await supabase.from('player_stats').insert({
            player_id: playerId,
            tournament_id: tournamentId,
            matches_played: 1,
            runs: stats.runs,
            balls_faced: stats.balls_faced,
            fours: stats.fours,
            sixes: stats.sixes,
            fifties: stats.runs >= 50 && stats.runs < 100 ? 1 : 0,
            centuries: stats.runs >= 100 ? 1 : 0,
            highest_score: stats.highest_score,
            wickets: stats.wickets,
            overs_bowled: oversFloat,
            runs_conceded: stats.runs_conceded,
            maidens: stats.maidens,
          })
          if (insertErr) console.error(`Failed to insert stats for ${playerId}:`, insertErr.message)
        }
      }

      console.log('Player stats updated successfully for match', match.id)
    } catch (err) {
      console.error('Error updating player stats:', err)
    }
  }

  async function endInnings() {
    if (!currentInnings || !match) return

    // Capture the latest state of the current innings before marking it complete
    const completedInnings = { ...currentInnings }

    await supabase.from('innings').update({ is_complete: true }).eq('id', currentInnings.id)

    // Determine if this is 1st or 2nd innings ending
    const isFirstInnings = allInnings.length === 0 ||
      (allInnings.length === 1 && allInnings[0].id === currentInnings.id)

    if (isFirstInnings) {
      // Start 2nd innings — the other team bats
      const nextBattingTeamId = currentInnings.batting_team_id === match.team_a_id
        ? match.team_b_id : match.team_a_id
      const nextBowlingTeamId = currentInnings.batting_team_id
      await startInnings(nextBattingTeamId, nextBowlingTeamId, 2)
    } else {
      // 2nd innings ended — determine the winner
      // Find the 1st innings data (the one that is NOT the current innings)
      const firstInnings = allInnings.find((i) => i.id !== currentInnings.id) || allInnings[0]
      const secondInnings = completedInnings

      const firstInnsTeamId = firstInnings.batting_team_id
      const secondInnsTeamId = secondInnings.batting_team_id
      const firstInnsRuns = firstInnings.total_runs
      const secondInnsRuns = secondInnings.total_runs

      const teamA = (match as any).team_a
      const teamB = (match as any).team_b
      const getTeamName = (teamId: string) =>
        teamId === teamA?.id ? teamA?.team_name : teamB?.team_name

      let winnerId: string | null = null
      let resultSummary = 'Match tied'

      if (secondInnsRuns > firstInnsRuns) {
        // Chasing team won
        winnerId = secondInnsTeamId
        const wicketsRemaining = 10 - secondInnings.wickets
        resultSummary = `${getTeamName(winnerId)} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`
      } else if (firstInnsRuns > secondInnsRuns) {
        // Defending team won
        winnerId = firstInnsTeamId
        const runMargin = firstInnsRuns - secondInnsRuns
        resultSummary = `${getTeamName(winnerId)} won by ${runMargin} run${runMargin !== 1 ? 's' : ''}`
      }

      await supabase.from('matches').update({
        status: 'completed',
        winner_id: winnerId,
        result_summary: resultSummary,
      }).eq('id', match.id)

      // Update player statistics for this match
      await updatePlayerStats()

      fetchMatch()
    }
    fetchInnings()
  }

  const players = (id: string | null) => allPlayers.find((p) => p.id === id)
  const strikerPlayer = players(strikerId)
  const nonStrikerPlayer = players(nonStrikerId)
  const bowlerPlayer = players(bowlerId)

  const battingTeamId = currentInnings?.batting_team_id
  const bowlingTeamId = currentInnings?.bowling_team_id

  const battingXISet = playingXI.filter((xi) => xi.team_id === battingTeamId)
  const bowlingXISet = playingXI.filter((xi) => xi.team_id === bowlingTeamId)

  // Fall back to all team players when no Playing XI has been set for a team
  const battingXI = battingXISet.length > 0
    ? battingXISet
    : allPlayers.filter((p) => p.team_id === battingTeamId).map((p) => ({ player_id: p.id, player: p, team_id: battingTeamId! }))
  const bowlingXI = bowlingXISet.length > 0
    ? bowlingXISet
    : allPlayers.filter((p) => p.team_id === bowlingTeamId).map((p) => ({ player_id: p.id, player: p, team_id: bowlingTeamId! }))

  const availableBatsmen = battingXI.filter((xi) => xi.player_id !== strikerId && xi.player_id !== nonStrikerId)

  const buildCommentary = (runs: number, extra?: ExtraType, extraRuns = 0) => {
    if (extra === 'wide') {
      const additional = extraRuns - 1
      return additional > 0
        ? `Wide + ${additional} run${additional > 1 ? 's' : ''} — ${extraRuns} extras`
        : `Wide ball — +1 extra`
    }
    if (extra === 'no_ball') {
      return runs > 0
        ? `No ball! ${runs} run${runs > 1 ? 's' : ''} to batsman (+1 penalty)`
        : `No ball! — +1 extra`
    }
    if (runs === 4) return `FOUR! Boundary hit`
    if (runs === 6) return `SIX! Maximum!`
    if (runs === 0) return `Dot ball`
    return `${runs} run${runs !== 1 ? 's' : ''}`
  }

  const inns1 = allInnings[0]
  const inns2 = allInnings[1]
  const target = inns1?.is_complete && !inns2 ? inns1.total_runs + 1 : null
  const runsNeeded = target && currentInnings ? target - currentInnings.total_runs : null
  const ballsLeft = match && currentInnings
    ? match.overs * 6 - Math.floor(Number(currentInnings.overs_completed)) * 6 - Math.round((Number(currentInnings.overs_completed) % 1) * 10)
    : 0
  const rrr = runsNeeded && ballsLeft > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : null
  const crr = currentInnings && Number(currentInnings.overs_completed) > 0
    ? (currentInnings.total_runs / Number(currentInnings.overs_completed)).toFixed(2)
    : '0.00'

  const canScore = isOrganizer && match?.status === 'live' && !!currentInnings && !currentInnings.is_complete && !!strikerId && !!bowlerId

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
    )
  }

  if (!match) return <div className="text-center py-16 text-muted-foreground">Match not found.</div>

  const teamA = (match as any).team_a
  const teamB = (match as any).team_b

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Match Header */}
      <Card className="overflow-hidden">
        <div className="bg-primary p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">
                {match.match_type} · {match.format}
              </Badge>
              {match.status === 'live' && (
                <Badge className="bg-cricket-live/30 text-white border-0 text-xs flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-white live-indicator inline-block" />
                  LIVE
                </Badge>
              )}
            </div>
            <span className="text-xs text-primary-foreground/70">{match.overs} overs</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Team A */}
            <div className={cn(
              'rounded-lg p-3',
              currentInnings?.batting_team_id === teamA?.id ? 'bg-primary-foreground/15' : 'bg-transparent'
            )}>
              <p className="text-primary-foreground/80 text-xs font-medium mb-1">{teamA?.team_name}</p>
              {inns1 ? (
                <>
                  <p className="text-primary-foreground text-2xl font-bold tabular-nums">
                    {inns1.batting_team_id === teamA?.id ? `${inns1.total_runs}/${inns1.wickets}` :
                      inns2?.batting_team_id === teamA?.id ? `${inns2.total_runs}/${inns2.wickets}` : '-'}
                  </p>
                  <p className="text-primary-foreground/70 text-xs">
                    {inns1.batting_team_id === teamA?.id
                      ? `(${Number(inns1.overs_completed).toFixed(1)} ov)`
                      : inns2?.batting_team_id === teamA?.id
                      ? `(${Number(inns2.overs_completed).toFixed(1)} ov)` : ''}
                  </p>
                </>
              ) : (
                <p className="text-primary-foreground/50 text-lg">Yet to bat</p>
              )}
            </div>

            <div className={cn(
              'rounded-lg p-3',
              currentInnings?.batting_team_id === teamB?.id ? 'bg-primary-foreground/15' : 'bg-transparent'
            )}>
              <p className="text-primary-foreground/80 text-xs font-medium mb-1">{teamB?.team_name}</p>
              {inns1 ? (
                <>
                  <p className="text-primary-foreground text-2xl font-bold tabular-nums">
                    {inns1.batting_team_id === teamB?.id ? `${inns1.total_runs}/${inns1.wickets}` :
                      inns2?.batting_team_id === teamB?.id ? `${inns2.total_runs}/${inns2.wickets}` : '-'}
                  </p>
                  <p className="text-primary-foreground/70 text-xs">
                    {inns1.batting_team_id === teamB?.id
                      ? `(${Number(inns1.overs_completed).toFixed(1)} ov)`
                      : inns2?.batting_team_id === teamB?.id
                      ? `(${Number(inns2.overs_completed).toFixed(1)} ov)` : ''}
                  </p>
                </>
              ) : (
                <p className="text-primary-foreground/50 text-lg">Yet to bat</p>
              )}
            </div>
          </div>

          {/* Result / target */}
          {match.status === 'completed' && match.result_summary && (
            <div className="mt-3 rounded-lg bg-primary-foreground/10 p-2 text-center">
              <p className="text-primary-foreground text-sm font-semibold">{match.result_summary}</p>
            </div>
          )}
          {runsNeeded !== null && runsNeeded > 0 && (
            <div className="mt-3 rounded-lg bg-primary-foreground/10 p-2 text-center">
              <p className="text-primary-foreground text-sm">
                {currentInnings?.batting_team?.team_name} need {runsNeeded} runs from {ballsLeft} balls
              </p>
              <p className="text-primary-foreground/70 text-xs">RRR: {rrr} | CRR: {crr}</p>
            </div>
          )}
        </div>

        {/* Toss info */}
        {match.toss_winner_id && (
          <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground text-center">
            {(match.toss_winner_id === teamA?.id ? teamA?.team_name : teamB?.team_name)} won toss and elected to {match.toss_decision} first
          </div>
        )}
      </Card>

      {/* Organizer controls */}
      {isOrganizer && match.status === 'scheduled' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    setXITeamId(teamA?.id)
                    setSelectXIDialog(true)
                  }}
                  variant="outline"
                >
                  <Users className="size-4" />
                  {teamA?.team_name} XI
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    setXITeamId(teamB?.id)
                    setSelectXIDialog(true)
                  }}
                  variant="outline"
                >
                  <Users className="size-4" />
                  {teamB?.team_name} XI
                </Button>
              </div>
              <Button
                className="w-full gap-1.5"
                onClick={() => {
                  setTossWinnerId(teamA?.id)
                  setTossDialog(true)
                }}
              >
                <Trophy className="size-4" />
                Do Toss & Start Match
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Innings */}
      {isOrganizer && match.status === 'live' && !currentInnings && match.batting_first_id && (
        <Card>
          <CardContent className="py-4 text-center">
            <Button onClick={() => {
              const bowlerTeamId = match.batting_first_id === match.team_a_id ? match.team_b_id : match.team_a_id
              startInnings(match.batting_first_id!, bowlerTeamId, 1)
            }}>
              Start First Innings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Over + Live Score */}
      {currentInnings && !currentInnings.is_complete && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Over {Math.floor(Number(currentInnings.overs_completed)) + 1}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {Number(currentInnings.overs_completed).toFixed(1)}/{match.overs}
              </span>
            </div>
            <OverTracker balls={currentOverBalls} />

            <Separator className="my-3" />

            {/* Batsmen */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Striker */}
              <div
                className={cn(
                  'rounded-lg p-2.5 cursor-pointer transition-colors',
                  strikerId ? 'bg-primary/10 border border-primary/30' : 'bg-muted border border-dashed border-border'
                )}
                onClick={() => !strikerId && isOrganizer && setSetupDialog(true)}
              >
                <p className="text-xs text-muted-foreground mb-0.5">Striker *</p>
                <p className="font-semibold text-sm truncate">{strikerPlayer?.name || 'Select'}</p>
                {strikerPlayer && (
                  <p className="text-xs text-muted-foreground">
                    {(currentInnings.ball_events || []).filter((b) => b.batsman_id === strikerId && (b.extra_type === null || b.extra_type === 'no_ball')).reduce((s, b) => s + b.runs, 0)} (
                    {(currentInnings.ball_events || []).filter((b) => b.batsman_id === strikerId && b.extra_type !== 'wide').length})
                  </p>
                )}
              </div>
              {/* Non-striker */}
              <div
                className={cn(
                  'rounded-lg p-2.5',
                  nonStrikerId ? 'bg-muted/50' : 'bg-muted border border-dashed border-border'
                )}
              >
                <p className="text-xs text-muted-foreground mb-0.5">Non-striker</p>
                <p className="font-semibold text-sm truncate">{nonStrikerPlayer?.name || 'Select'}</p>
                {nonStrikerPlayer && (
                  <p className="text-xs text-muted-foreground">
                    {(currentInnings.ball_events || []).filter((b) => b.batsman_id === nonStrikerId && (b.extra_type === null || b.extra_type === 'no_ball')).reduce((s, b) => s + b.runs, 0)} (
                    {(currentInnings.ball_events || []).filter((b) => b.batsman_id === nonStrikerId && b.extra_type !== 'wide').length})
                  </p>
                )}
              </div>
            </div>

            {/* Bowler */}
            <div
              className={cn(
                'rounded-lg p-2.5 transition-colors',
                isOrganizer && currentOverBalls.length === 0
                  ? 'cursor-pointer hover:bg-muted/70'
                  : 'cursor-not-allowed opacity-75',
                bowlerId ? 'bg-muted/50' : 'bg-muted border border-dashed border-border'
              )}
              onClick={() => {
                if (isOrganizer) {
                  if (currentOverBalls.length > 0) return
                  setSelectBowlerDialog(true)
                }
              }}
              title={currentOverBalls.length > 0 ? 'Cannot change bowler mid-over' : undefined}
            >
              <p className="text-xs text-muted-foreground mb-0.5">
                Bowler{currentOverBalls.length > 0 && <span className="text-[10px] text-orange-500 font-medium ml-1.5">(Locked mid-over)</span>}
              </p>
              <p className="font-semibold text-sm">{bowlerPlayer?.name || 'Select bowler'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoring Panel — MAIN USP */}
      {isOrganizer && canScore && (
        <Card>
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Score Ball</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 pb-4">
            {pendingExtra ? (
              /* ── Extra runs picker (Wide / No Ball) ── */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {pendingExtra.type === 'wide'
                        ? 'Wide'
                        : pendingExtra.type === 'no_ball'
                        ? 'No Ball'
                        : pendingExtra.type === 'bye'
                        ? 'Bye'
                        : 'Leg Bye'}{' '}
                      — runs off this ball?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pendingExtra.type === 'wide'
                        ? 'All runs count as extras (+1 penalty)'
                        : pendingExtra.type === 'no_ball'
                        ? 'Runs go to batsman, +1 penalty extra'
                        : 'Runs count as extras, no bowler penalty'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingExtra(null)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPendingExtra({ ...pendingExtra, runs: r })}
                      className={cn(
                        'h-12 rounded-xl font-bold text-lg transition-all active:scale-95',
                        pendingExtra.runs === r
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : r === 4
                          ? 'bg-cricket-boundary/20 text-cricket-boundary border border-cricket-boundary/30 hover:bg-cricket-boundary/30'
                          : r === 6
                          ? 'bg-cricket-six/20 text-cricket-six border border-cricket-six/30 hover:bg-cricket-six/30'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <Button className="w-full gap-2" onClick={confirmExtra}>
                  Confirm — {pendingExtra.type === 'wide' ? 'Wide' : pendingExtra.type === 'no_ball' ? 'No Ball' : pendingExtra.type === 'bye' ? 'Bye' : 'Leg Bye'}
                  {pendingExtra.runs > 0 ? ` + ${pendingExtra.runs}` : ''} (
                  {pendingExtra.type === 'wide'
                    ? `+${1 + pendingExtra.runs} extras`
                    : pendingExtra.type === 'no_ball'
                    ? pendingExtra.runs > 0
                      ? `${pendingExtra.runs} runs + 1 extra`
                      : '+1 extra'
                    : `+${pendingExtra.runs} extras`}
                  )
                </Button>
              </div>
            ) : (
              <>
                {/* Runs */}
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {[0, 1, 2, 3, 4, 6].map((r) => (
                    <ScoringButton
                      key={r}
                      label={String(r)}
                      variant={r === 4 ? 'boundary' : r === 6 ? 'six' : r === 0 ? 'muted' : 'default'}
                      onClick={() => recordBall(r)}
                    />
                  ))}
                </div>

                {/* Extras */}
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  <ScoringButton
                    label="Wide"
                    variant="extra"
                    onClick={() => setPendingExtra({ type: 'wide', runs: 0 })}
                  />
                  <ScoringButton
                    label="No Ball"
                    variant="extra"
                    onClick={() => setPendingExtra({ type: 'no_ball', runs: 0 })}
                  />
                  <ScoringButton
                    label="Bye"
                    variant="extra"
                    onClick={() => setPendingExtra({ type: 'bye', runs: 0 })}
                  />
                  <ScoringButton
                    label="Leg Bye"
                    variant="extra"
                    onClick={() => setPendingExtra({ type: 'leg_bye', runs: 0 })}
                  />
                </div>

                {/* Wicket + utilities */}
                <div className="grid grid-cols-3 gap-1.5">
                  <ScoringButton
                    label="WICKET"
                    variant="wicket"
                    className="col-span-2 text-base"
                    onClick={() => setWicketDialog(true)}
                  />
                  <ScoringButton
                    label="↩ Undo"
                    variant="muted"
                    onClick={undoLastBall}
                  />
                </div>

                <Separator className="my-3" />

                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      const tmp = strikerId
                      setStrikerId(nonStrikerId)
                      setNonStrikerId(tmp)
                    }}
                  >
                    <ArrowLeftRight className="size-3.5" />
                    Swap
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setSelectBowlerDialog(true)}
                    disabled={currentOverBalls.length > 0}
                    title={currentOverBalls.length > 0 ? 'Cannot change bowler mid-over' : undefined}
                  >
                    <RotateCcw className="size-3.5" />
                    Bowler
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive gap-1"
                    onClick={endInnings}
                  >
                    End Inn.
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup dialog — select opener + bowler */}
      {isOrganizer && match.status === 'live' && currentInnings && !strikerId && (
        <Card className="border-dashed">
          <CardContent className="py-4 text-center">
            <Button onClick={() => setSetupDialog(true)} className="gap-1.5">
              <Users className="size-4" />
              Select Openers & Bowler
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Scorecard + Commentary */}
      <Tabs defaultValue="scorecard">
        <TabsList className="w-full">
          <TabsTrigger value="scorecard" className="flex-1 gap-1.5">
            <BookOpen className="size-3.5" />
            Scorecard
          </TabsTrigger>
          <TabsTrigger value="commentary" className="flex-1 gap-1.5">
            <Activity className="size-3.5" />
            Ball-by-ball
          </TabsTrigger>
        </TabsList>
        <TabsContent value="scorecard" className="mt-3">
          <ScorecardTab innings={currentInnings} players={allPlayers} />
        </TabsContent>
        <TabsContent value="commentary" className="mt-3">
          <div className="space-y-1">
            {(currentInnings?.ball_events || []).slice().reverse().map((b, i) => (
              <div key={b.id} className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg text-sm',
                i === 0 ? 'bg-primary/5' : 'bg-muted/30'
              )}>
                <span className="text-xs text-muted-foreground font-mono w-10 shrink-0">
                  {b.over_number}.{b.ball_number}
                </span>
                <div className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  b.is_wicket ? 'bg-cricket-wicket text-white' :
                  b.runs === 6 ? 'bg-cricket-six text-white' :
                  b.runs === 4 ? 'bg-cricket-boundary text-white' :
                  'bg-muted text-muted-foreground'
                )}>
                  {b.is_wicket ? 'W' : b.extra_type ? b.extra_type.charAt(0).toUpperCase() : b.runs}
                </div>
                <p className="text-sm flex-1">{b.commentary}</p>
              </div>
            ))}
            {(!currentInnings?.ball_events || currentInnings.ball_events.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-8">No balls bowled yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Wicket Dialog */}
      <Dialog open={wicketDialog} onOpenChange={setWicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Wicket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Wicket type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['bowled', 'lbw', 'caught', 'run_out', 'stumped', 'hit_wicket'] as WicketType[]).map((wt) => (
                  <button
                    type="button"
                    key={wt}
                    onClick={() => setWicketType(wt)}
                    className={cn(
                      'p-2 rounded-lg border text-xs font-medium capitalize transition-colors',
                      wicketType === wt ? 'border-cricket-wicket bg-cricket-wicket/10 text-cricket-wicket' : 'border-border hover:bg-accent'
                    )}
                  >
                    {wt.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            {(wicketType === 'caught' || wicketType === 'stumped' || wicketType === 'run_out') && (
              <div className="space-y-2">
                <Label>Fielder</Label>
                <Select value={fielderId} onValueChange={setFielderId}>
                  <SelectTrigger><SelectValue placeholder="Select fielder (optional)" /></SelectTrigger>
                  <SelectContent>
                    {bowlingXI.map((xi) => (
                      <SelectItem key={xi.player_id} value={xi.player_id}>{xi.player?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>New batsman</Label>
              <Select value={newBatsmanId} onValueChange={setNewBatsmanId}>
                <SelectTrigger><SelectValue placeholder="Select incoming batsman" /></SelectTrigger>
                <SelectContent>
                  {availableBatsmen.map((xi) => (
                    <SelectItem key={xi.player_id} value={xi.player_id}>{xi.player?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={recordWicket} className="bg-cricket-wicket hover:bg-cricket-wicket/90">
              Record Wicket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Bowler Dialog */}
      <Dialog open={selectBowlerDialog} onOpenChange={setSelectBowlerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Bowler</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {bowlingXI.map((xi) => (
              <button
                type="button"
                key={xi.player_id}
                onClick={() => {
                  setBowlerId(xi.player_id)
                  setSelectBowlerDialog(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                  bowlerId === xi.player_id ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                )}
              >
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {xi.player?.name.charAt(0)}
                </div>
                <span className="font-medium text-sm">{xi.player?.name}</span>
              </button>
            ))}
            {bowlingXI.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No playing XI set for bowling team.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Dialog — Select openers + bowler */}
      <Dialog open={setupDialog} onOpenChange={setSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Up Batting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Striker (opening batsman)</Label>
              <Select value={strikerId || ''} onValueChange={setStrikerId}>
                <SelectTrigger><SelectValue placeholder="Select striker" /></SelectTrigger>
                <SelectContent>
                  {battingXI.map((xi) => (
                    <SelectItem key={xi.player_id} value={xi.player_id}>{xi.player?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Non-striker</Label>
              <Select value={nonStrikerId || ''} onValueChange={setNonStrikerId}>
                <SelectTrigger><SelectValue placeholder="Select non-striker" /></SelectTrigger>
                <SelectContent>
                  {battingXI.filter((xi) => xi.player_id !== strikerId).map((xi) => (
                    <SelectItem key={xi.player_id} value={xi.player_id}>{xi.player?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Opening bowler</Label>
              <Select value={bowlerId || ''} onValueChange={setBowlerId}>
                <SelectTrigger><SelectValue placeholder="Select bowler" /></SelectTrigger>
                <SelectContent>
                  {bowlingXI.map((xi) => (
                    <SelectItem key={xi.player_id} value={xi.player_id}>{xi.player?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setSetupDialog(false)}
              disabled={!strikerId || !nonStrikerId || !bowlerId}
            >
              Start Scoring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toss Dialog */}
      <Dialog open={tossDialog} onOpenChange={setTossDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toss</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Toss won by</Label>
              <div className="grid grid-cols-2 gap-2">
                {[teamA, teamB].map((team) => (
                  <button
                    type="button"
                    key={team?.id}
                    onClick={() => setTossWinnerId(team?.id)}
                    className={cn(
                      'p-3 rounded-lg border text-sm font-medium transition-colors',
                      tossWinnerId === team?.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                    )}
                  >
                    {team?.team_name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Elected to</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['bat', 'bowl'] as TossDecision[]).map((d) => (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setTossDecision(d)}
                    className={cn(
                      'p-3 rounded-lg border text-sm font-medium transition-colors capitalize',
                      tossDecision === d ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                    )}
                  >
                    {d} first
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={doToss} disabled={!tossWinnerId}>
              Confirm & Start Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Playing XI Dialog */}
      <Dialog open={selectXIDialog} onOpenChange={setSelectXIDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Playing XI — {xiTeamId === teamA?.id ? teamA?.team_name : teamB?.team_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {(xiTeamId === teamA?.id ? teamA : teamB)?.players?.map((player: Player) => {
              const selected = xiPlayerIds.includes(player.id)
              return (
                <button
                  type="button"
                  key={player.id}
                  onClick={() => setXIPlayerIds((prev) =>
                    selected ? prev.filter((id) => id !== player.id) : prev.length < 11 ? [...prev, player.id] : prev
                  )}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                  )}
                >
                  <div className={cn(
                    'size-5 rounded-full border-2 flex items-center justify-center',
                    selected ? 'border-primary bg-primary' : 'border-border'
                  )}>
                    {selected && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="font-medium text-sm">{player.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{player.role}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-center text-muted-foreground">{xiPlayerIds.length}/11 selected</p>
          <DialogFooter>
            <Button onClick={savePlayingXI} disabled={xiPlayerIds.length === 0}>
              Save XI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
