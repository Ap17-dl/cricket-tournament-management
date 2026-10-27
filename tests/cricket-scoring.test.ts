/**
 * Unit Test Suite for Cricket Scoring Rules and Calculations
 * Executable via: npx tsx tests/cricket-scoring.test.ts
 */

import {
  isLegalDelivery,
  getBowlerRunsConceded,
  shouldRotateStrike,
  advanceOvers,
  calculateScorecard,
  validateFormatOvers,
  checkInningsCompletion,
} from '../main/lib/cricket-scoring'
import type { BallEvent } from '../main/lib/types'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++
    console.log(`  ✅ ${message}`)
  } else {
    failed++
    console.error(`  ❌ ${message}`)
  }
}

function test(name: string, fn: () => void) {
  console.log(`\n🏏 ${name}`)
  fn()
}

// ============================================================================
// 1. Legal vs Extra Deliveries
// ============================================================================
test('Delivery legality rules', () => {
  assert(isLegalDelivery(null), 'Standard dot ball is a legal delivery')
  assert(isLegalDelivery('bye'), 'Bye is a legal delivery')
  assert(isLegalDelivery('leg_bye'), 'Leg bye is a legal delivery')
  assert(!isLegalDelivery('wide'), 'Wide is NOT a legal delivery')
  assert(!isLegalDelivery('no_ball'), 'No-ball is NOT a legal delivery')
})

// ============================================================================
// 2. Bowler Runs Conceded Rules
// ============================================================================
test('Bowler runs conceded rules', () => {
  assert(getBowlerRunsConceded(0, null, 0) === 0, 'Dot ball: 0 runs conceded')
  assert(getBowlerRunsConceded(4, null, 0) === 4, 'Four off the bat: 4 runs conceded')
  assert(getBowlerRunsConceded(6, null, 0) === 6, 'Six off the bat: 6 runs conceded')
  assert(getBowlerRunsConceded(0, 'wide', 1) === 1, 'Standard wide: 1 run conceded')
  assert(getBowlerRunsConceded(0, 'wide', 5) === 5, 'Wide 4 extras: 5 runs conceded')
  assert(getBowlerRunsConceded(2, 'no_ball', 1) === 3, 'No ball with 2 runs off bat: 3 runs conceded')
  assert(getBowlerRunsConceded(0, 'bye', 4) === 0, 'Byes are NOT charged against the bowler')
  assert(getBowlerRunsConceded(0, 'leg_bye', 1) === 0, 'Leg byes are NOT charged against the bowler')
})

// ============================================================================
// 3. Strike Rotation Rules
// ============================================================================
test('Strike rotation rules', () => {
  assert(!shouldRotateStrike(0), '0 runs: strike stays with striker')
  assert(shouldRotateStrike(1), '1 run: strike rotates')
  assert(!shouldRotateStrike(2), '2 runs: strike stays with striker')
  assert(shouldRotateStrike(3), '3 runs: strike rotates')
  assert(!shouldRotateStrike(4), 'Boundary 4: strike stays with striker')
  assert(!shouldRotateStrike(6), 'Six: strike stays with striker')
  assert(!shouldRotateStrike(0, 'wide', 1), 'Wide with 1 extra: strike stays with striker')
  assert(shouldRotateStrike(0, 'bye', 1), '1 Bye: strike rotates')
  assert(!shouldRotateStrike(0, 'leg_bye', 2), '2 Leg byes: strike stays with striker')
})

// ============================================================================
// 4. Over Advancement & Completion
// ============================================================================
test('Over progression and completion', () => {
  let step = advanceOvers(0.0, 0, true)
  assert(step.newOvers === 0.1 && !step.overCompleted && step.newLegalBallsInOver === 1, '1st legal ball -> 0.1')

  step = advanceOvers(0.1, 1, false) // Wide bowled
  assert(step.newOvers === 0.1 && !step.overCompleted && step.newLegalBallsInOver === 1, 'Wide does not advance over (stays 0.1)')

  step = advanceOvers(0.1, 1, true) // 2nd legal
  assert(step.newOvers === 0.2 && step.newLegalBallsInOver === 2, '2nd legal ball -> 0.2')

  step = advanceOvers(0.5, 5, true) // 6th legal
  assert(step.newOvers === 1.0 && step.overCompleted && step.newLegalBallsInOver === 0, '6th legal ball completes over -> 1.0')

  step = advanceOvers(1.0, 0, true)
  assert(step.newOvers === 1.1 && !step.overCompleted, 'Start of 2nd over -> 1.1')
})

