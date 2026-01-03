-- Fix strategies table schema to match application requirements
-- This migration updates the strategies table to include all required columns

-- Drop the old strategies table if it exists (be careful in production!)
DROP TABLE IF EXISTS strategies CASCADE;

-- Recreate strategies table with correct schema
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    allocation_pct NUMERIC NOT NULL DEFAULT 10,
    rebalance_fraction NUMERIC NOT NULL DEFAULT 0.25,
    params_json JSONB NOT NULL DEFAULT '{}',
    signal_conditions_json JSONB,
    universe_type TEXT NOT NULL DEFAULT 'predefined' CHECK (universe_type IN ('predefined', 'custom', 'synthetic')),
    universe_config_json JSONB NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for querying strategies by user
CREATE INDEX IF NOT EXISTS idx_strategies_user 
    ON strategies(user_id, created_at DESC);

-- Add RLS policies for strategies table
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own strategies
CREATE POLICY "Users can view own strategies"
    ON strategies
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create their own strategies
CREATE POLICY "Users can create own strategies"
    ON strategies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own strategies
CREATE POLICY "Users can update own strategies"
    ON strategies
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own strategies
CREATE POLICY "Users can delete own strategies"
    ON strategies
    FOR DELETE
    USING (auth.uid() = user_id);
