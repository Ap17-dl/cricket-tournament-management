/**
 * Cricket scoring rules, scorecard aggregation, strike rotation, and format validation utilities.
 * Designed to reflect the exact product specifications in MatchPage.tsx and TournamentsPage.tsx.
 */

import type { BallEvent, MatchFormat } from './types'

export interface BatsmanStats {
  playerId: string
  runs: number
  balls: number
  fours: number
  sixes: number
  out: boolean
  wicketType?: string
}

export interface BowlerStats {
  playerId: string
  oversDisplay: string
  balls: number
  maidens: number
  runs: number
  wickets: number
  economy: string
}

export interface InningsCalculationResult {
  totalRuns: number
  wickets: number
  oversCompleted: number
  extras: number
  runRate: string
  batsmen: Record<string, BatsmanStats>
  bowlers: Record<string, BowlerStats>
}

/**
 * Checks whether a delivery counts as a legal ball towards the over count.
 * Wides and No-balls are NOT legal deliveries.
 * Normal balls, Byes, and Leg Byes ARE legal deliveries.
 */
export function isLegalDelivery(extraType?: string | null): boolean {
  return !extraType || extraType === 'bye' || extraType === 'leg_bye'
}

/**
 * Calculates runs charged to the bowler for a delivery.
 * Byes and Leg Byes are fielding extras and are NOT charged against the bowler.
 * Batsman runs, Wides (penalty + runs), and No-balls (penalty + runs) ARE charged to the bowler.
 */
export function getBowlerRunsConceded(runs: number, extraType?: string | null, extraRuns: number = 0): number {
  if (extraType === 'bye' || extraType === 'leg_bye') {
    return 0
  }
  return runs + extraRuns
}

/**
 * Determines whether batsman strike should rotate after a delivery.
 * Strike rotates on an odd number of completed runs.
 */
export function shouldRotateStrike(runs: number, extraType?: string | null, extraRuns: number = 0): boolean {
  const effectiveRuns = (extraType === 'bye' || extraType === 'leg_bye') ? extraRuns : runs
  return effectiveRuns % 2 !== 0
}

/**
 * Calculates updated overs completed given current overs and whether the current ball was legal.
 */
export function advanceOvers(currentOvers: number, currentOverLegalBalls: number, isLegal: boolean): {
  newOvers: number
  newLegalBallsInOver: number
  overCompleted: boolean
} {
  if (!isLegal) {
    return {
      newOvers: currentOvers,
      newLegalBallsInOver: currentOverLegalBalls,
      overCompleted: false,
    }
  }

  const updatedBalls = currentOverLegalBalls + 1
  const overCompleted = updatedBalls >= 6
  const oversInt = Math.floor(currentOvers)

  const newOvers = overCompleted ? oversInt + 1 : oversInt + updatedBalls / 10

  return {
    newOvers: Number(newOvers.toFixed(1)),
    newLegalBallsInOver: overCompleted ? 0 : updatedBalls,
    overCompleted,
  }
}

/**
 * Computes individual batsman and bowler statistics from ball events.
 */
export function calculateScorecard(balls: BallEvent[]): {
  batsmen: Record<string, BatsmanStats>
  bowlers: Record<string, BowlerStats>
  totalRuns: number
  totalWickets: number
  extras: number
} {
  const batsmen: Record<string, BatsmanStats> = {}
  const bowlers: Record<string, BowlerStats> = {}
  let totalRuns = 0
  let totalWickets = 0
  let extras = 0

  for (const b of balls) {
    totalRuns += b.runs + b.extra_runs
    extras += b.extra_runs
    if (b.is_wicket) totalWickets++

    // Batsman stats
    if (b.batsman_id) {
      if (!batsmen[b.batsman_id]) {
        batsmen[b.batsman_id] = {
          playerId: b.batsman_id,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          out: false,
        }
      }
      const bm = batsmen[b.batsman_id]
      if (b.extra_type !== 'wide') {
        bm.balls++
      }
      if (b.extra_type === null || b.extra_type === 'no_ball') {
        bm.runs += b.runs
        if (b.runs === 4) bm.fours++
        if (b.runs === 6) bm.sixes++
      }
      if (b.is_wicket && b.wicket_type !== 'run_out') {
        bm.out = true
        bm.wicketType = b.wicket_type || undefined
      }
    }

    // Bowler stats
    if (b.bowler_id) {
      if (!bowlers[b.bowler_id]) {
        bowlers[b.bowler_id] = {
          playerId: b.bowler_id,
          oversDisplay: '0.0',
          balls: 0,
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: '0.00',
        }
      }
      const bw = bowlers[b.bowler_id]
      if (isLegalDelivery(b.extra_type)) {
        bw.balls++
      }
      bw.runs += getBowlerRunsConceded(b.runs, b.extra_type, b.extra_runs)
      if (b.is_wicket && b.wicket_type !== 'run_out') {
        bw.wickets++
      }
      bw.oversDisplay = `${Math.floor(bw.balls / 6)}.${bw.balls % 6}`
      bw.economy = bw.balls > 0 ? ((bw.runs / bw.balls) * 6).toFixed(2) : '0.00'
    }
  }

  return { batsmen, bowlers, totalRuns, totalWickets, extras }
}

/**
 * Validates match format and overs constraints.
 */
export function validateFormatOvers(format: MatchFormat, overs?: number | null): {
  valid: boolean
  resolvedOvers: number
  error?: string
} {
  switch (format) {
    case 'T20':
      return { valid: true, resolvedOvers: 20 }
    case 'T10':
      return { valid: true, resolvedOvers: 10 }
    case 'ODI':
      return { valid: true, resolvedOvers: 50 }
    case 'Test Match':
      return { valid: true, resolvedOvers: 0 } // Unlimited/multi-day
    case 'Custom':
      if (typeof overs !== 'number' || overs <= 0 || !Number.isInteger(overs)) {
        return { valid: false, resolvedOvers: 0, error: 'Custom format requires a positive integer number of overs.' }
      }
      return { valid: true, resolvedOvers: overs }
    default:
      return { valid: false, resolvedOvers: 0, error: `Unsupported format: ${format}` }
  }
}

/**
 * Checks whether an innings should conclude.
 */
export function checkInningsCompletion(
  currentOvers: number,
  maxOvers: number,
  currentWickets: number,
  maxWickets: number = 10,
  currentRuns: number,
  target?: number | null
): { isComplete: boolean; reason?: 'all_out' | 'overs_completed' | 'target_chased' } {
  if (currentWickets >= maxWickets) {
    return { isComplete: true, reason: 'all_out' }
  }
  if (maxOvers > 0 && currentOvers >= maxOvers) {
    return { isComplete: true, reason: 'overs_completed' }
  }
  if (target !== null && target !== undefined && currentRuns >= target) {
    return { isComplete: true, reason: 'target_chased' }
  }
  return { isComplete: false }
}
