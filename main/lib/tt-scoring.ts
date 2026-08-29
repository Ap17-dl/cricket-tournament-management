// =============================================
// Table Tennis Scoring Engine — Pure Functions
// =============================================

export interface GameStatus {
  isFinished: boolean
  winner: 'A' | 'B' | null
  isDeuce: boolean
}

export interface MatchStatus {
  isFinished: boolean
  winner: 'A' | 'B' | null
  gamesWonA: number
  gamesWonB: number
  gamesToWin: number
}

export interface ServerInfo {
  servingSide: 'A' | 'B'
  serverPlayerOrder: number  // 1 or 2 (for doubles)
  receiverPlayerOrder: number  // 1 or 2 (for doubles)
}

/**
 * Calculate the status of a single game.
 *
 * Rules:
 * - A player must reach `target` points AND lead by at least 2.
 * - At (target-1)-(target-1) the game enters deuce.
 * - In deuce, play continues until one side leads by 2.
 */
export function calculateGameStatus(
  scoreA: number,
  scoreB: number,
  target: number
): GameStatus {
  const deuceThreshold = target - 1 // 10 for target=11, 20 for target=21

  // Deuce is only when both sides are at or above threshold AND scores are tied
  const isDeuce =
    scoreA >= deuceThreshold &&
    scoreB >= deuceThreshold &&
    scoreA === scoreB

  const aWins = scoreA >= target && scoreA - scoreB >= 2
  const bWins = scoreB >= target && scoreB - scoreA >= 2

  if (aWins) {
    return { isFinished: true, winner: 'A', isDeuce: false }
  }

  if (bWins) {
    return { isFinished: true, winner: 'B', isDeuce: false }
  }

  return { isFinished: false, winner: null, isDeuce }
}

/**
 * Calculate the match status based on completed games.
 *
 * bestOf: 1, 3, or 5
 * gamesToWin: ceil(bestOf / 2)
 */
export function calculateMatchStatus(
  games: Array<{ winner_side: 'A' | 'B' | null }>,
  bestOf: number
): MatchStatus {
  const gamesToWin = Math.ceil(bestOf / 2)
  let gamesWonA = 0
  let gamesWonB = 0

  for (const game of games) {
    if (game.winner_side === 'A') gamesWonA++
    if (game.winner_side === 'B') gamesWonB++
  }

  const aWins = gamesWonA >= gamesToWin
  const bWins = gamesWonB >= gamesToWin

  return {
    isFinished: aWins || bWins,
    winner: aWins ? 'A' : bWins ? 'B' : null,
    gamesWonA,
    gamesWonB,
    gamesToWin,
  }
}

/**
 * Calculate the current server based on total points played in this game.
 *
 * Standard rules:
 * - Service changes every 2 points.
 * - At deuce (both >= target-1), service changes every point.
 *
 * firstServerSide: which side serves first in this game.
 */
export function calculateServer(
  scoreA: number,
  scoreB: number,
  target: number,
  firstServerSide: 'A' | 'B'
): 'A' | 'B' {
  const totalPoints = scoreA + scoreB
  const deuceThreshold = target - 1

  const inDeuce = scoreA >= deuceThreshold && scoreB >= deuceThreshold

  if (inDeuce) {
    // Service changes every 1 point during deuce
    // The server at the start of deuce depends on who was serving
    // when deuce began. At total points = 2*(target-1), we're at deuce start.
    // From that point, every single point changes server.
    const deuceStartPoints = 2 * deuceThreshold
    const pointsSinceDeuce = totalPoints - deuceStartPoints
    // Number of server changes before deuce: deuceStartPoints / 2
    const changesBeforeDeuce = deuceStartPoints / 2
    // Total changes = changesBeforeDeuce + pointsSinceDeuce
    const totalChanges = changesBeforeDeuce + pointsSinceDeuce
    if (totalChanges % 2 === 0) {
      return firstServerSide
    }
    return firstServerSide === 'A' ? 'B' : 'A'
  }

  // Normal play: service changes every 2 points
  const serviceBlock = Math.floor(totalPoints / 2)
  if (serviceBlock % 2 === 0) {
    return firstServerSide
  }
  return firstServerSide === 'A' ? 'B' : 'A'
}

