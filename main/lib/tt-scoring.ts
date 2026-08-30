



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
  serverPlayerOrder: number  
  receiverPlayerOrder: number  
}









export function calculateGameStatus(
  scoreA: number,
  scoreB: number,
  target: number
): GameStatus {
  const deuceThreshold = target - 1 

  
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











export function calculateServer(
  scoreA: number,
  scoreB: number,
  target: number,
  firstServerSide: 'A' | 'B'
): 'A' | 'B' {
  const totalPoints = scoreA + scoreB
  const deuceThreshold = target - 1
  const pointsPerService = target === 21 ? 5 : 2

  const inDeuce = scoreA >= deuceThreshold && scoreB >= deuceThreshold

  if (inDeuce) {
    
    const deuceStartPoints = 2 * deuceThreshold
    const pointsSinceDeuce = totalPoints - deuceStartPoints
    const changesBeforeDeuce = deuceStartPoints / pointsPerService
    const totalChanges = changesBeforeDeuce + pointsSinceDeuce
    if (totalChanges % 2 === 0) {
      return firstServerSide
    }
    return firstServerSide === 'A' ? 'B' : 'A'
  }

  
  const serviceBlock = Math.floor(totalPoints / pointsPerService)
  if (serviceBlock % 2 === 0) {
    return firstServerSide
  }
  return firstServerSide === 'A' ? 'B' : 'A'
}
















export function calculateDoublesServer(
  scoreA: number,
  scoreB: number,
  target: number,
  firstServerSide: 'A' | 'B'
): ServerInfo {
  const totalPoints = scoreA + scoreB
  const deuceThreshold = target - 1
  const pointsPerService = target === 21 ? 5 : 2

  const inDeuce = scoreA >= deuceThreshold && scoreB >= deuceThreshold

  let rotationIndex: number

  if (inDeuce) {
    
    const deuceStartPoints = 2 * deuceThreshold
    const pointsSinceDeuce = totalPoints - deuceStartPoints
    const changesBeforeDeuce = deuceStartPoints / pointsPerService
    const totalChanges = changesBeforeDeuce + pointsSinceDeuce
    rotationIndex = totalChanges % 4
  } else {
    
    const serviceBlock = Math.floor(totalPoints / pointsPerService)
    rotationIndex = serviceBlock % 4
  }

  
  
  
  
  
  
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







export function getNextGameFirstServer(
  previousGameFirstServer: 'A' | 'B'
): 'A' | 'B' {
  return previousGameFirstServer === 'A' ? 'B' : 'A'
}





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









export function shouldChangeEnds(
  scoreA: number,
  scoreB: number,
  target: number,
  gameNumber: number,
  bestOf: number
): { shouldChange: boolean; threshold: number; isDecidingGame: boolean } {
  const isDecidingGame = gameNumber === bestOf
  const threshold = target === 21 ? 10 : 5
  const shouldChange = isDecidingGame && (scoreA >= threshold || scoreB >= threshold)
  return { shouldChange, threshold, isDecidingGame }
}
