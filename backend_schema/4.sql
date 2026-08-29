
-- =============================================
-- TABLE TENNIS MODULE — Database Schema
-- =============================================

-- TT PLAYERS (lightweight player registry for table tennis)
CREATE TABLE IF NOT EXISTS tt_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tt_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_tt_players" ON tt_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tt_players" ON tt_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "update_tt_players" ON tt_players FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "delete_tt_players" ON tt_players FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- TT MATCHES
CREATE TABLE IF NOT EXISTS tt_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_title text NOT NULL DEFAULT 'Quick Match',
  match_type text NOT NULL DEFAULT 'singles' CHECK (match_type IN ('singles', 'doubles')),
  format int NOT NULL DEFAULT 11 CHECK (format IN (11, 21)),
  best_of int NOT NULL DEFAULT 1 CHECK (best_of IN (1, 3, 5)),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  winner_side text CHECK (winner_side IN ('A', 'B')),
  venue text,
  table_number text,
  notes text,
  first_server_side text DEFAULT 'A' CHECK (first_server_side IN ('A', 'B')),
  scheduled_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tt_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_tt_matches" ON tt_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tt_matches" ON tt_matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "update_tt_matches" ON tt_matches FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "delete_tt_matches" ON tt_matches FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- TT MATCH PLAYERS
CREATE TABLE IF NOT EXISTS tt_match_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES tt_matches(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('A', 'B')),
  player_id uuid NOT NULL REFERENCES tt_players(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_order int NOT NULL DEFAULT 1 CHECK (player_order IN (1, 2)),
  UNIQUE(match_id, player_id)
);

ALTER TABLE tt_match_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_tt_match_players" ON tt_match_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tt_match_players" ON tt_match_players FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);
CREATE POLICY "update_tt_match_players" ON tt_match_players FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);
CREATE POLICY "delete_tt_match_players" ON tt_match_players FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);

-- TT GAMES
CREATE TABLE IF NOT EXISTS tt_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES tt_matches(id) ON DELETE CASCADE,
  game_number int NOT NULL DEFAULT 1,
  score_a int NOT NULL DEFAULT 0,
  score_b int NOT NULL DEFAULT 0,
  winner_side text CHECK (winner_side IN ('A', 'B')),
  first_server_side text DEFAULT 'A' CHECK (first_server_side IN ('A', 'B')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(match_id, game_number)
);

ALTER TABLE tt_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_tt_games" ON tt_games FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tt_games" ON tt_games FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);
CREATE POLICY "update_tt_games" ON tt_games FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);
CREATE POLICY "delete_tt_games" ON tt_games FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);

-- TT SCORE EVENTS
CREATE TABLE IF NOT EXISTS tt_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES tt_matches(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES tt_games(id) ON DELETE CASCADE,
  point_number int NOT NULL,
  scoring_side text NOT NULL CHECK (scoring_side IN ('A', 'B')),
  score_a_after int NOT NULL,
  score_b_after int NOT NULL,
  server_player_id uuid REFERENCES tt_players(id),
  receiver_player_id uuid REFERENCES tt_players(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tt_score_events_match ON tt_score_events(match_id);
CREATE INDEX idx_tt_score_events_game ON tt_score_events(game_id);

ALTER TABLE tt_score_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_tt_score_events" ON tt_score_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tt_score_events" ON tt_score_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);
CREATE POLICY "update_tt_score_events" ON tt_score_events FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);
CREATE POLICY "delete_tt_score_events" ON tt_score_events FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM tt_matches m WHERE m.id = match_id AND m.created_by = auth.uid())
);

-- Auto-update updated_at on tt_matches
CREATE OR REPLACE FUNCTION update_tt_matches_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tt_matches_updated_at ON tt_matches;
CREATE TRIGGER tt_matches_updated_at
  BEFORE UPDATE ON tt_matches
  FOR EACH ROW EXECUTE PROCEDURE update_tt_matches_updated_at();

-- Enable realtime for live scores
ALTER PUBLICATION supabase_realtime ADD TABLE tt_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE tt_games;
ALTER PUBLICATION supabase_realtime ADD TABLE tt_score_events;
