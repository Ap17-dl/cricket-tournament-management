
-- Replace trigger with a resilient version that won't block signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (id, name, email, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'),
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore errors so signup is never blocked
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
