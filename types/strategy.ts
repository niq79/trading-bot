export interface StrategyParams {
  template: "rank_and_rebalance";
  lookback_days: number;
  ranking_metric: "return" | "sma_slope" | "ema_slope" | "rsi";
  long_n: number;
  short_n: number;
  rebalance_fraction: number;
  max_weight_per_symbol: number;
}

export interface SignalCondition {
  signal_source: string;
  action: "position_modifier" | "conditional_gate" | "direct_trigger";
  conditions: SignalConditionRule[];
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
  predefined_list?: "sp500" | "nasdaq100" | "crypto100";
  custom_symbols?: string[];
  synthetic_index?: string;
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
  template: "rank_and_rebalance",
  lookback_days: 30,
  ranking_metric: "return",
  long_n: 10,
  short_n: 0,
  rebalance_fraction: 0.25,
  max_weight_per_symbol: 0.1,
};

export const DEFAULT_UNIVERSE_CONFIG: UniverseConfig = {
  type: "predefined",
  predefined_list: "sp500",
};

export const PREDEFINED_LISTS = [
  { value: "sp500", label: "S&P 500" },
  { value: "nasdaq100", label: "NASDAQ 100" },
  { value: "crypto100", label: "Top 100 Crypto" },
] as const;

export const RANKING_METRICS = [
  { value: "return", label: "% Return" },
  { value: "sma_slope", label: "SMA Slope" },
  { value: "ema_slope", label: "EMA Slope" },
  { value: "rsi", label: "RSI" },
] as const;
