export interface StrategyParams {
  lookback_days: number;
  ranking_metric: "momentum_5d" | "momentum_10d" | "momentum_20d" | "momentum_60d" | "volatility" | "volume" | "rsi";
  long_n: number;
  short_n: number;
  rebalance_fraction: number;
  max_weight_per_symbol: number;
  weight_scheme: "equal" | "score_weighted" | "inverse_volatility";
  cash_reserve_pct: number;
}

export interface SignalCondition {
  source_id: string;
  action_type: "position_modifier" | "conditional_gate" | "direct_trigger";
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  threshold: number;
  action_params: {
    multiplier?: number;
    action?: "skip_trading" | "allow_trading";
  };
}

export interface SignalConditionRule {
  when: string; // e.g., "value < 25"
  scale_factor?: number; // for position_modifier
  allow?: boolean; // for conditional_gate
  action?: "buy" | "sell"; // for direct_trigger
  symbol?: string; // for direct_trigger
  allocation_pct?: number; // for direct_trigger
}

export interface UniverseConfig {
  type: "predefined" | "custom" | "synthetic";
  predefined_list?: "mag7" | "dow30" | "sp500_top10" | "sp500_top50" | "nasdaq100_top10" | "nasdaq100_top50" | "russell2000_top50" | "crypto_top10" | "crypto_top25";
  custom_symbols?: string[];
  synthetic_index?: string;
}

export interface ExecutionConfig {
  signal_conditions: SignalCondition[] | null;
  cash_reserve_pct: number;
  top_n: number;
  weight_scheme: "equal" | "score_weighted" | "inverse_volatility";
  max_weight_per_symbol: number;
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  allocation_pct: number;
  rebalance_fraction: number;
  params_json: StrategyParams;
  signal_conditions_json: SignalCondition[] | null;
  universe_type: string;
  universe_config_json: UniverseConfig;
  is_enabled: boolean;
  created_at: string;
}

export interface CreateStrategyInput {
  name: string;
  allocation_pct: number;
  rebalance_fraction: number;
  params_json: StrategyParams;
  signal_conditions_json?: SignalCondition[];
  universe_type: string;
  universe_config_json: UniverseConfig;
  is_enabled?: boolean;
}

export interface UpdateStrategyInput extends Partial<CreateStrategyInput> {
  id: string;
}

export const DEFAULT_STRATEGY_PARAMS: StrategyParams = {
  lookback_days: 30,
  ranking_metric: "momentum_20d",
  long_n: 10,
  short_n: 0,
  rebalance_fraction: 0.25,
  max_weight_per_symbol: 0.1,
  weight_scheme: "equal",
  cash_reserve_pct: 0,
};

export const DEFAULT_UNIVERSE_CONFIG: UniverseConfig = {
  type: "predefined",
  predefined_list: "mag7",
};

export const PREDEFINED_LISTS = [
  { value: "mag7", label: "Magnificent 7" },
  { value: "dow30", label: "Dow 30" },
  { value: "sp500_top10", label: "S&P 500 Top 10" },
  { value: "sp500_top50", label: "S&P 500 Top 50" },
  { value: "nasdaq100_top10", label: "NASDAQ 100 Top 10" },
  { value: "nasdaq100_top50", label: "NASDAQ 100 Top 50" },
  { value: "russell2000_top50", label: "Russell 2000 Top 50" },
  { value: "crypto_top10", label: "Top 10 Crypto" },
  { value: "crypto_top25", label: "Top 25 Crypto (Extended)" },
] as const;

export const RANKING_METRICS = [
  { value: "momentum_5d", label: "Momentum (5 day)" },
  { value: "momentum_10d", label: "Momentum (10 day)" },
  { value: "momentum_20d", label: "Momentum (20 day)" },
  { value: "momentum_60d", label: "Momentum (60 day)" },
  { value: "volatility", label: "Volatility (lower is better)" },
  { value: "volume", label: "Average Volume" },
  { value: "rsi", label: "RSI" },
] as const;
