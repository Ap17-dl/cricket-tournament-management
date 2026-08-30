


import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import {
  calculateGameStatus,
  calculateMatchStatus,
  calculateServer,
  calculateDoublesServer,
  getNextGameFirstServer,
} from '@/lib/tt-scoring'
import type {
  TTMatch,
  TTMatchPlayer,
  TTGame,
  TTScoreEvent,
  TTPlayer,
  TTMatchType,
  TTMatchFormat,
  TTBestOf,
  TTSide,
} from '@/lib/types'

export interface TTMatchConfig {
  matchTitle: string
  matchType: TTMatchType
  format: TTMatchFormat
  bestOf: TTBestOf
  venue?: string
  tableNumber?: string
  notes?: string
  firstServerSide: TTSide
  playersA: Array<{ id?: string; name: string }>
  playersB: Array<{ id?: string; name: string }>
}

interface TTState {
  
  match: TTMatch | null
  players: TTMatchPlayer[]
  games: TTGame[]
  currentGame: TTGame | null
  scoreEvents: TTScoreEvent[]
  loading: boolean
  error: string | null

  
  allPlayers: TTPlayer[]

  
  fetchPlayers: () => Promise<void>
  createOrGetPlayer: (name: string, userId: string) => Promise<string>
  startMatch: (config: TTMatchConfig, userId: string) => Promise<string | null>
  loadMatch: (matchId: string) => Promise<void>
  addPoint: (side: TTSide) => Promise<void>
  undoLastPoint: () => Promise<void>
  reset: () => void
}

