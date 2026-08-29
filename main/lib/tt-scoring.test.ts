// =============================================
// Table Tennis Scoring Engine — Tests
// =============================================
// Run with: npx tsx main/lib/tt-scoring.test.ts

import {
  calculateGameStatus,
  calculateMatchStatus,
  calculateServer,
  calculateDoublesServer,
  getNextGameFirstServer,
} from './tt-scoring'

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
  console.log(`\n🧪 ${name}`)
  fn()
}

// ============ Game Status Tests ============

test('11-point normal wins', () => {
  let s = calculateGameStatus(11, 0, 11)
  assert(s.isFinished && s.winner === 'A', '11-0 → A wins')

  s = calculateGameStatus(11, 8, 11)
  assert(s.isFinished && s.winner === 'A', '11-8 → A wins')

  s = calculateGameStatus(11, 9, 11)
  assert(s.isFinished && s.winner === 'A', '11-9 → A wins')

  s = calculateGameStatus(0, 11, 11)
  assert(s.isFinished && s.winner === 'B', '0-11 → B wins')

  s = calculateGameStatus(8, 11, 11)
  assert(s.isFinished && s.winner === 'B', '8-11 → B wins')
})

test('11-point deuce scenarios', () => {
  let s = calculateGameStatus(10, 10, 11)
  assert(!s.isFinished && s.isDeuce, '10-10 → deuce')

  s = calculateGameStatus(11, 10, 11)
  assert(!s.isFinished && !s.isDeuce, '11-10 → not finished, not deuce (one ahead by 1)')

  s = calculateGameStatus(11, 11, 11)
  assert(!s.isFinished && s.isDeuce, '11-11 → deuce')

  s = calculateGameStatus(12, 11, 11)
  assert(!s.isFinished && !s.isDeuce, '12-11 → not finished')

  s = calculateGameStatus(12, 12, 11)
  assert(!s.isFinished && s.isDeuce, '12-12 → deuce')

  s = calculateGameStatus(13, 11, 11)
  assert(s.isFinished && s.winner === 'A', '13-11 → A wins')

  s = calculateGameStatus(14, 12, 11)
  assert(s.isFinished && s.winner === 'A', '14-12 → A wins')

  s = calculateGameStatus(11, 13, 11)
  assert(s.isFinished && s.winner === 'B', '11-13 → B wins')
})

test('21-point normal wins', () => {
  let s = calculateGameStatus(21, 15, 21)
  assert(s.isFinished && s.winner === 'A', '21-15 → A wins')

  s = calculateGameStatus(21, 19, 21)
  assert(s.isFinished && s.winner === 'A', '21-19 → A wins')
})

test('21-point deuce scenarios', () => {
  let s = calculateGameStatus(20, 20, 21)
  assert(!s.isFinished && s.isDeuce, '20-20 → deuce')

  s = calculateGameStatus(21, 20, 21)
  assert(!s.isFinished && !s.isDeuce, '21-20 → not finished')

  s = calculateGameStatus(21, 21, 21)
  assert(!s.isFinished && s.isDeuce, '21-21 → deuce')

  s = calculateGameStatus(22, 21, 21)
  assert(!s.isFinished && !s.isDeuce, '22-21 → not finished')

  s = calculateGameStatus(23, 21, 21)
  assert(s.isFinished && s.winner === 'A', '23-21 → A wins')

  s = calculateGameStatus(21, 23, 21)
  assert(s.isFinished && s.winner === 'B', '21-23 → B wins')
})

// ============ Match Status Tests ============

test('Match status — best of 1', () => {
  let m = calculateMatchStatus([{ winner_side: 'A' }], 1)
  assert(m.isFinished && m.winner === 'A', 'Best of 1, A wins 1 game → match over')

  m = calculateMatchStatus([{ winner_side: null }], 1)
  assert(!m.isFinished, 'Best of 1, game in progress → not finished')
})

