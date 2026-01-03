-- Trading Bot Initial Schema
-- This migration creates all tables needed for the trading bot MVP

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- ALPACA CREDENTIALS TABLE
-- ===========================================
-- Stores encrypted Alpaca API credentials for each user
CREATE TABLE IF NOT EXISTS alpaca_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL,
    api_secret_encrypted TEXT NOT NULL,
    is_paper BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ===========================================
-- SIGNAL SOURCES TABLE
-- ===========================================
-- Stores custom signal source configurations
CREATE TABLE IF NOT EXISTS signal_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('api', 'scraper')),
    config_json JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- SIGNAL READINGS TABLE
-- ===========================================
-- Stores historical signal values
CREATE TABLE IF NOT EXISTS signal_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    value NUMERIC NOT NULL,
    raw_response JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for querying readings by source
CREATE INDEX IF NOT EXISTS idx_signal_readings_source 
    ON signal_readings(source_id, fetched_at DESC);

-- ===========================================
-- STRATEGIES TABLE
-- ===========================================
-- Stores user-defined trading strategies
CREATE TABLE IF NOT EXISTS strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    params JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- STRATEGY RUNS TABLE
-- ===========================================
-- Logs each execution of strategies
CREATE TABLE IF NOT EXISTS strategy_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ran_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    strategies_run INTEGER NOT NULL DEFAULT 0,
    orders_placed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'partial', 'failed')),
    log JSONB
);

-- Create index for querying runs by user and date
CREATE INDEX IF NOT EXISTS idx_strategy_runs_user_date 
    ON strategy_runs(user_id, ran_at DESC);

-- ===========================================
-- SYNTHETIC INDICES TABLE
-- ===========================================
-- Stores user-defined synthetic index configurations
CREATE TABLE IF NOT EXISTS synthetic_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    components TEXT[] NOT NULL,
    weights NUMERIC[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- UPDATE TIMESTAMP TRIGGER
-- ===========================================
-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_alpaca_credentials_updated_at
    BEFORE UPDATE ON alpaca_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signal_sources_updated_at
    BEFORE UPDATE ON signal_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at
    BEFORE UPDATE ON strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synthetic_indices_updated_at
    BEFORE UPDATE ON synthetic_indices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
