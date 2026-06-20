
-- USERS profile extension (auth.users is managed by Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('organizer', 'viewer')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- TOURNAMENTS
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  venue text,
  start_date date,
  end_date date,
  format text NOT NULL DEFAULT 'T20' CHECK (format IN ('T20', 'T10', 'ODI', 'Test Match', 'Custom')),
  overs int,
  theme text NOT NULL DEFAULT 'default' CHECK (theme IN ('default', 'test')),
  prize_pool text,
  rules text,
  logo_url text,
  banner_url text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_tournaments" ON tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tournaments" ON tournaments FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "update_tournaments" ON tournaments FOR UPDATE TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "delete_tournaments" ON tournaments FOR DELETE TO authenticated USING (auth.uid() = organizer_id);

-- TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  logo_url text,
  captain_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_teams" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_teams" ON teams FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "update_teams" ON teams FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "delete_teams" ON teams FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);

-- PLAYERS
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  jersey_number int,
  batting_style text DEFAULT 'Right-handed' CHECK (batting_style IN ('Right-handed', 'Left-handed')),
  bowling_style text DEFAULT 'Right-arm medium',
  role text DEFAULT 'Batsman' CHECK (role IN ('Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_players" ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_players" ON players FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM teams tm JOIN tournaments t ON t.id = tm.tournament_id WHERE tm.id = team_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "update_players" ON players FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM teams tm JOIN tournaments t ON t.id = tm.tournament_id WHERE tm.id = team_id AND t.organizer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM teams tm JOIN tournaments t ON t.id = tm.tournament_id WHERE tm.id = team_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "delete_players" ON players FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM teams tm JOIN tournaments t ON t.id = tm.tournament_id WHERE tm.id = team_id AND t.organizer_id = auth.uid())
);

-- MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_a_id uuid NOT NULL REFERENCES teams(id),
  team_b_id uuid NOT NULL REFERENCES teams(id),
  match_type text DEFAULT 'League' CHECK (match_type IN ('League', 'Knockout', 'Semi-final', 'Final')),
  match_number int,
  scheduled_at timestamptz,
  venue text,
  toss_winner_id uuid REFERENCES teams(id),
  toss_decision text CHECK (toss_decision IN ('bat', 'bowl')),
  batting_first_id uuid REFERENCES teams(id),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'abandoned')),
  winner_id uuid REFERENCES teams(id),
  result_summary text,
  format text NOT NULL DEFAULT 'T20',
  overs int NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_matches" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_matches" ON matches FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "update_matches" ON matches FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "delete_matches" ON matches FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);

-- PLAYING XI
CREATE TABLE IF NOT EXISTS playing_xi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  batting_order int,
  is_captain boolean DEFAULT false,
  is_wicketkeeper boolean DEFAULT false,
  UNIQUE(match_id, player_id)
);

ALTER TABLE playing_xi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_playing_xi" ON playing_xi FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_playing_xi" ON playing_xi FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "update_playing_xi" ON playing_xi FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "delete_playing_xi" ON playing_xi FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = auth.uid())
);

-- INNINGS
CREATE TABLE IF NOT EXISTS innings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_number int NOT NULL DEFAULT 1,
  batting_team_id uuid NOT NULL REFERENCES teams(id),
  bowling_team_id uuid NOT NULL REFERENCES teams(id),
  total_runs int NOT NULL DEFAULT 0,
  wickets int NOT NULL DEFAULT 0,
  overs_completed numeric(5,1) NOT NULL DEFAULT 0,
  extras int NOT NULL DEFAULT 0,
  is_complete boolean NOT NULL DEFAULT false,
  declared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, innings_number)
);

ALTER TABLE innings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_innings" ON innings FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_innings" ON innings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "update_innings" ON innings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "delete_innings" ON innings FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id WHERE m.id = match_id AND t.organizer_id = auth.uid())
);

-- BALL EVENTS (most important table)
CREATE TABLE IF NOT EXISTS ball_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id uuid NOT NULL REFERENCES innings(id) ON DELETE CASCADE,
  over_number int NOT NULL,
  ball_number int NOT NULL,
  batsman_id uuid REFERENCES players(id),
  bowler_id uuid REFERENCES players(id),
  runs int NOT NULL DEFAULT 0,
  extra_type text CHECK (extra_type IN ('wide', 'no_ball', 'bye', 'leg_bye', null)),
  extra_runs int NOT NULL DEFAULT 0,
  wicket_type text CHECK (wicket_type IN ('bowled', 'lbw', 'caught', 'run_out', 'stumped', 'hit_wicket', null)),
  fielder_id uuid REFERENCES players(id),
  is_wicket boolean NOT NULL DEFAULT false,
  commentary text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  UNIQUE(innings_id, over_number, ball_number)
);

ALTER TABLE ball_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_ball_events" ON ball_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_ball_events" ON ball_events FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM innings i JOIN matches m ON m.id = i.match_id JOIN tournaments t ON t.id = m.tournament_id
    WHERE i.id = innings_id AND t.organizer_id = auth.uid()
  )
);
CREATE POLICY "update_ball_events" ON ball_events FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM innings i JOIN matches m ON m.id = i.match_id JOIN tournaments t ON t.id = m.tournament_id
    WHERE i.id = innings_id AND t.organizer_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM innings i JOIN matches m ON m.id = i.match_id JOIN tournaments t ON t.id = m.tournament_id
    WHERE i.id = innings_id AND t.organizer_id = auth.uid()
  )
);
CREATE POLICY "delete_ball_events" ON ball_events FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM innings i JOIN matches m ON m.id = i.match_id JOIN tournaments t ON t.id = m.tournament_id
    WHERE i.id = innings_id AND t.organizer_id = auth.uid()
  )
);

-- PLAYER STATS (aggregated)
CREATE TABLE IF NOT EXISTS player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  matches_played int NOT NULL DEFAULT 0,
  runs int NOT NULL DEFAULT 0,
  balls_faced int NOT NULL DEFAULT 0,
  fours int NOT NULL DEFAULT 0,
  sixes int NOT NULL DEFAULT 0,
  fifties int NOT NULL DEFAULT 0,
  centuries int NOT NULL DEFAULT 0,
  highest_score int NOT NULL DEFAULT 0,
  wickets int NOT NULL DEFAULT 0,
  overs_bowled numeric(5,1) NOT NULL DEFAULT 0,
  runs_conceded int NOT NULL DEFAULT 0,
  maidens int NOT NULL DEFAULT 0,
  catches int NOT NULL DEFAULT 0,
  run_outs int NOT NULL DEFAULT 0,
  stumpings int NOT NULL DEFAULT 0,
  UNIQUE(player_id, tournament_id)
);

ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_player_stats" ON player_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_player_stats" ON player_stats FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "update_player_stats" ON player_stats FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);
CREATE POLICY "delete_player_stats" ON player_stats FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid())
);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
