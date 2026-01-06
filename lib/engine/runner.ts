import { createServiceClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";
import { getUniverseSymbols, rankSymbols } from "./ranker";
import {
  calculateTargetPositions,
  CurrentPosition,
} from "./target-calculator";
import { calculateRebalanceOrders, validateOrders } from "./rebalancer";
import { fetchSignal } from "@/lib/signals/fetcher";
import { SignalReading, SignalSource } from "@/types/signal";
import { StrategyParams } from "@/types/strategy";
import { getStrategyPositions, recordExecution } from "./strategy-ownership";

export interface RunResult {
  success: boolean;
  strategyId: string;
  strategyName: string;
  ordersPlaced: number;
  error?: string;
  details: {
    universeSize: number;
    rankedSymbols: number;
    targetPositions: number;
    signalReadings: SignalReading[];
    orders: Array<{
      symbol: string;
      side: string;
      notional: number;
      status: string;
    }>;
  };
}

export interface EngineRunResult {
  userId: string;
  timestamp: string;
  strategies: RunResult[];
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
          error: errorMsg,
          details: {
            universeSize: 0,
            rankedSymbols: 0,
            targetPositions: 0,
            signalReadings: [],
            orders: [],
          },
        };
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
 * Run a single strategy
 * @param dryRun - If true, simulates orders without placing them
 */
async function runStrategy(
  strategy: {
    id: string;
    name: string;
    params?: StrategyParams;
    params_json?: any; // Database column name
    user_id: string;
    universe_config_json?: any;
  },
  alpacaClient: AlpacaClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  dryRun = false
): Promise<RunResult> {
  // Database returns params_json, but some code may use params
  const rawParams = (strategy.params_json || strategy.params || {}) as any;
  
  // Normalize params to support both flat and nested structures
  // Database stores flat structure, but code expects nested
  const params = {
    ranking: rawParams.ranking || {
      factors: [{ factor: rawParams.ranking_metric || 'momentum_5d', weight: 1 }],
      lookback_days: rawParams.lookback_days || 10,
    },
    execution: rawParams.execution || {
      top_n: rawParams.long_n || 10,
      short_n: rawParams.short_n || 0,
      signal_conditions: rawParams.signal_conditions || [],
      weight_scheme: rawParams.weight_scheme || 'equal',
      max_weight_per_symbol: rawParams.max_weight_per_symbol || 0.2,
      cash_reserve_pct: rawParams.cash_reserve_pct || 0,
    },
    rebalance_fraction: rawParams.rebalance_fraction ?? 0.25,
  };
  
  // Get universe config from strategy (stored at strategy level, not in params)
  const universeConfig = strategy.universe_config_json || rawParams.universe || {};
  
  const orderResults: Array<{
    symbol: string;
    side: string;
    notional: number;
    status: string;
  }> = [];

  // 1. Fetch signal readings
  const signalReadings = await fetchAllSignals(
    params.execution.signal_conditions?.map((c: any) => c.source_id) || [],
    strategy.user_id,
    supabase
  );

  // 2. Fetch synthetic index if needed
  let syntheticIndex;
  if (universeConfig.type === "synthetic" && universeConfig.synthetic_index) {
    const { data: index } = await supabase
      .from("synthetic_indices")
      .select("*")
      .eq("id", universeConfig.synthetic_index)
      .eq("user_id", strategy.user_id)
      .single();
    syntheticIndex = index;
  }

  // 3. Get universe symbols
  const universeSymbols = await getUniverseSymbols(
    universeConfig,
    alpacaClient,
    syntheticIndex
  );

  // 4. Rank symbols
  const rankingConfig = {
    factors: params.ranking.factors,
    lookback_days: params.ranking.lookback_days,
    top_n: params.execution.top_n,
    short_n: params.execution.short_n || 0,
  };
  const { rankedSymbols } = await rankSymbols(
    universeSymbols,
    rankingConfig,
    alpacaClient
  );

  // 5. Get account info and current positions
  const account = await alpacaClient.getAccount();
  const allPositions = await alpacaClient.getPositions();
  const totalEquity = parseFloat(account.equity);
  const buyingPower = parseFloat(account.buying_power);

  // STRATEGY ISOLATION: Only consider positions owned by THIS strategy
  const ownedSymbols = await getStrategyPositions(strategy.user_id, strategy.id);
  
  const currentPositions: CurrentPosition[] = allPositions
    .filter(p => ownedSymbols.has(p.symbol))
    .map((p) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      market_value: parseFloat(p.market_value),
      current_price: parseFloat(p.current_price),
    }));

  console.log(`Strategy ${strategy.name}: Tracking ${ownedSymbols.size} owned positions, found ${currentPositions.length} in account`);

  // 6. Calculate target positions
  const { targets } = calculateTargetPositions(
    rankedSymbols,
    params.execution,
    totalEquity,
    currentPositions,
    signalReadings
  );

  // 7. Calculate rebalance orders
  // Get rebalance_fraction from params (default to 0.25 = 25%)
  const rebalanceFraction = params.rebalance_fraction ?? 0.25;
  const { orders } = calculateRebalanceOrders(targets, currentPositions, rebalanceFraction);

  // 8. Validate orders against buying power
  const { adjustedOrders } = validateOrders(orders, buyingPower);

  // 8.5. Check market hours for stock orders
  let marketIsOpen = true;
  try {
    const clock = await alpacaClient.getClock();
    marketIsOpen = clock.is_open;
    console.log(`Market status: ${marketIsOpen ? 'OPEN' : 'CLOSED'}`);
  } catch (error) {
    console.warn('Could not fetch market clock, assuming market is open:', error);
  }

  // 9. Execute orders (or simulate in dry run mode)
  for (const order of adjustedOrders) {
    try {
      if (dryRun) {
        // Dry run mode - just record as simulated
        orderResults.push({
          symbol: order.symbol,
          side: order.side,
          notional: order.notional,
          status: "simulated",
        });
      } else {
        // Real execution
        // Crypto orders always use 'gtc' (24/7 trading)
        // Stock orders: use 'gtc' if market is closed (will execute at next open),
        // otherwise use 'day' for immediate execution
        const isCrypto = order.symbol.includes('/');
        const timeInForce = isCrypto ? 'gtc' : (marketIsOpen ? 'day' : 'gtc');
        
        try {
          // Try notional order first (supports fractional shares)
          await alpacaClient.createOrder({
            symbol: order.symbol,
            notional: order.notional.toString(),
            side: order.side,
            type: "market",
            time_in_force: timeInForce,
          });
          orderResults.push({
            symbol: order.symbol,
            side: order.side,
            notional: order.notional,
            status: "submitted",
          });
        } catch (notionalError) {
          // If fractional shares not supported, retry with whole shares
          const errorMsg = notionalError instanceof Error ? notionalError.message : "";
          if (errorMsg.includes("not fractionable") || errorMsg.includes("40310000")) {
            console.log(`${order.symbol} doesn't support fractional shares, retrying with whole shares`);
            
            // Get current price and calculate whole shares
            const bars = await alpacaClient.getBars(order.symbol, { limit: 1 });
            if (bars.length === 0) {
              throw new Error("Cannot get current price for whole share calculation");
            }
            const currentPrice = bars[0].c;
            const qty = Math.floor(order.notional / currentPrice);
            
            if (qty === 0) {
              throw new Error(`Notional $${order.notional.toFixed(2)} too small for whole shares at $${currentPrice.toFixed(2)}/share`);
            }
            
            // Retry with whole shares
            await alpacaClient.createOrder({
              symbol: order.symbol,
              qty: qty.toString(),
              side: order.side,
              type: "market",
              time_in_force: timeInForce,
            });
            orderResults.push({
              symbol: order.symbol,
              side: order.side,
              notional: qty * currentPrice, // Actual notional with whole shares
              status: "submitted",
            });
            console.log(`${order.symbol}: Placed ${qty} whole shares at ~$${currentPrice.toFixed(2)}`);
          } else {
            // Different error, re-throw
            throw notionalError;
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      orderResults.push({
        symbol: order.symbol,
        side: order.side,
        notional: order.notional,
        status: `failed: ${errorMsg}`,
      });
    }
  }

  // 10. Store signal readings
  for (const reading of signalReadings) {
    await supabase.from("signal_readings").insert({
      source_id: reading.source_id,
      user_id: strategy.user_id,
      value: reading.value,
      raw_response: reading.raw_response,
      fetched_at: reading.fetched_at,
    });
  }

  const successfulOrders = orderResults.filter((o) =>
    o.status === "submitted" || o.status === "simulated"
  ).length;
  
  const failedOrders = orderResults.filter((o) => 
    o.status.startsWith("failed")
  ).length;

  console.log(`Strategy ${strategy.name}: ${successfulOrders} successful, ${failedOrders} failed out of ${adjustedOrders.length} orders`);

  // 11. Record execution for strategy ownership tracking (skip in dry run)
  const totalBuyValue = orders
    .filter(o => o.side === "buy")
    .reduce((sum, o) => sum + o.notional, 0);
  const totalSellValue = orders
    .filter(o => o.side === "sell")
    .reduce((sum, o) => sum + o.notional, 0);

  if (!dryRun) {
    try {
      await recordExecution(
        strategy.user_id,
        strategy.id,
        orderResults.map(o => ({
          symbol: o.symbol,
          side: o.side as 'buy' | 'sell',
          notional: o.notional,
          status: o.status === "submitted" ? "success" : "failed",
          error: o.status.startsWith("failed") ? o.status : undefined,
        })),
        {
          ordersPlaced: successfulOrders,
          ordersFailed: failedOrders,
          totalBuyValue,
          totalSellValue,
          estimatedFees: 0, // TODO: calculate fees
          marketStatus: "automated",
        },
        {
          universeSize: universeSymbols.length,
          rankedSymbols: rankedSymbols.length,
          targetPositions: targets.length,
          signalReadings,
        }
      );
      console.log(`Strategy ${strategy.name}: Recorded automated execution`);
    } catch (recordError) {
      console.error('Failed to record execution ownership:', recordError);
      // Don't fail the whole run if recording fails
    }
  }

  return {
    success: true,
    strategyId: strategy.id,
    strategyName: strategy.name,
    ordersPlaced: successfulOrders,
    details: {
      universeSize: universeSymbols.length,
      rankedSymbols: rankedSymbols.length,
      targetPositions: targets.length,
      signalReadings,
      orders: orderResults,
    },
  };
}

/**
 * Fetch all required signals for a strategy
 */
async function fetchAllSignals(
  sourceIds: string[],
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<SignalReading[]> {
  const readings: SignalReading[] = [];
  const uniqueSourceIds = [...new Set(sourceIds)];

  for (const sourceId of uniqueSourceIds) {
    // Check if it's a built-in source
    if (sourceId === "fear_greed_crypto") {
      const result = await fetchSignal("api", {
        url: "https://api.alternative.me/fng/",
        jsonpath: "$.data[0].value",
      });

      readings.push({
        source_id: sourceId,
        value: result.value,
        raw_response: result.raw,
        fetched_at: result.fetchedAt,
      } as SignalReading);
      continue;
    }

    // Fetch custom source from database
    const { data: source } = await supabase
      .from("signal_sources")
      .select("*")
      .eq("id", sourceId)
      .eq("user_id", userId)
      .single();

    if (source) {
      const result = await fetchSignal(source.type, source.config_json);
      readings.push({
        source_id: sourceId,
        value: result.value,
        raw_response: result.raw,
        fetched_at: result.fetchedAt,
      } as SignalReading);
    }
  }

  return readings;
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
