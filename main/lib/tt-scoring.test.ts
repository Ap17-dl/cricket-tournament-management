




import {
  calculateGameStatus,
  calculateMatchStatus,
  calculateServer,
  calculateDoublesServer,
  getNextGameFirstServer,
  shouldChangeEnds,
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

test('Service changes every 2 points (11-point format)', () => {
  assert(calculateServer(0, 0, 11, 'A') === 'A', '0-0 → A serves')
  assert(calculateServer(1, 0, 11, 'A') === 'A', '1-0 → A serves')
  assert(calculateServer(1, 1, 11, 'A') === 'B', '1-1 → B serves')
  assert(calculateServer(2, 1, 11, 'A') === 'B', '2-1 → B serves')
  assert(calculateServer(2, 2, 11, 'A') === 'A', '2-2 → A serves')
  assert(calculateServer(3, 2, 11, 'A') === 'A', '3-2 → A serves')
  assert(calculateServer(3, 3, 11, 'A') === 'B', '3-3 → B serves')
})

test('Service changes every 5 points (21-point format)', () => {
  assert(calculateServer(0, 0, 21, 'A') === 'A', '0-0 (pt 0) → A serves')
  assert(calculateServer(4, 0, 21, 'A') === 'A', '4-0 (pt 4) → A serves')
  assert(calculateServer(3, 2, 21, 'A') === 'B', '3-2 (pt 5) → B serves')
  assert(calculateServer(5, 4, 21, 'A') === 'B', '5-4 (pt 9) → B serves')
  assert(calculateServer(6, 4, 21, 'A') === 'A', '6-4 (pt 10) → A serves')
  assert(calculateServer(8, 6, 21, 'A') === 'A', '8-6 (pt 14) → A serves')
  assert(calculateServer(9, 6, 21, 'A') === 'B', '9-6 (pt 15) → B serves')
})

test('Service at deuce changes every point', () => {
  // 11-point deuce at 10-10
  const s1 = calculateServer(10, 10, 11, 'A')
  const s2 = calculateServer(11, 10, 11, 'A')
  const s3 = calculateServer(11, 11, 11, 'A')
  assert(s1 !== s2, '10-10 to 11-10: server changes')
  assert(s2 !== s3, '11-10 to 11-11: server changes')

  // 21-point deuce at 20-20
  const d1 = calculateServer(20, 20, 21, 'A')
  const d2 = calculateServer(21, 20, 21, 'A')
  const d3 = calculateServer(21, 21, 21, 'A')
  assert(d1 !== d2, '20-20 to 21-20: server changes')
  assert(d2 !== d3, '21-20 to 21-21: server changes')
})

// ============ Doubles Server Tests ============

test('Doubles rotation (11-point format, 2 serves each)', () => {
  const r0 = calculateDoublesServer(0, 0, 11, 'A')
  assert(r0.servingSide === 'A' && r0.serverPlayerOrder === 1, '0-0 (pts 0-1): A1 serves')

  const r1 = calculateDoublesServer(1, 1, 11, 'A')
  assert(r1.servingSide === 'B' && r1.serverPlayerOrder === 1, '1-1 (pts 2-3): B1 serves')

  const r2 = calculateDoublesServer(2, 2, 11, 'A')
  assert(r2.servingSide === 'A' && r2.serverPlayerOrder === 2, '2-2 (pts 4-5): A2 serves')

  const r3 = calculateDoublesServer(3, 3, 11, 'A')
  assert(r3.servingSide === 'B' && r3.serverPlayerOrder === 2, '3-3 (pts 6-7): B2 serves')

  // Back to start
  const r4 = calculateDoublesServer(4, 4, 11, 'A')
  assert(r4.servingSide === 'A' && r4.serverPlayerOrder === 1, '4-4 (pts 8-9): A1 serves again')
})

test('Doubles rotation (21-point format: 5 serves each, A1 → B1 → A2 → B2 → A1)', () => {
  // Pts 0-4: A1 serves
  const r0 = calculateDoublesServer(0, 0, 21, 'A')
  const r4 = calculateDoublesServer(4, 0, 21, 'A')
  assert(r0.servingSide === 'A' && r0.serverPlayerOrder === 1, '0-0: A1 serves (first 5)')
  assert(r4.servingSide === 'A' && r4.serverPlayerOrder === 1, '4-0: A1 still serves (pt 4 of 5)')

  // Pts 5-9: B1 serves
  const r5 = calculateDoublesServer(3, 2, 21, 'A')
  const r9 = calculateDoublesServer(5, 4, 21, 'A')
  assert(r5.servingSide === 'B' && r5.serverPlayerOrder === 1, '3-2 (total 5): B1 serves')
  assert(r9.servingSide === 'B' && r9.serverPlayerOrder === 1, '5-4 (total 9): B1 still serves')

  // Pts 10-14: A2 serves
  const r10 = calculateDoublesServer(6, 4, 21, 'A')
  const r14 = calculateDoublesServer(8, 6, 21, 'A')
  assert(r10.servingSide === 'A' && r10.serverPlayerOrder === 2, '6-4 (total 10): A2 serves')
  assert(r14.servingSide === 'A' && r14.serverPlayerOrder === 2, '8-6 (total 14): A2 still serves')

  // Pts 15-19: B2 serves
  const r15 = calculateDoublesServer(9, 6, 21, 'A')
  const r19 = calculateDoublesServer(10, 9, 21, 'A')
  assert(r15.servingSide === 'B' && r15.serverPlayerOrder === 2, '9-6 (total 15): B2 serves')
  assert(r19.servingSide === 'B' && r19.serverPlayerOrder === 2, '10-9 (total 19): B2 still serves')

  // Pts 20-24: A1 serves again (cycle repeats)
  const r20 = calculateDoublesServer(10, 10, 21, 'A')
  assert(r20.servingSide === 'A' && r20.serverPlayerOrder === 1, '10-10 (total 20): A1 serves (cycle repeats)')
})

test('Doubles at deuce 20-20 (changes every 1 point following rotation)', () => {
  const d0 = calculateDoublesServer(20, 20, 21, 'A') // total 40 pts, changes before = 40/5 = 8. 8 % 4 = 0 -> A1
  const d1 = calculateDoublesServer(21, 20, 21, 'A') // total 41 pts, 9 % 4 = 1 -> B1
  const d2 = calculateDoublesServer(21, 21, 21, 'A') // total 42 pts, 10 % 4 = 2 -> A2
  const d3 = calculateDoublesServer(22, 21, 21, 'A') // total 43 pts, 11 % 4 = 3 -> B2
  const d4 = calculateDoublesServer(22, 22, 21, 'A') // total 44 pts, 12 % 4 = 0 -> A1

  assert(d0.servingSide === 'A' && d0.serverPlayerOrder === 1, '20-20: A1 serves')
  assert(d1.servingSide === 'B' && d1.serverPlayerOrder === 1, '21-20: B1 serves (1 pt)')
  assert(d2.servingSide === 'A' && d2.serverPlayerOrder === 2, '21-21: A2 serves (1 pt)')
  assert(d3.servingSide === 'B' && d3.serverPlayerOrder === 2, '22-21: B2 serves (1 pt)')
  assert(d4.servingSide === 'A' && d4.serverPlayerOrder === 1, '22-22: A1 serves (1 pt)')
})

// ============ Deciding Game Side Change Tests ============

test('Deciding game side change (change ends at 10 pts for 21-pt format, 5 pts for 11-pt)', () => {
  // Best of 1, 21-point
  assert(!shouldChangeEnds(9, 8, 21, 1, 1).shouldChange, '9-8 in 21-pt: no side change yet')
  assert(shouldChangeEnds(10, 8, 21, 1, 1).shouldChange, '10-8 in 21-pt: side change triggered (10 pts reached)')
  assert(shouldChangeEnds(5, 10, 21, 1, 1).shouldChange, '5-10 in 21-pt: side change triggered (10 pts reached)')

  // Best of 3, game 1 (not deciding) vs game 3 (deciding)
  assert(!shouldChangeEnds(10, 8, 21, 1, 3).shouldChange, 'Game 1 of Best of 3: not deciding, no mid-game side change')
  assert(shouldChangeEnds(10, 8, 21, 3, 3).shouldChange, 'Game 3 of Best of 3 (deciding): side change at 10 pts')

  // Best of 1, 11-point format (changes at 5 pts)
  assert(!shouldChangeEnds(4, 3, 11, 1, 1).shouldChange, '4-3 in 11-pt: no side change yet')
  assert(shouldChangeEnds(5, 3, 11, 1, 1).shouldChange, '5-3 in 11-pt: side change triggered (5 pts reached)')
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
