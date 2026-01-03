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
 */
export async function runStrategiesForUser(
  userId: string
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
    .eq("is_active", true)) as { data: Array<{ id: string; name: string; params: any; user_id: string }> | null };

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
  for (const strategy of strategies) {
    try {
      const result = await runStrategy(
        strategy,
        alpacaClient,
        supabase
      );
      results.push(result);
      totalOrdersPlaced += result.ordersPlaced;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Strategy ${strategy.name}: ${errorMsg}`);
      results.push({
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
      });
    }
  }

  // Log the run
  // @ts-expect-error - TODO: Update database types
  await supabase.from("strategy_runs").insert({
    user_id: userId,
    ran_at: new Date().toISOString(),
    strategies_run: strategies.length,
    orders_placed: totalOrdersPlaced,
    status: errors.length > 0 ? "partial" : "success",
    log: JSON.stringify({ results, errors }),
  });

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
 */
async function runStrategy(
  strategy: {
    id: string;
    name: string;
    params: StrategyParams;
    user_id: string;
  },
  alpacaClient: AlpacaClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<RunResult> {
  const params = strategy.params as any; // TODO: Fix strategy params type
  const orderResults: Array<{
    symbol: string;
    side: string;
    notional: number;
    status: string;
  }> = [];

  // 1. Fetch signal readings
  const signalReadings = await fetchAllSignals(
    params.execution?.signal_conditions?.map((c: any) => c.source_id) || [],
    strategy.user_id,
    supabase
  );

  // 2. Fetch synthetic index if needed
  let syntheticIndex;
  if (params.universe?.type === "synthetic" && params.universe?.synthetic_index) {
    const { data: index } = await supabase
      .from("synthetic_indices")
      .select("*")
      .eq("id", params.universe.synthetic_index)
      .eq("user_id", strategy.user_id)
      .single();
    syntheticIndex = index;
  }

  // 3. Get universe symbols
  const universeSymbols = await getUniverseSymbols(
    params.universe,
    alpacaClient,
    syntheticIndex
  );

  // 4. Rank symbols
  const { rankedSymbols } = await rankSymbols(
    universeSymbols,
    params.ranking,
    alpacaClient
  );

  // 5. Get account info and current positions
  const account = await alpacaClient.getAccount();
  const positions = await alpacaClient.getPositions();
  const totalEquity = parseFloat(account.equity);
  const buyingPower = parseFloat(account.buying_power);

  const currentPositions: CurrentPosition[] = positions.map((p) => ({
    symbol: p.symbol,
    qty: parseFloat(p.qty),
    market_value: parseFloat(p.market_value),
    current_price: parseFloat(p.current_price),
  }));

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

  // 9. Execute orders
  for (const order of adjustedOrders) {
    try {
      await alpacaClient.createOrder({
        symbol: order.symbol,
        notional: order.notional.toString(),
        side: order.side,
        type: "market",
        time_in_force: "day",
      });
      orderResults.push({
        symbol: order.symbol,
        side: order.side,
        notional: order.notional,
        status: "submitted",
      });
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
    o.status === "submitted"
  ).length;

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
 */
export async function runAllUsers(): Promise<{
  usersProcessed: number;
  totalOrders: number;
  results: EngineRunResult[];
}> {
  const supabase = await createServiceClient();

  // Get all users with active strategies
  const { data: users } = await supabase
    .from("strategies")
    .select("user_id")
    .eq("is_active", true) as { data: { user_id: string }[] | null };

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

  for (const userId of uniqueUserIds) {
    const result = await runStrategiesForUser(userId);
    results.push(result);
    totalOrders += result.totalOrdersPlaced;
  }

  return {
    usersProcessed: uniqueUserIds.length,
    totalOrders,
    results,
  };
}
