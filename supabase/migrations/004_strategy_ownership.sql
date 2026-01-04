-- Add strategy ownership tracking for positions
-- This allows multiple strategies to run independently without interfering

-- Create executions table to track which strategy placed which orders
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Execution summary
  orders_placed INTEGER NOT NULL DEFAULT 0,
  orders_failed INTEGER NOT NULL DEFAULT 0,
  total_buy_value DECIMAL(20, 2) NOT NULL DEFAULT 0,
  total_sell_value DECIMAL(20, 2) NOT NULL DEFAULT 0,
  estimated_fees DECIMAL(20, 2) NOT NULL DEFAULT 0,
  
  -- Market conditions
  market_status TEXT NOT NULL, -- 'open' or 'closed'
  
  -- Metadata
  execution_metadata JSONB, -- stores full execution details
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create execution_orders table to track individual orders
CREATE TABLE IF NOT EXISTS execution_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Order details
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  notional DECIMAL(20, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  
  -- Alpaca order details
  alpaca_order_id TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_strategy_id ON executions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON executions(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_orders_execution_id ON execution_orders(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_orders_strategy_id ON execution_orders(strategy_id);
CREATE INDEX IF NOT EXISTS idx_execution_orders_user_id ON execution_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_orders_symbol ON execution_orders(symbol);

-- Enable RLS
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for executions
CREATE POLICY "Users can view their own executions"
  ON executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own executions"
  ON executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for execution_orders
CREATE POLICY "Users can view their own execution orders"
  ON execution_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own execution orders"
  ON execution_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment explaining the design
COMMENT ON TABLE executions IS 'Tracks strategy execution history. Each execution represents one run of a strategy.';
COMMENT ON TABLE execution_orders IS 'Individual orders placed during each execution. Used to track position ownership by strategy.';
