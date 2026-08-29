
-- =============================================
-- Table Tennis Tournaments Schema Update
-- =============================================

CREATE TABLE IF NOT EXISTS tt_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('singles', 'doubles')),
  format int NOT NULL DEFAULT 11 CHECK (format IN (11, 21)),
  best_of int NOT NULL DEFAULT 1 CHECK (best_of IN (1, 3, 5)),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed')),
  venue text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tt_tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_tt_tournaments" ON tt_tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tt_tournaments" ON tt_tournaments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "update_tt_tournaments" ON tt_tournaments FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "delete_tt_tournaments" ON tt_tournaments FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Add tournament_id to tt_matches
ALTER TABLE tt_matches ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES tt_tournaments(id) ON DELETE CASCADE;

-- Enable realtime for tt_tournaments
ALTER PUBLICATION supabase_realtime ADD TABLE tt_tournaments;