export const useTTStore = create<TTState>((set, get) => ({
  match: null,
  players: [],
  games: [],
  currentGame: null,
  scoreEvents: [],
  loading: false,
  error: null,
  allPlayers: [],

  fetchPlayers: async () => {
    const { data } = await supabase
      .from('tt_players')
      .select('*')
      .order('name')
    if (data) set({ allPlayers: data })
  },

  createOrGetPlayer: async (name: string, userId: string) => {
    
    const { data: existing } = await supabase
      .from('tt_players')
      .select('id')
      .ilike('name', name.trim())
      .limit(1)
      .maybeSingle()

    if (existing) return existing.id

    const { data: created, error } = await supabase
      .from('tt_players')
      .insert({ name: name.trim(), created_by: userId })
      .select('id')
      .single()

    if (error) throw error
    return created.id
  },

  startMatch: async (config: TTMatchConfig, userId: string) => {
    set({ loading: true, error: null })
    try {
      const store = get()

      
      const playerIdsA: string[] = []
      const playerIdsB: string[] = []

      for (const p of config.playersA) {
        const id = p.id || (await store.createOrGetPlayer(p.name, userId))
        playerIdsA.push(id)
      }
      for (const p of config.playersB) {
        const id = p.id || (await store.createOrGetPlayer(p.name, userId))
        playerIdsB.push(id)
      }

      
      const { data: match, error: matchError } = await supabase
        .from('tt_matches')
        .insert({
          match_title: config.matchTitle || 'Quick Match',
          match_type: config.matchType,
          format: config.format,
          best_of: config.bestOf,
          status: 'live',
          venue: config.venue || null,
          table_number: config.tableNumber || null,
          notes: config.notes || null,
          first_server_side: config.firstServerSide,
          started_at: new Date().toISOString(),
          created_by: userId,
        })
        .select()
        .single()

      if (matchError) throw matchError

      
      const matchPlayers: Array<{
        match_id: string
        side: string
        player_id: string
        player_name: string
        player_order: number
      }> = []

      config.playersA.forEach((p, i) => {
        matchPlayers.push({
          match_id: match.id,
          side: 'A',
          player_id: playerIdsA[i],
          player_name: p.name,
          player_order: i + 1,
        })
      })

      config.playersB.forEach((p, i) => {
        matchPlayers.push({
          match_id: match.id,
          side: 'B',
          player_id: playerIdsB[i],
          player_name: p.name,
          player_order: i + 1,
        })
      })

      const { error: playersError } = await supabase
        .from('tt_match_players')
        .insert(matchPlayers)

      if (playersError) throw playersError

      
      const { data: game, error: gameError } = await supabase
        .from('tt_games')
        .insert({
          match_id: match.id,
          game_number: 1,
          first_server_side: config.firstServerSide,
        })
        .select()
        .single()

      if (gameError) throw gameError

      set({
        match: match as TTMatch,
        players: matchPlayers as unknown as TTMatchPlayer[],
        games: [game as TTGame],
        currentGame: game as TTGame,
        scoreEvents: [],
        loading: false,
      })

      return match.id
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start match'
      set({ error: message, loading: false })
      return null
    }
  },

  loadMatch: async (matchId: string) => {
    set({ loading: true, error: null })
    try {
      const [matchRes, playersRes, gamesRes, eventsRes] = await Promise.all([
        supabase.from('tt_matches').select('*').eq('id', matchId).single(),
        supabase.from('tt_match_players').select('*').eq('match_id', matchId).order('side').order('player_order'),
        supabase.from('tt_games').select('*').eq('match_id', matchId).order('game_number'),
        supabase.from('tt_score_events').select('*').eq('match_id', matchId).order('created_at'),
      ])

      if (matchRes.error) throw matchRes.error

      const games = (gamesRes.data || []) as TTGame[]
      const currentGame = games.find(g => !g.completed_at) || games[games.length - 1] || null

      set({
        match: matchRes.data as TTMatch,
        players: (playersRes.data || []) as TTMatchPlayer[],
        games,
        currentGame,
        scoreEvents: (eventsRes.data || []) as TTScoreEvent[],
        loading: false,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load match'
      set({ error: message, loading: false })
    }
  },

  addPoint: async (side: TTSide) => {
    const { match, currentGame, scoreEvents, games, players } = get()
    if (!match || !currentGame) return
    if (match.status === 'completed') return

    const scoreA = currentGame.score_a + (side === 'A' ? 1 : 0)
    const scoreB = currentGame.score_b + (side === 'B' ? 1 : 0)

    
    const gameStatus = calculateGameStatus(currentGame.score_a, currentGame.score_b, match.format)
    if (gameStatus.isFinished) return

    const gameEvents = scoreEvents.filter(e => e.game_id === currentGame.id)
    const pointNumber = gameEvents.length + 1

    
    let serverPlayerId: string | undefined
    let receiverPlayerId: string | undefined

    if (match.match_type === 'doubles') {
      const info = calculateDoublesServer(
        currentGame.score_a,
        currentGame.score_b,
        match.format,
        currentGame.first_server_side
      )
      const serverSidePlayers = players.filter(p => p.side === info.servingSide)
      const receiverSidePlayers = players.filter(p => p.side === (info.servingSide === 'A' ? 'B' : 'A'))
      serverPlayerId = serverSidePlayers.find(p => p.player_order === info.serverPlayerOrder)?.player_id
      receiverPlayerId = receiverSidePlayers.find(p => p.player_order === info.receiverPlayerOrder)?.player_id
    } else {
      const servingSide = calculateServer(
        currentGame.score_a,
        currentGame.score_b,
        match.format,
        currentGame.first_server_side
      )
      const serverPlayer = players.find(p => p.side === servingSide)
      const receiverPlayer = players.find(p => p.side === (servingSide === 'A' ? 'B' : 'A'))
      serverPlayerId = serverPlayer?.player_id
      receiverPlayerId = receiverPlayer?.player_id
    }

    
    const { error: eventError } = await supabase
      .from('tt_score_events')
      .insert({
        match_id: match.id,
        game_id: currentGame.id,
        point_number: pointNumber,
        scoring_side: side,
        score_a_after: scoreA,
        score_b_after: scoreB,
        server_player_id: serverPlayerId,
        receiver_player_id: receiverPlayerId,
      })

    if (eventError) {
      console.error('Failed to record point:', eventError)
      return
    }

    
    const newGameStatus = calculateGameStatus(scoreA, scoreB, match.format)

    const gameUpdate: Record<string, unknown> = {
      score_a: scoreA,
      score_b: scoreB,
    }

    if (newGameStatus.isFinished) {
      gameUpdate.winner_side = newGameStatus.winner
      gameUpdate.completed_at = new Date().toISOString()
    }

    await supabase.from('tt_games').update(gameUpdate).eq('id', currentGame.id)

    
    const { data: allEvents } = await supabase
      .from('tt_score_events')
      .select('*')
      .eq('match_id', match.id)
      .order('created_at')

    const updatedGame = { ...currentGame, score_a: scoreA, score_b: scoreB, ...gameUpdate } as TTGame
    const updatedGames = games.map(g => g.id === currentGame.id ? updatedGame : g)

    
    if (newGameStatus.isFinished) {
      const matchStatus = calculateMatchStatus(
        updatedGames.map(g => ({ winner_side: g.winner_side as 'A' | 'B' | null })),
        match.best_of
      )

      if (matchStatus.isFinished) {
        
        await supabase.from('tt_matches').update({
          status: 'completed',
          winner_side: matchStatus.winner,
          completed_at: new Date().toISOString(),
        }).eq('id', match.id)

        set({
          match: { ...match, status: 'completed', winner_side: matchStatus.winner, completed_at: new Date().toISOString() } as TTMatch,
          games: updatedGames,
          currentGame: updatedGame,
          scoreEvents: (allEvents || []) as TTScoreEvent[],
        })
      } else {
        
        const nextGameNumber = updatedGames.length + 1
        const nextFirstServer = getNextGameFirstServer(currentGame.first_server_side)

        const { data: nextGame } = await supabase
          .from('tt_games')
          .insert({
            match_id: match.id,
            game_number: nextGameNumber,
            first_server_side: nextFirstServer,
          })
          .select()
          .single()

        if (nextGame) {
          const newGames = [...updatedGames, nextGame as TTGame]
          set({
            games: newGames,
            currentGame: nextGame as TTGame,
            scoreEvents: (allEvents || []) as TTScoreEvent[],
          })
        }
      }
    } else {
      set({
        games: updatedGames,
        currentGame: updatedGame,
        scoreEvents: (allEvents || []) as TTScoreEvent[],
      })
    }
  },

  undoLastPoint: async () => {
    const { match, currentGame, scoreEvents, games } = get()
    if (!match || !currentGame) return

    
    const gameEvents = scoreEvents.filter(e => e.game_id === currentGame.id)
    if (gameEvents.length === 0) {
      
      
      if (games.length > 1 && currentGame.score_a === 0 && currentGame.score_b === 0) {
        
        const prevGame = games[games.length - 2]
        await supabase.from('tt_games').delete().eq('id', currentGame.id)
        await supabase.from('tt_games').update({
          winner_side: null,
          completed_at: null,
        }).eq('id', prevGame.id)

        
        const prevEvents = scoreEvents.filter(e => e.game_id === prevGame.id)
        if (prevEvents.length > 0) {
          const lastEvent = prevEvents[prevEvents.length - 1]
          await supabase.from('tt_score_events').delete().eq('id', lastEvent.id)

          const newScoreA = lastEvent.score_a_after - (lastEvent.scoring_side === 'A' ? 1 : 0)
          const newScoreB = lastEvent.score_b_after - (lastEvent.scoring_side === 'B' ? 1 : 0)

          await supabase.from('tt_games').update({
            score_a: newScoreA,
            score_b: newScoreB,
          }).eq('id', prevGame.id)
        }

        
        if (match.status === 'completed') {
          await supabase.from('tt_matches').update({
            status: 'live',
            winner_side: null,
            completed_at: null,
          }).eq('id', match.id)
        }

        
        await get().loadMatch(match.id)
        return
      }
      return
    }

    const lastEvent = gameEvents[gameEvents.length - 1]

    
    await supabase.from('tt_score_events').delete().eq('id', lastEvent.id)

    
    const newScoreA = lastEvent.score_a_after - (lastEvent.scoring_side === 'A' ? 1 : 0)
    const newScoreB = lastEvent.score_b_after - (lastEvent.scoring_side === 'B' ? 1 : 0)

    
    await supabase.from('tt_games').update({
      score_a: newScoreA,
      score_b: newScoreB,
      winner_side: null,
      completed_at: null,
    }).eq('id', currentGame.id)

    
    if (match.status === 'completed') {
      await supabase.from('tt_matches').update({
        status: 'live',
        winner_side: null,
        completed_at: null,
      }).eq('id', match.id)
    }

    
    await get().loadMatch(match.id)
  },

  reset: () => {
    set({
      match: null,
      players: [],
      games: [],
      currentGame: null,
      scoreEvents: [],
      loading: false,
      error: null,
    })
  },
}))
