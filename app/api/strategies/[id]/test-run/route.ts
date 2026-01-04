import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";
import { getUniverseSymbols, rankSymbols } from "@/lib/engine/ranker";
import { calculateTargetPositions, CurrentPosition } from "@/lib/engine/target-calculator";
import { calculateRebalanceOrders, validateOrders } from "@/lib/engine/rebalancer";
import { getStrategyPositions } from "@/lib/engine/strategy-ownership";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get strategy
    const { data: strategy } = (await supabase
      .from("strategies")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()) as {
      data: {
        id: string;
        name: string;
        allocation_pct: number;
        params_json: Record<string, unknown>;
        universe_config_json: Record<string, unknown>;
      } | null;
    };

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    // Get Alpaca credentials
    const { data: credentials } = (await supabase
      .from("alpaca_credentials")
      .select("*")
      .eq("user_id", user.id)
      .single()) as { data: { api_key_encrypted: string; api_secret_encrypted: string } | null };

    if (!credentials) {
      return NextResponse.json(
        { error: "No Alpaca credentials found. Connect your Alpaca account first." },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const apiKey = await decrypt(credentials.api_key_encrypted);
    const apiSecret = await decrypt(credentials.api_secret_encrypted);

    // Create Alpaca client
    const alpacaClient = new AlpacaClient({ apiKey, apiSecret, paper: true });

    // Parse strategy config
    const params = strategy.params_json as {
      lookback_days: number;
      ranking_metric: string;
      long_n: number;
      short_n: number;
      rebalance_fraction: number;
      max_weight_per_symbol: number;
      weight_scheme: "equal" | "score_weighted" | "inverse_volatility";
      cash_reserve_pct: number;
    };
    
    // Get rebalance_fraction from strategy (stored at root level for DB backwards compat)
    const rebalanceFraction = (strategy as unknown as { rebalance_fraction?: number }).rebalance_fraction 
      ?? params.rebalance_fraction 
      ?? 0.25;
    const universeConfig = strategy.universe_config_json as {
      type: string;
      predefined_list?: string;
      custom_symbols?: string[];
      synthetic_index?: string;
    };

    // Get synthetic index if needed
    let syntheticIndex: { components: string[]; weights: number[] | null } | undefined;
    if (universeConfig.type === "synthetic" && universeConfig.synthetic_index) {
      const { data: index } = await supabase
        .from("synthetic_indices")
        .select("*")
        .eq("id", universeConfig.synthetic_index)
        .eq("user_id", user.id)
        .single();
      if (index) {
        syntheticIndex = index as unknown as { components: string[]; weights: number[] | null };
      }
    }

    // 1. Get universe symbols
    const universeSymbols = await getUniverseSymbols(
      universeConfig as Parameters<typeof getUniverseSymbols>[0],
      alpacaClient,
      syntheticIndex
    );

    // 2. Rank symbols
    const rankingConfig = {
      factors: [{ factor: params.ranking_metric, weight: 1 }],
      lookback_days: params.lookback_days,
      top_n: params.long_n,
      short_n: params.short_n || 0,
    };
    const { rankedSymbols } = await rankSymbols(
      universeSymbols,
      rankingConfig,
      alpacaClient
    );

    // 3. Get account info and current positions
    const account = await alpacaClient.getAccount();
    const allPositions = await alpacaClient.getPositions();
    const totalEquity = parseFloat(account.equity);
    const buyingPower = parseFloat(account.buying_power);
    const cash = parseFloat(account.cash);

    // Calculate allocated equity based on strategy's allocation percentage
    const allocationPct = strategy.allocation_pct || 100;
    const allocatedEquity = totalEquity * (allocationPct / 100);

    // STRATEGY ISOLATION: Only consider positions owned by THIS strategy
    const ownedSymbols = await getStrategyPositions(user.id, id);
    
    const currentPositions: CurrentPosition[] = allPositions
      .filter(p => ownedSymbols.has(p.symbol))
      .map((p) => ({
        symbol: p.symbol,
        qty: parseFloat(p.qty),
        market_value: parseFloat(p.market_value),
        current_price: parseFloat(p.current_price),
      }));

    console.log(`Strategy ${strategy.name} Test Run: Tracking ${ownedSymbols.size} owned positions, found ${currentPositions.length} in account`);

    // 4. Calculate target positions
    const executionConfig = {
      signal_conditions: null,
      cash_reserve_pct: params.cash_reserve_pct ?? 0,
      top_n: params.long_n,
      weight_scheme: params.weight_scheme ?? "equal",
      max_weight_per_symbol: params.max_weight_per_symbol ?? 0.2,
    };

    const { targets } = calculateTargetPositions(
      rankedSymbols,
      executionConfig,
      allocatedEquity, // Use allocated portion, not total equity
      currentPositions,
      []
    );

    // 5. Calculate rebalance orders (applying rebalance_fraction)
    const { orders } = calculateRebalanceOrders(
      targets,
      currentPositions,
      rebalanceFraction // Only trade this fraction of the difference
    );

    // 6. Validate orders against buying power
    const { adjustedOrders } = validateOrders(orders, buyingPower);

    // 7. Generate analysis
    const totalBuyValue = adjustedOrders
      .filter((o) => o.side === "buy")
      .reduce((sum, o) => sum + o.notional, 0);
    const totalSellValue = adjustedOrders
      .filter((o) => o.side === "sell")
      .reduce((sum, o) => sum + o.notional, 0);

    const selectedSymbols = rankedSymbols.slice(0, params.long_n);
    const rejectedSymbols = rankedSymbols.slice(params.long_n);

    const analysis = {
      summary: `Would ${adjustedOrders.length === 0 ? "place NO orders" : `place ${adjustedOrders.length} orders`} (${adjustedOrders.filter(o => o.side === "buy").length} buys, ${adjustedOrders.filter(o => o.side === "sell").length} sells)`,
      details: [
        `Strategy allocation: ${allocationPct}% of portfolio ($${allocatedEquity.toLocaleString()})`,
        `Rebalance fraction: ${(rebalanceFraction * 100).toFixed(0)}% (trades ${(rebalanceFraction * 100).toFixed(0)}% of difference each run)`,
        `Universe: ${universeSymbols.length} symbols evaluated`,
        `Top ${params.long_n} selected: ${selectedSymbols.map(s => s.symbol).join(", ") || "None"}`,
        selectedSymbols.length > 0
          ? `Best performer: ${selectedSymbols[0].symbol} (score: ${selectedSymbols[0].score.toFixed(2)})`
          : "No symbols ranked",
        rejectedSymbols.length > 0
          ? `Excluded ${rejectedSymbols.length} lower-ranked symbols`
          : "All ranked symbols selected",
        `Current positions: ${currentPositions.length} (total value: $${currentPositions.reduce((s, p) => s + p.market_value, 0).toFixed(2)})`,
        `Target positions: ${targets.length} (target value: $${targets.reduce((s, t) => s + t.targetValue, 0).toFixed(2)})`,
        adjustedOrders.length > 0
          ? `Net change: $${(totalBuyValue - totalSellValue).toFixed(2)} (Buy: $${totalBuyValue.toFixed(2)}, Sell: $${totalSellValue.toFixed(2)})`
          : "Portfolio already aligned with targets",
      ],
    };

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      account: {
        equity: totalEquity,
        buying_power: buyingPower,
        cash,
      },
      strategy: {
        allocation_pct: allocationPct,
        rebalance_fraction: rebalanceFraction,
        allocated_equity: allocatedEquity,
        weight_scheme: executionConfig.weight_scheme,
        max_weight_per_symbol: executionConfig.max_weight_per_symbol,
        cash_reserve_pct: executionConfig.cash_reserve_pct,
      },
      universe: {
        symbols: universeSymbols,
        size: universeSymbols.length,
      },
      ranking: {
        rankedSymbols: rankedSymbols.map(s => ({
          symbol: s.symbol,
          side: s.side,
          score: s.score,
          metrics: s.metrics,
        })),
        topN: params.long_n,
      },
      currentPositions: currentPositions.map(p => ({
        symbol: p.symbol,
        qty: p.qty,
        market_value: p.market_value,
        current_price: p.current_price,
      })),
      targetPositions: targets.map(t => ({
        symbol: t.symbol,
        side: t.side,
        targetValue: t.targetValue,
        targetWeight: t.targetWeight,
        currentValue: t.currentValue,
      })),
      orders: adjustedOrders.map(o => ({
        symbol: o.symbol,
        side: o.side,
        notional: o.notional,
        reason: o.reason,
      })),
      analysis,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in test-run:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
