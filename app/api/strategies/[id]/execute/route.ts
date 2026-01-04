import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";
import { getUniverseSymbols, rankSymbols } from "@/lib/engine/ranker";
import { calculateTargetPositions, CurrentPosition } from "@/lib/engine/target-calculator";
import { calculateRebalanceOrders, validateOrders } from "@/lib/engine/rebalancer";

interface OrderResult {
  symbol: string;
  side: "buy" | "sell";
  notional: number;
  status: "success" | "failed";
  error?: string;
  orderId?: string;
}

function calculateEstimatedFees(orders: Array<{ symbol: string; notional: number }>): {
  totalFees: number;
  breakdown: Array<{ symbol: string; fee: number }>;
} {
  const breakdown = orders.map(order => {
    // Crypto symbols have slash (e.g., BTC/USD)
    const isCrypto = order.symbol.includes('/');
    
    // Alpaca fees:
    // - Stocks: $0 (free)
    // - Crypto: 20 bps (0.20%) on paper trading
    const feeRate = isCrypto ? 0.002 : 0;
    const fee = order.notional * feeRate;
    
    return { symbol: order.symbol, fee };
  });
  
  const totalFees = breakdown.reduce((sum, b) => sum + b.fee, 0);
  
  return { totalFees, breakdown };
}

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
        is_enabled: boolean;
        params_json: Record<string, unknown>;
        universe_config_json: Record<string, unknown>;
      } | null;
    };

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    // Check if strategy is enabled
    if (!strategy.is_enabled) {
      return NextResponse.json(
        { error: "Strategy is disabled. Enable it before executing." },
        { status: 400 }
      );
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

    // Check market status (informational only)
    const clock = await alpacaClient.getClock();
    const isMarketOpen = clock.is_open;

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
    const positions = await alpacaClient.getPositions();
    const totalEquity = parseFloat(account.equity);
    const buyingPower = parseFloat(account.buying_power);

    // Calculate allocated equity based on strategy's allocation percentage
    const allocationPct = strategy.allocation_pct || 100;
    const allocatedEquity = totalEquity * (allocationPct / 100);

    const currentPositions: CurrentPosition[] = positions.map((p) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      market_value: parseFloat(p.market_value),
      current_price: parseFloat(p.current_price),
    }));

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
      allocatedEquity,
      currentPositions,
      []
    );

    // 5. Calculate rebalance orders
    const { orders } = calculateRebalanceOrders(
      targets,
      currentPositions,
      rebalanceFraction
    );

    // 6. Validate orders against buying power
    const { adjustedOrders, message: validationMessage } = validateOrders(orders, buyingPower);

    if (adjustedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        ordersPlaced: 0,
        message: "No orders needed - portfolio already aligned with targets",
        marketStatus: isMarketOpen ? "open" : "closed",
      });
    }

    // 7. Calculate estimated fees
    const { totalFees, breakdown: feeBreakdown } = calculateEstimatedFees(
      adjustedOrders.map(o => ({ symbol: o.symbol, notional: o.notional }))
    );

    // 8. Execute orders (REAL ORDERS!)
    const orderResults: OrderResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const order of adjustedOrders) {
      try {
        // Crypto orders require 'gtc' (good-til-canceled), stocks use 'day'
        const isCrypto = order.symbol.includes('/');
        const timeInForce = isCrypto ? 'gtc' : 'day';
        
        const alpacaOrder = await alpacaClient.placeOrder({
          symbol: order.symbol,
          notional: order.notional.toFixed(2),
          side: order.side,
          type: "market",
          time_in_force: timeInForce,
        });

        orderResults.push({
          symbol: order.symbol,
          side: order.side,
          notional: order.notional,
          status: "success",
          orderId: alpacaOrder.id,
        });
        successCount++;
      } catch (error) {
        orderResults.push({
          symbol: order.symbol,
          side: order.side,
          notional: order.notional,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failedCount++;
      }
    }

    // 9. Log execution to strategy_runs table
    const runRecord = {
      strategy_id: strategy.id,
      user_id: user.id,
      trigger: "manual",
      orders_placed: successCount,
      orders_failed: failedCount,
      total_buy_value: adjustedOrders
        .filter(o => o.side === "buy")
        .reduce((sum, o) => sum + o.notional, 0),
      total_sell_value: adjustedOrders
        .filter(o => o.side === "sell")
        .reduce((sum, o) => sum + o.notional, 0),
      execution_details: {
        rankedSymbols: rankedSymbols.length,
        targetPositions: targets.length,
        orderResults,
        marketStatus: isMarketOpen ? "open" : "closed",
        validationMessage,
        estimatedFees: totalFees,
      },
    };

    await supabase.from("strategy_runs").insert(runRecord as never); // Type assertion for Supabase

    // 10. Return results
    const totalBuyValue = adjustedOrders
      .filter(o => o.side === "buy")
      .reduce((sum, o) => sum + o.notional, 0);
    const totalSellValue = adjustedOrders
      .filter(o => o.side === "sell")
      .reduce((sum, o) => sum + o.notional, 0);

    return NextResponse.json({
      success: true,
      ordersPlaced: successCount,
      ordersFailed: failedCount,
      marketStatus: isMarketOpen ? "open" : "closed",
      summary: {
        totalOrders: adjustedOrders.length,
        successful: successCount,
        failed: failedCount,
        totalBuyValue,
        totalSellValue,
        netChange: totalBuyValue - totalSellValue,
        estimatedFees: totalFees,
      },
      orderResults,
      feeBreakdown: feeBreakdown.filter(f => f.fee > 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error executing strategy:", error);
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
