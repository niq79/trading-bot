import { createServiceClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";
import { executeStrategy, StrategyConfig, ExecutionResult } from "./executor";

// Re-export the result type from executor for backward compatibility
export type RunResult = ExecutionResult;

export interface EngineRunResult {
  userId: string;
  timestamp: string;
  strategies: ExecutionResult[];
  totalOrdersPlaced: number;
  errors: string[];
}

/**
 * Run all strategies for a single user
 * @param dryRun - If true, simulates orders without placing them
 */
export async function runStrategiesForUser(
  userId: string,
  dryRun = false
): Promise<EngineRunResult> {
  const supabase = await createServiceClient();
  const results: RunResult[] = [];
  const errors: string[] = [];
  let totalOrdersPlaced = 0;

  // Get user's Alpaca credentials
  const { data: credentials } = (await supabase
    .from("alpaca_credentials")
    .select("*")
    .eq("user_id", userId)
    .single()) as { data: { api_key_encrypted: string; api_secret_encrypted: string } | null };

  if (!credentials) {
    return {
      userId,
      timestamp: new Date().toISOString(),
      strategies: [],
      totalOrdersPlaced: 0,
      errors: ["No Alpaca credentials found"],
    };
  }

  // Decrypt credentials
  const apiKey = await decrypt(credentials.api_key_encrypted);
  const apiSecret = await decrypt(credentials.api_secret_encrypted);

  // Create Alpaca client
  const alpacaClient = new AlpacaClient({ apiKey, apiSecret, paper: true });

  // Get user's active strategies
  const { data: strategies } = (await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", userId)
    .eq("is_enabled", true)) as { data: Array<{ id: string; name: string; params: any; user_id: string }> | null };

  if (!strategies || strategies.length === 0) {
    return {
      userId,
      timestamp: new Date().toISOString(),
      strategies: [],
      totalOrdersPlaced: 0,
      errors: ["No active strategies found"],
    };
  }

  // Run each strategy
  console.log(`User ${userId}: Processing ${strategies.length} strategies in parallel...`);
  const strategyPromises = strategies.map(strategy =>
    runStrategy(strategy, alpacaClient, supabase, dryRun)
      .catch(error => {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Strategy ${strategy.name}: ${errorMsg}`);
        return {
          success: false,
          strategyId: strategy.id,
          strategyName: strategy.name,
          ordersPlaced: 0,
          ordersFailed: 0,
          error: errorMsg,
          details: {
            universeSize: 0,
            rankedSymbols: 0,
            targetPositions: 0,
            currentPositions: 0,
            allocatedEquity: 0,
            totalBuyValue: 0,
            totalSellValue: 0,
            netChange: 0,
            estimatedFees: 0,
            marketStatus: "closed" as const,
            orderResults: [],
          },
        } as ExecutionResult;
      })
  );

  const strategyResults = await Promise.all(strategyPromises);
  
  // Aggregate results
  for (const result of strategyResults) {
    results.push(result);
    totalOrdersPlaced += result.ordersPlaced;
  }

  // Log the run
  await supabase.from("strategy_runs").insert({
    user_id: userId,
    ran_at: new Date().toISOString(),
    strategies_run: strategies.length,
    orders_placed: totalOrdersPlaced,
    status: errors.length > 0 ? "partial" : "success",
    log: JSON.stringify({ results, errors, dryRun }),
  } as any);

  return {
    userId,
    timestamp: new Date().toISOString(),
    strategies: results,
    totalOrdersPlaced,
    errors,
  };
}

/**
 * Run a single strategy (wrapper around unified executor)
 * @param dryRun - If true, simulates orders without placing them
 */
async function runStrategy(
  strategy: {
    id: string;
    name: string;
    params?: any;
    params_json?: any; // Database column name
    user_id: string;
    universe_config_json?: any;
    allocation_pct?: number;
  },
  alpacaClient: AlpacaClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  dryRun = false
): Promise<ExecutionResult> {
  // Database returns params_json, but some code may use params
  const rawParams = (strategy.params_json || strategy.params || {}) as any;
  
  // Normalize params to match StrategyConfig format
  const strategyConfig: StrategyConfig = {
    id: strategy.id,
    name: strategy.name,
    user_id: strategy.user_id,
    allocation_pct: strategy.allocation_pct ?? 100, // Default to 100% for automated runs
    params_json: {
      lookback_days: rawParams.lookback_days || 10,
      ranking_metric: rawParams.ranking_metric || 'momentum_5d',
      long_n: rawParams.long_n || 10,
      short_n: rawParams.short_n || 0,
      rebalance_fraction: rawParams.rebalance_fraction ?? 0.25,
      max_weight_per_symbol: rawParams.max_weight_per_symbol ?? 0.2,
      weight_scheme: rawParams.weight_scheme || 'equal',
      cash_reserve_pct: rawParams.cash_reserve_pct || 0,
      signal_conditions: rawParams.signal_conditions || [],
    },
    universe_config_json: strategy.universe_config_json || rawParams.universe || {},
  };

  // Use the unified executor
  return await executeStrategy(
    strategyConfig,
    alpacaClient,
    supabase,
    {
      dryRun,
      recordOwnership: !dryRun, // Only record ownership for real runs
      trigger: "automated",
    }
  );
}

/**
 * Run strategies for all users (called by cron job)
 * @param dryRun - If true, simulates orders without placing them
 */
export async function runAllUsers(dryRun = false): Promise<{
  usersProcessed: number;
  totalOrders: number;
  results: EngineRunResult[];
}> {
  const supabase = await createServiceClient();

  // Get all users with active strategies
  const { data: users } = await supabase
    .from("strategies")
    .select("user_id")
    .eq("is_enabled", true) as { data: { user_id: string }[] | null };

  if (!users || users.length === 0) {
    return {
      usersProcessed: 0,
      totalOrders: 0,
      results: [],
    };
  }

  // Get unique user IDs
  const uniqueUserIds = [...new Set(users.map((u) => u.user_id))];

  const results: EngineRunResult[] = [];
  let totalOrders = 0;

  // Process all users in parallel for speed
  console.log(`Processing ${uniqueUserIds.length} users in parallel...`);
  const userPromises = uniqueUserIds.map(userId => 
    runStrategiesForUser(userId, dryRun)
  );
  
  const userResults = await Promise.all(userPromises);
  
  // Aggregate results
  for (const result of userResults) {
    results.push(result);
    totalOrders += result.totalOrdersPlaced;
  }
  
  console.log(`Completed: ${uniqueUserIds.length} users, ${totalOrders} total orders`);

  return {
    usersProcessed: uniqueUserIds.length,
    totalOrders,
    results,
  };
}
