-- Trading Bot RLS Policies
-- This migration enables Row Level Security and creates policies

-- ===========================================
-- ENABLE RLS ON ALL TABLES
-- ===========================================
ALTER TABLE alpaca_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthetic_indices ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- ALPACA CREDENTIALS POLICIES
-- ===========================================
-- Users can only see their own credentials
CREATE POLICY "Users can view own credentials"
    ON alpaca_credentials FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own credentials
CREATE POLICY "Users can insert own credentials"
    ON alpaca_credentials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own credentials
CREATE POLICY "Users can update own credentials"
    ON alpaca_credentials FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own credentials
CREATE POLICY "Users can delete own credentials"
    ON alpaca_credentials FOR DELETE
    USING (auth.uid() = user_id);

-- ===========================================
-- SIGNAL SOURCES POLICIES
-- ===========================================
CREATE POLICY "Users can view own signal sources"
    ON signal_sources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signal sources"
    ON signal_sources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signal sources"
    ON signal_sources FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own signal sources"
    ON signal_sources FOR DELETE
    USING (auth.uid() = user_id);

-- ===========================================
-- SIGNAL READINGS POLICIES
-- ===========================================
CREATE POLICY "Users can view own signal readings"
    ON signal_readings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signal readings"
    ON signal_readings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can insert readings for any user (for cron jobs)
CREATE POLICY "Service role can insert signal readings"
    ON signal_readings FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- ===========================================
-- STRATEGIES POLICIES
-- ===========================================
CREATE POLICY "Users can view own strategies"
    ON strategies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies"
    ON strategies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
    ON strategies FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
    ON strategies FOR DELETE
    USING (auth.uid() = user_id);

-- ===========================================
-- STRATEGY RUNS POLICIES
-- ===========================================
CREATE POLICY "Users can view own strategy runs"
    ON strategy_runs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategy runs"
    ON strategy_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can insert runs for any user (for cron jobs)
CREATE POLICY "Service role can insert strategy runs"
    ON strategy_runs FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- ===========================================
-- SYNTHETIC INDICES POLICIES
-- ===========================================
CREATE POLICY "Users can view own synthetic indices"
    ON synthetic_indices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synthetic indices"
    ON synthetic_indices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own synthetic indices"
    ON synthetic_indices FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own synthetic indices"
    ON synthetic_indices FOR DELETE
    USING (auth.uid() = user_id);
