export type UserRole = 'organizer' | 'viewer'
export type MatchFormat = 'T20' | 'T10' | 'ODI' | 'Test Match' | 'Custom'
export type MatchTheme = 'default' | 'test'
export type TournamentStatus = 'upcoming' | 'active' | 'completed'
export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'abandoned'
export type MatchType = 'League' | 'Knockout' | 'Semi-final' | 'Final'
export type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye'
export type WicketType = 'bowled' | 'lbw' | 'caught' | 'run_out' | 'stumped' | 'hit_wicket'
export type BattingStyle = 'Right-handed' | 'Left-handed'
export type PlayerRole = 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper'
export type TossDecision = 'bat' | 'bowl'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Tournament {
  id: string
  organizer_id: string
  name: string
  venue?: string
  start_date?: string
  end_date?: string
  format: MatchFormat
  overs?: number
  theme: MatchTheme
  prize_pool?: string
  rules?: string
  logo_url?: string
  banner_url?: string
  status: TournamentStatus
  created_at: string
}

export interface Team {
  id: string
  tournament_id: string
  team_name: string
  logo_url?: string
  captain_id?: string
  created_at: string
  players?: Player[]
}

export interface Player {
  id: string
  team_id: string
  name: string
  jersey_number?: number
  batting_style: BattingStyle
  bowling_style?: string
  role: PlayerRole
  created_at: string
  team?: Team
}

export interface Match {
  id: string
  tournament_id: string
  team_a_id: string
  team_b_id: string
  match_type: MatchType
  match_number?: number
  scheduled_at?: string
  venue?: string
  toss_winner_id?: string
  toss_decision?: TossDecision
  batting_first_id?: string
  status: MatchStatus
  winner_id?: string
  result_summary?: string
  format: MatchFormat
  overs: number
  created_at: string
  team_a?: Team
  team_b?: Team
  tournament?: Tournament
  innings?: Innings[]
}

export interface PlayingXI {
  id: string
  match_id: string
  player_id: string
  team_id: string
  batting_order?: number
  is_captain: boolean
  is_wicketkeeper: boolean
  player?: Player
}

export interface Innings {
  id: string
  match_id: string
  innings_number: number
  batting_team_id: string
  bowling_team_id: string
  total_runs: number
  wickets: number
  overs_completed: number
  extras: number
  is_complete: boolean
  declared: boolean
  created_at: string
  batting_team?: Team
  bowling_team?: Team
  ball_events?: BallEvent[]
}

export interface BallEvent {
  id: string
  innings_id: string
  over_number: number
  ball_number: number
  batsman_id?: string
  bowler_id?: string
  runs: number
  extra_type?: ExtraType
  extra_runs: number
  wicket_type?: WicketType
  fielder_id?: string
  is_wicket: boolean
  commentary?: string
  timestamp: string
  batsman?: Player
  bowler?: Player
}

export interface PlayerStats {
  id: string
  player_id: string
  tournament_id: string
  matches_played: number
  runs: number
  balls_faced: number
  fours: number
  sixes: number
  fifties: number
  centuries: number
  highest_score: number
  wickets: number
  overs_bowled: number
  runs_conceded: number
  maidens: number
  catches: number
  run_outs: number
  stumpings: number
  player?: Player
}

export interface PointsTableEntry {
  team: Team
  played: number
  won: number
  lost: number
  tied: number
  no_result: number
  points: number
  nrr: number
}

export interface ScoringState {
  striker_id: string | null
  non_striker_id: string | null
  bowler_id: string | null
  current_over: number
  current_ball: number
  score: number
  wickets: number
  extras: number
}

// =============================================
// Table Tennis Types
// =============================================

export type TTMatchType = 'singles' | 'doubles'
export type TTMatchFormat = 11 | 21
export type TTMatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type TTBestOf = 1 | 3 | 5
export type TTSide = 'A' | 'B'

export interface TTPlayer {
  id: string
  name: string
  profile_id?: string
  created_by: string
  created_at: string
}

export interface TTMatch {
  id: string
  match_title: string
  match_type: TTMatchType
  format: TTMatchFormat
  best_of: TTBestOf
  status: TTMatchStatus
  winner_side?: TTSide | null
  venue?: string
  table_number?: string
  notes?: string
  first_server_side: TTSide
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  created_by: string
  created_at: string
  updated_at: string
  // Joined relations
  players?: TTMatchPlayer[]
  games?: TTGame[]
}

export interface TTMatchPlayer {
  id: string
  match_id: string
  side: TTSide
  player_id: string
  player_name: string
  player_order: number
  // Joined
  player?: TTPlayer
}

export interface TTGame {
  id: string
  match_id: string
  game_number: number
  score_a: number
  score_b: number
  winner_side?: TTSide | null
  first_server_side: TTSide
  started_at: string
  completed_at?: string
  // Joined
  score_events?: TTScoreEvent[]
}

export interface TTScoreEvent {
  id: string
  match_id: string
  game_id: string
  point_number: number
  scoring_side: TTSide
  score_a_after: number
  score_b_after: number
  server_player_id?: string
  receiver_player_id?: string
  created_at: string
}
