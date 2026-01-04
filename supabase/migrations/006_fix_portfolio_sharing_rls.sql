-- Fix RLS policy conflict for portfolio sharing
-- The issue: when logged in users try to view other users' public portfolios,
-- the first policy (auth.uid() = user_id) takes precedence and blocks access

-- Drop the old policies
DROP POLICY IF EXISTS "Users can manage their own portfolio settings" ON user_portfolio_settings;
DROP POLICY IF EXISTS "Anyone can read public portfolio settings" ON user_portfolio_settings;

-- Create new, non-conflicting policies

-- 1. Users can insert/update/delete their own settings
CREATE POLICY "Users can manage their own portfolio settings"
  ON user_portfolio_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Anyone (authenticated or not) can read public portfolio settings
-- This policy is evaluated independently and allows reading ANY public portfolio
CREATE POLICY "Anyone can view public portfolios"
  ON user_portfolio_settings
  FOR SELECT
  USING (
    visibility != 'private'
    OR auth.uid() = user_id  -- Users can always see their own settings
  );
