
-- CAREER APPLICATIONS
CREATE TABLE IF NOT EXISTS career_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  position text NOT NULL DEFAULT 'Frontend Developer',
  experience_years int NOT NULL DEFAULT 0,
  portfolio_url text,
  cover_letter text NOT NULL,
  resume_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE career_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated via anon key) can submit an application
CREATE POLICY "insert_career_applications" ON career_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only allow select for service_role (admin/edge functions); no public reads
CREATE POLICY "select_career_applications" ON career_applications
  FOR SELECT TO authenticated
  USING (false);
