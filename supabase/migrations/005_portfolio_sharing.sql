-- Add portfolio sharing settings
CREATE TABLE IF NOT EXISTS user_portfolio_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public_anonymous', 'public_full')),
  public_username TEXT UNIQUE,
  show_strategies BOOLEAN DEFAULT true,
  show_performance BOOLEAN DEFAULT true,
  custom_title TEXT,
  custom_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for public username lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_public_username ON user_portfolio_settings(public_username);

-- RLS policies
ALTER TABLE user_portfolio_settings ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own settings
CREATE POLICY "Users can manage their own portfolio settings"
  ON user_portfolio_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read public portfolio settings (for public portfolio page)
CREATE POLICY "Anyone can read public portfolio settings"
  ON user_portfolio_settings
  FOR SELECT
  USING (visibility != 'private');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portfolio_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolio_settings_timestamp
  BEFORE UPDATE ON user_portfolio_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_settings_timestamp();