test('Match status — best of 3', () => {
  let m = calculateMatchStatus([{ winner_side: 'A' }, { winner_side: 'A' }], 3)
  assert(m.isFinished && m.winner === 'A', 'Best of 3, A wins 2 → match over')

  m = calculateMatchStatus([{ winner_side: 'A' }, { winner_side: 'B' }], 3)
  assert(!m.isFinished, 'Best of 3, 1-1 → not finished')

  m = calculateMatchStatus([{ winner_side: 'A' }, { winner_side: 'B' }, { winner_side: 'A' }], 3)
  assert(m.isFinished && m.winner === 'A', 'Best of 3, A wins 2-1 → match over')
})

test('Match status — best of 5', () => {
  let m = calculateMatchStatus([
    { winner_side: 'B' }, { winner_side: 'B' }, { winner_side: 'B' },
  ], 5)
  assert(m.isFinished && m.winner === 'B', 'Best of 5, B wins 3-0 → match over')

  m = calculateMatchStatus([
    { winner_side: 'A' }, { winner_side: 'B' }, { winner_side: 'A' }, { winner_side: 'B' },
  ], 5)
  assert(!m.isFinished, 'Best of 5, 2-2 → not finished')

  m = calculateMatchStatus([
    { winner_side: 'A' }, { winner_side: 'B' }, { winner_side: 'A' }, { winner_side: 'B' }, { winner_side: 'A' },
  ], 5)
  assert(m.isFinished && m.winner === 'A', 'Best of 5, A wins 3-2 → match over')
})

// ============ Server Tests ============

test('Service changes every 2 points', () => {
  assert(calculateServer(0, 0, 11, 'A') === 'A', '0-0 → A serves')
  assert(calculateServer(1, 0, 11, 'A') === 'A', '1-0 → A serves')
  assert(calculateServer(1, 1, 11, 'A') === 'B', '1-1 → B serves')
  assert(calculateServer(2, 1, 11, 'A') === 'B', '2-1 → B serves')
  assert(calculateServer(2, 2, 11, 'A') === 'A', '2-2 → A serves')
  assert(calculateServer(3, 2, 11, 'A') === 'A', '3-2 → A serves')
  assert(calculateServer(3, 3, 11, 'A') === 'B', '3-3 → B serves')
})

test('Service at deuce changes every point', () => {
  // At 10-10, service should change every point
  const s1 = calculateServer(10, 10, 11, 'A')
  const s2 = calculateServer(11, 10, 11, 'A')
  const s3 = calculateServer(11, 11, 11, 'A')
  assert(s1 !== s2, '10-10 to 11-10: server changes')
  assert(s2 !== s3, '11-10 to 11-11: server changes')
})

// ============ Doubles Server Tests ============

test('Doubles rotation', () => {
  const r0 = calculateDoublesServer(0, 0, 11, 'A')
  assert(r0.servingSide === 'A' && r0.serverPlayerOrder === 1, '0-0: A1 serves')

  const r1 = calculateDoublesServer(1, 1, 11, 'A')
  assert(r1.servingSide === 'B' && r1.serverPlayerOrder === 1, '1-1: B1 serves')

  const r2 = calculateDoublesServer(2, 2, 11, 'A')
  assert(r2.servingSide === 'A' && r2.serverPlayerOrder === 2, '2-2: A2 serves')

  const r3 = calculateDoublesServer(3, 3, 11, 'A')
  assert(r3.servingSide === 'B' && r3.serverPlayerOrder === 2, '3-3: B2 serves')

  // Back to start
  const r4 = calculateDoublesServer(4, 4, 11, 'A')
  assert(r4.servingSide === 'A' && r4.serverPlayerOrder === 1, '4-4: A1 serves again')
})

// ============ Next Game Server Tests ============

test('Next game first server', () => {
  assert(getNextGameFirstServer('A') === 'B', 'A served first → B serves next game')
  assert(getNextGameFirstServer('B') === 'A', 'B served first → A serves next game')
})

// ============ Summary ============

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) {
  console.log('❌ Some tests failed!')
  throw new Error('Some tests failed!')
} else {
  console.log('✅ All tests passed!')
}