// ============================================================================
// 5. Scorecard & Individual Stats Calculation
// ============================================================================
test('Scorecard calculations from ball events', () => {
  const dummyBalls: BallEvent[] = [
    // Ball 1: Batsman 1 hits a 4 off Bowler A
    {
      id: '1',
      innings_id: 'inn-1',
      over_number: 0,
      ball_number: 1,
      batsman_id: 'p-1',
      bowler_id: 'b-1',
      runs: 4,
      extra_type: null,
      extra_runs: 0,
      is_wicket: false,
      timestamp: new Date().toISOString(),
    },
    // Ball 2: Bowler A bowls a wide (1 extra)
    {
      id: '2',
      innings_id: 'inn-1',
      over_number: 0,
      ball_number: 2,
      batsman_id: 'p-1',
      bowler_id: 'b-1',
      runs: 0,
      extra_type: 'wide',
      extra_runs: 1,
      is_wicket: false,
      timestamp: new Date().toISOString(),
    },
    // Ball 3: Batsman 1 takes a single (1 run)
    {
      id: '3',
      innings_id: 'inn-1',
      over_number: 0,
      ball_number: 3,
      batsman_id: 'p-1',
      bowler_id: 'b-1',
      runs: 1,
      extra_type: null,
      extra_runs: 0,
      is_wicket: false,
      timestamp: new Date().toISOString(),
    },
    // Ball 4: Batsman 2 is caught out (Bowler A gets wicket)
    {
      id: '4',
      innings_id: 'inn-1',
      over_number: 0,
      ball_number: 4,
      batsman_id: 'p-2',
      bowler_id: 'b-1',
      runs: 0,
      extra_type: null,
      extra_runs: 0,
      is_wicket: true,
      wicket_type: 'caught',
      timestamp: new Date().toISOString(),
    },
    // Ball 5: 4 Byes (fielding error, not on bowler)
    {
      id: '5',
      innings_id: 'inn-1',
      over_number: 0,
      ball_number: 5,
      batsman_id: 'p-3',
      bowler_id: 'b-1',
      runs: 0,
      extra_type: 'bye',
      extra_runs: 4,
      is_wicket: false,
      timestamp: new Date().toISOString(),
    },
    // Ball 6: Batsman 3 is run out
    {
      id: '6',
      innings_id: 'inn-1',
      over_number: 0,
      ball_number: 6,
      batsman_id: 'p-3',
      bowler_id: 'b-1',
      runs: 0,
      extra_type: null,
      extra_runs: 0,
      is_wicket: true,
      wicket_type: 'run_out',
      timestamp: new Date().toISOString(),
    },
  ]

  const scorecard = calculateScorecard(dummyBalls)

  // Total runs = 4 + 1(wide) + 1 + 0 + 4(byes) + 0 = 10 runs
  assert(scorecard.totalRuns === 10, 'Total innings score is 10')
  assert(scorecard.totalWickets === 2, 'Total wickets fallen is 2')
  assert(scorecard.extras === 5, 'Total extras is 5 (1 wide + 4 byes)')

  // Batsman 1: 5 runs, 2 balls faced (wide ball excluded!), 1 four
  const b1 = scorecard.batsmen['p-1']
  assert(b1.runs === 5, 'Batsman 1 scored 5 runs')
  assert(b1.balls === 2, 'Batsman 1 faced 2 legal balls (wides not counted in balls faced)')
  assert(b1.fours === 1, 'Batsman 1 hit 1 four')
  assert(!b1.out, 'Batsman 1 is not out')

  // Batsman 2: out caught
  const b2 = scorecard.batsmen['p-2']
  assert(b2.out && b2.wicketType === 'caught', 'Batsman 2 dismissed caught')

  // Bowler A stats:
  // Balls: 4 legal balls + 1 bye + 1 run_out = 5 legal balls (wide excluded)
  // Runs conceded: 4 (bat) + 1 (wide) + 1 (bat) = 6 runs (byes NOT charged)
  // Wickets: 1 wicket (caught; run_out not credited to bowler)
  const bowlerA = scorecard.bowlers['b-1']
  assert(bowlerA.balls === 5, 'Bowler bowled 5 legal balls (wide not counted)')
  assert(bowlerA.runs === 6, 'Bowler conceded 6 runs (byes excluded)')
  assert(bowlerA.wickets === 1, 'Bowler credited with 1 wicket (run-out excluded)')
})

// ============================================================================
// 6. Tournament Format & Overs Validation
// ============================================================================
test('Tournament formats and overs validation', () => {
  assert(validateFormatOvers('T20').resolvedOvers === 20, 'T20 defaults to 20 overs')
  assert(validateFormatOvers('T10').resolvedOvers === 10, 'T10 defaults to 10 overs')
  assert(validateFormatOvers('ODI').resolvedOvers === 50, 'ODI defaults to 50 overs')
  assert(validateFormatOvers('Test Match').resolvedOvers === 0, 'Test Match defaults to 0 (unlimited/session)')
  assert(validateFormatOvers('Custom', 15).valid && validateFormatOvers('Custom', 15).resolvedOvers === 15, 'Custom 15 overs is valid')
  assert(!validateFormatOvers('Custom', 0).valid, 'Custom 0 overs is invalid')
  assert(!validateFormatOvers('Custom', -5).valid, 'Custom negative overs is invalid')
})

// ============================================================================
// 7. Innings Completion Conditions
// ============================================================================
test('Innings completion logic', () => {
  // Scenario 1: All out (10 wickets)
  const allOut = checkInningsCompletion(12.3, 20, 10, 10, 85, null)
  assert(allOut.isComplete && allOut.reason === 'all_out', 'Innings ends when all out (10 wickets)')

  // Scenario 2: Overs complete in 1st innings
  const oversDone = checkInningsCompletion(20.0, 20, 4, 10, 165, null)
  assert(oversDone.isComplete && oversDone.reason === 'overs_completed', 'Innings ends when max overs reached')

  // Scenario 3: Target chased in 2nd innings
  const targetChased = checkInningsCompletion(15.2, 20, 3, 10, 166, 166)
  assert(targetChased.isComplete && targetChased.reason === 'target_chased', 'Match ends when 2nd innings reaches or exceeds target')

  // Scenario 4: In progress
  const inProgress = checkInningsCompletion(14.2, 20, 3, 10, 110, 166)
  assert(!inProgress.isComplete, 'Innings continues while under overs, wickets, and target')
})

console.log(`\n========================================`)
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) {
  process.exit(1)
} else {
  console.log(`✅ All cricket scoring rules verified successfully!`)
}