/**
 * Calculate doubles server and receiver.
 *
 * In doubles, the serving/receiving order rotates:
 *   Rotation 0: A1 serves to B1
 *   Rotation 1: B1 serves to A2
 *   Rotation 2: A2 serves to B2
 *   Rotation 3: B2 serves to A1
 *   Rotation 4: A1 serves to B1 (cycle repeats)
 *
 * The initial order can be configured, but this follows standard ITTF doubles rotation.
 *
 * firstServerSide: which side serves first
 * Returns: { servingSide, serverPlayerOrder, receiverPlayerOrder }
 */
export function calculateDoublesServer(
  scoreA: number,
  scoreB: number,
  target: number,
  firstServerSide: 'A' | 'B'
): ServerInfo {
  const totalPoints = scoreA + scoreB
  const deuceThreshold = target - 1

  const inDeuce = scoreA >= deuceThreshold && scoreB >= deuceThreshold

  let rotationIndex: number

  if (inDeuce) {
    // At deuce, service changes every point but rotation still follows
    const deuceStartPoints = 2 * deuceThreshold
    const pointsSinceDeuce = totalPoints - deuceStartPoints
    const changesBeforeDeuce = deuceStartPoints / 2
    const totalChanges = changesBeforeDeuce + pointsSinceDeuce
    rotationIndex = totalChanges % 4
  } else {
    // Every 2 points, advance the rotation
    const serviceBlock = Math.floor(totalPoints / 2)
    rotationIndex = serviceBlock % 4
  }

  // Standard doubles rotation sequence:
  // If first server is side A, player order 1:
  //   rot 0: A1 → B1
  //   rot 1: B1 → A2
  //   rot 2: A2 → B2
  //   rot 3: B2 → A1
  const rotations: Array<{
    servingSide: 'A' | 'B'
    serverPlayerOrder: number
    receiverPlayerOrder: number
  }> = firstServerSide === 'A'
    ? [
        { servingSide: 'A', serverPlayerOrder: 1, receiverPlayerOrder: 1 },
        { servingSide: 'B', serverPlayerOrder: 1, receiverPlayerOrder: 2 },
        { servingSide: 'A', serverPlayerOrder: 2, receiverPlayerOrder: 2 },
        { servingSide: 'B', serverPlayerOrder: 2, receiverPlayerOrder: 1 },
      ]
    : [
        { servingSide: 'B', serverPlayerOrder: 1, receiverPlayerOrder: 1 },
        { servingSide: 'A', serverPlayerOrder: 1, receiverPlayerOrder: 2 },
        { servingSide: 'B', serverPlayerOrder: 2, receiverPlayerOrder: 2 },
        { servingSide: 'A', serverPlayerOrder: 2, receiverPlayerOrder: 1 },
      ]

  return rotations[rotationIndex]
}

/**
 * Determine the first server for the next game.
 *
 * In table tennis, the receiver of the previous game becomes
 * the server of the next game.
 */
export function getNextGameFirstServer(
  previousGameFirstServer: 'A' | 'B'
): 'A' | 'B' {
  return previousGameFirstServer === 'A' ? 'B' : 'A'
}

/**
 * Validate that adding a point to a side is legal.
 * Returns null if valid, or an error message string if invalid.
 */
export function validatePointAddition(
  scoreA: number,
  scoreB: number,
  target: number
): string | null {
  const status = calculateGameStatus(scoreA, scoreB, target)
  if (status.isFinished) {
    return 'Game is already finished. Cannot add more points.'
  }
  return null
}
