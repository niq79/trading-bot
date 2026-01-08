/**
 * Unified strategy execution logic
 * Used by both Execute Now endpoint and scheduled runs
 */

import { AlpacaClient } from "@/lib/alpaca/client";
import { getUniverseSymbols, rankSymbols } from "./ranker";
import { calculateTargetPositions, CurrentPosition } from "./target-calculator";
import { calculateRebalanceOrders, validateOrders } from "./rebalancer";
import { getStrategyPositions, recordExecution } from "./strategy-ownership";
import { fetchSignal } from "@/lib/signals/fetcher";
import { SignalReading } from "@/types/signal";

export interface StrategyConfig {
  id: string;
  name: string;
  user_id: string;
  allocation_pct?: number; // Optional - defaults to 100% (full equity)
  params_json: {
    lookback_days: number;
    ranking_metric: string;
    long_n: number;
    short_n?: number;
    rebalance_fraction?: number;
    max_weight_per_symbol?: number;
    weight_scheme?: "equal" | "score_weighted" | "inverse_volatility";
    cash_reserve_pct?: number;
    signal_conditions?: Array<{ source_id: string }>;
  };
  universe_config_json: {
    type: string;
    predefined_list?: string;
    custom_symbols?: string[];
    synthetic_index?: string;
  };
}

export interface ExecutionOptions {
  dryRun?: boolean; // If true, simulate orders without placing them
  recordOwnership?: boolean; // If true, record execution in ownership tracking
  trigger?: "manual" | "automated"; // How the execution was triggered
}

export interface OrderResult {
  symbol: string;
  side: "buy" | "sell";
  notional: number;
  status: "success" | "failed" | "simulated" | "skipped";
  error?: string;
  orderId?: string | null;
}

export interface ExecutionResult {
  success: boolean;
  strategyId: string;
  strategyName: string;
  ordersPlaced: number;
  ordersFailed: number;
  error?: string;
  details: {
    universeSize: number;
    rankedSymbols: number;
    targetPositions: number;
    currentPositions: number;
    allocatedEquity: number;
    totalBuyValue: number;
    totalSellValue: number;
    netChange: number;
    estimatedFees: number;
    marketStatus: "open" | "closed";
    validationMessage?: string;
    orderResults: OrderResult[];
    signalReadings?: SignalReading[];
  };
}

function calculateEstimatedFees(orders: Array<{ symbol: string; notional: number }>): number {
  return orders.reduce((sum, order) => {
    const isCrypto = order.symbol.includes('/');
    // Alpaca fees: Stocks $0 (free), Crypto 20 bps (0.20%) on paper
    const feeRate = isCrypto ? 0.002 : 0;
    return sum + (order.notional * feeRate);
  }, 0);
}

/**
 * Execute a trading strategy
 * This is the unified implementation used by both Execute Now and scheduled runs
 */
export async function executeStrategy(
  strategy: StrategyConfig,
  alpacaClient: AlpacaClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  options: ExecutionOptions = {}
): Promise<ExecutionResult> {
  const {
    dryRun = false,
    recordOwnership = true,
    trigger = "automated"
  } = options;

  const params = strategy.params_json;
  const universeConfig = strategy.universe_config_json;
  const orderResults: OrderResult[] = [];

  try {
    // 1. Fetch signal readings
    const signalReadings: SignalReading[] = [];
    const signalConditions = params.signal_conditions || [];
    
    for (const condition of signalConditions) {
      try {
        // Check if it's a built-in source
        if (condition.source_id === "fear_greed_crypto") {
          const result = await fetchSignal("api", {
            url: "https://api.alternative.me/fng/",
            jsonpath: "$.data[0].value",
          });
          signalReadings.push({
            id: crypto.randomUUID(), // Temporary ID for in-memory reading
            source_id: condition.source_id,
            value: result.value,
            raw_response: result.raw,
            fetched_at: new Date().toISOString(),
          });
        } else {
          // Custom signal from database
          const { data: source } = await supabase
            .from("signal_sources")
            .select("*")
            .eq("id", condition.source_id)
            .eq("user_id", strategy.user_id)
            .single();

          if (source) {
            const result = await fetchSignal(source.type, source.config);
            signalReadings.push({
              id: crypto.randomUUID(), // Temporary ID for in-memory reading
              source_id: source.id,
              value: result.value,
              raw_response: result.raw,
              fetched_at: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error(`Failed to fetch signal ${condition.source_id}:`, error);
      }
    }

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
      universeConfig as Parameters<typeof getUniverseSymbols>[0],
      alpacaClient,
      syntheticIndex
    );

    // 4. Rank symbols
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

    // 5. Get account info and current positions
    const account = await alpacaClient.getAccount();
    const allPositions = await alpacaClient.getPositions();
    const totalEquity = parseFloat(account.equity);
    const buyingPower = parseFloat(account.buying_power);

    // Calculate allocated equity based on strategy's allocation percentage
    // Default to 100% (full equity) if not specified
    const allocationPct = strategy.allocation_pct ?? 100;
    const allocatedEquity = totalEquity * (allocationPct / 100);

    // STRATEGY ISOLATION: Only consider positions owned by THIS strategy
    const ownedSymbols = await getStrategyPositions(strategy.user_id, strategy.id, supabase);
    
    // Helper to normalize crypto symbols (BTCUSD <-> BTC/USD)
    const normalizeSymbol = (symbol: string) => {
      // If crypto without slash (e.g., BTCUSD), try adding slash
      if (/^[A-Z]{6,8}$/.test(symbol) && symbol.endsWith('USD')) {
        const base = symbol.slice(0, -3);
        return [symbol, `${base}/USD`];
      }
      // If has slash, also return without slash
      if (symbol.includes('/')) {
        return [symbol, symbol.replace('/', '')];
      }
      return [symbol];
    };
    
    // Convert Alpaca symbol to universe format (add slash for crypto)
    const toUniverseFormat = (symbol: string): string => {
      if (/^[A-Z]{6,8}$/.test(symbol) && symbol.endsWith('USD')) {
        const base = symbol.slice(0, -3);
        return `${base}/USD`;
      }
      return symbol;
    };
    
    // Create map of ALL positions for conflict detection
    const allPositionsMap = new Map<string, { qty: number; symbol: string }>();
    for (const p of allPositions) {
      const normalized = toUniverseFormat(p.symbol);
      allPositionsMap.set(normalized, { qty: parseFloat(p.qty), symbol: p.symbol });
    }
    
    const currentPositions: CurrentPosition[] = allPositions
      .filter(p => {
        // Check both symbol formats (with and without slash for crypto)
        const variants = normalizeSymbol(p.symbol);
        return variants.some(v => ownedSymbols.has(v));
      })
      .map((p) => {
        const qty = parseFloat(p.qty);
        const marketValue = parseFloat(p.market_value);
        // For short positions (qty < 0), make market_value negative for correct rebalancing math
        // This ensures: closing a short (target=0, current=-$1000) → diff=+$1000 → BUY order
        const signedMarketValue = qty < 0 ? -Math.abs(marketValue) : marketValue;
        
        return {
          symbol: toUniverseFormat(p.symbol), // Normalize to universe format
          qty,
          market_value: signedMarketValue,
          current_price: parseFloat(p.current_price),
        };
      });

    console.log(`Strategy ${strategy.name}: Tracking ${ownedSymbols.size} owned positions, found ${currentPositions.length} in account`);

    // 6. Calculate target positions
    const executionConfig = {
      signal_conditions: null, // Signal conditions not used in current implementation
      cash_reserve_pct: params.cash_reserve_pct ?? 0,
      top_n: params.long_n,
      short_n: params.short_n,
      weight_scheme: params.weight_scheme ?? "equal",
      max_weight_per_symbol: params.max_weight_per_symbol ?? 0.2,
    };

    const { targets } = calculateTargetPositions(
      rankedSymbols,
      executionConfig,
      allocatedEquity,
      currentPositions,
      signalReadings
    );

    // 7. Calculate rebalance orders
    const rebalanceFraction = params.rebalance_fraction ?? 0.25;
    const { orders } = calculateRebalanceOrders(targets, currentPositions, rebalanceFraction);
    console.log(`Strategy ${strategy.name}: Generated ${orders.length} rebalance orders`);

    // 8. Validate orders against buying power
    const { adjustedOrders, message: validationMessage } = validateOrders(orders, buyingPower);
    console.log(`Strategy ${strategy.name}: ${adjustedOrders.length} orders after validation (buying power: $${buyingPower.toFixed(2)})`);

    // 8.5. Check market status
    let marketIsOpen = true;
    try {
      const clock = await alpacaClient.getClock();
      marketIsOpen = clock.is_open;
      console.log(`Market status: ${marketIsOpen ? 'OPEN' : 'CLOSED'}`);
    } catch (error) {
      console.warn('Could not fetch market clock, assuming market is open:', error);
    }

    // 9. Execute orders (or simulate in dry run mode)
    console.log(`Strategy ${strategy.name}: Executing ${adjustedOrders.length} orders (dryRun: ${dryRun})`);
    
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
          // Crypto orders require 'gtc' (24/7 trading), stocks use 'day'
          const isCrypto = order.symbol.includes('/');
          const timeInForce = isCrypto ? 'gtc' : 'day';
          
          // Check if we have an actual short position (negative qty)
          const currentPos = currentPositions.find(p => p.symbol === order.symbol);
          const isActualShort = currentPos && currentPos.qty < 0;
          const isOpeningShort = order.isShortTarget && order.side === "sell" && (!currentPos || currentPos.qty >= 0);
          
          // CRITICAL: Check for conflicts when opening shorts
          if (isOpeningShort) {
            const accountPosition = allPositionsMap.get(order.symbol);
            if (accountPosition && accountPosition.qty > 0) {
              console.log(`⚠️ ${order.symbol}: Cannot open short - conflicting long position (${accountPosition.qty.toFixed(6)} shares) from another strategy`);
              orderResults.push({
                symbol: order.symbol,
                side: order.side,
                notional: order.notional,
                status: "skipped",
                error: "Cannot open short - existing long position from another strategy",
              });
              continue;
            }
          }
          
          console.log(`Placing order: ${order.side} ${order.symbol} $${order.notional.toFixed(2)} (${timeInForce})${isActualShort ? ' [SHORT POSITION]' : ''}${isOpeningShort ? ' [OPENING SHORT]' : ''}`);
          
          try {
            // For ACTUAL short positions (negative qty), must use whole shares when covering
            if (isActualShort && order.side === "buy") {
              // Covering a short - use whole shares
              const bars = await alpacaClient.getBars(order.symbol, { limit: 1 });
              if (bars.length === 0) {
                throw new Error("Cannot get current price for short cover");
              }
              const currentPrice = bars[0].c;
              const availableShort = Math.abs(currentPos.qty);
              let qty = Math.floor(order.notional / currentPrice);
              
              // Cap at actual short position size
              if (qty > availableShort) {
                console.log(`⚠️ ${order.symbol}: Capping short cover to ${availableShort.toFixed(6)} shares (requested ${qty})`);
                qty = Math.ceil(availableShort);
              }
              
              // Skip if qty is zero
              if (qty === 0) {
                console.log(`⏭️ ${order.symbol}: Skipping - notional too small for short cover`);
                orderResults.push({
                  symbol: order.symbol,
                  side: order.side,
                  notional: order.notional,
                  status: "skipped",
                  error: "Notional too small for whole share order",
                });
                continue;
              }
              
              // Place order with whole shares
              const alpacaOrder = await alpacaClient.placeOrder({
                symbol: order.symbol,
                qty: qty.toString(),
                side: order.side,
                type: "market",
                time_in_force: timeInForce,
              });
              
              orderResults.push({
                symbol: order.symbol,
                side: order.side,
                notional: qty * currentPrice,
                status: "success",
                orderId: alpacaOrder.id,
              });
              console.log(`✓ ${order.symbol} short cover submitted with ${qty} shares (order ID: ${alpacaOrder.id})`);
              continue;
            }
            
            // For OPENING short positions (SELL when not currently short), must use whole shares
            if (isOpeningShort) {
              // Check if there's a conflicting long position from another strategy
              const accountPosition = allPositionsMap.get(order.symbol);
              if (accountPosition && accountPosition.qty > 0) {
                console.log(`⚠️ ${order.symbol}: Cannot open short - conflicting long position (${accountPosition.qty.toFixed(6)} shares) from another strategy`);
                orderResults.push({
                  symbol: order.symbol,
                  side: order.side,
                  notional: order.notional,
                  status: "skipped",
                  error: "Cannot open short - existing long position from another strategy",
                });
                continue;
              }
              
              const bars = await alpacaClient.getBars(order.symbol, { limit: 1 });
              if (bars.length === 0) {
                throw new Error("Cannot get current price for short order");
              }
              const currentPrice = bars[0].c;
              let qty = Math.floor(order.notional / currentPrice);
              
              // Skip if qty is zero
              if (qty === 0) {
                console.log(`⏭️ ${order.symbol}: Skipping - notional $${order.notional.toFixed(2)} too small for opening short (need at least $${currentPrice.toFixed(2)})`);
                orderResults.push({
                  symbol: order.symbol,
                  side: order.side,
                  notional: order.notional,
                  status: "skipped",
                  error: "Notional too small for whole share short",
                });
                continue;
              }
              
              // Place short order with whole shares
              const alpacaOrder = await alpacaClient.placeOrder({
                symbol: order.symbol,
                qty: qty.toString(),
                side: "sell",
                type: "market",
                time_in_force: timeInForce,
              });
              
              orderResults.push({
                symbol: order.symbol,
                side: order.side,
                notional: qty * currentPrice,
                status: "success",
                orderId: alpacaOrder.id,
              });
              console.log(`✓ ${order.symbol} opened short with ${qty} shares (order ID: ${alpacaOrder.id})`);
              continue;
            }
            
            // Try notional order first (supports fractional shares for longs)
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
            console.log(`✓ ${order.symbol} order submitted successfully (order ID: ${alpacaOrder.id})`);
          } catch (notionalError) {
            // If notional orders not supported, retry with qty (fractional shares may still work)
            const errorMsg = notionalError instanceof Error ? notionalError.message : "";
            if (errorMsg.includes("not fractionable") || errorMsg.includes("40310000") || errorMsg.includes("42210000")) {
              console.log(`${order.symbol} notional order failed (${errorMsg.substring(0, 50)}...), retrying with qty`);
              
              // Check if this is opening a short position (SELL order marked as short target, no current position)
              const isOpeningShortFallback = order.isShortTarget && order.side === "sell" && (!currentPos || currentPos.qty >= 0);
              
              if (isOpeningShortFallback) {
                // Check if there's a conflicting long position from another strategy
                const accountPosition = allPositionsMap.get(order.symbol);
                if (accountPosition && accountPosition.qty > 0) {
                  console.log(`⚠️ ${order.symbol}: Cannot open short - conflicting long position (${accountPosition.qty.toFixed(6)} shares) from another strategy`);
                  orderResults.push({
                    symbol: order.symbol,
                    side: order.side,
                    notional: order.notional,
                    status: "skipped",
                    error: "Cannot open short - existing long position from another strategy",
                  });
                  continue;
                }
                
                // Opening short - must use whole shares
                const bars = await alpacaClient.getBars(order.symbol, { limit: 1 });
                if (bars.length === 0) {
                  throw new Error("Cannot get current price for short order");
                }
                const currentPrice = bars[0].c;
                let qty = Math.floor(order.notional / currentPrice);
                
                // Skip if qty is zero
                if (qty === 0) {
                  console.log(`⏭️ ${order.symbol}: Skipping - notional $${order.notional.toFixed(2)} too small for opening short (need at least $${currentPrice.toFixed(2)})`);
                  orderResults.push({
                    symbol: order.symbol,
                    side: order.side,
                    notional: order.notional,
                    status: "skipped",
                    error: "Notional too small for whole share short",
                  });
                  continue;
                }
                
                // Place short order with whole shares
                const alpacaOrder = await alpacaClient.placeOrder({
                  symbol: order.symbol,
                  qty: qty.toString(),
                  side: "sell",
                  type: "market",
                  time_in_force: timeInForce,
                });
                
                orderResults.push({
                  symbol: order.symbol,
                  side: order.side,
                  notional: qty * currentPrice,
                  status: "success",
                  orderId: alpacaOrder.id,
                });
                console.log(`✓ ${order.symbol} opened short with ${qty} shares (order ID: ${alpacaOrder.id})`);
                continue;
              }
              
              // For SELL orders (not opening shorts), we must verify we own the position FIRST
              // Otherwise Alpaca interprets it as short selling (not allowed with fractional)
              if (order.side === "sell") {
                const currentPos = currentPositions.find(p => p.symbol === order.symbol);
                if (!currentPos || currentPos.qty <= 0) {
                  // No long position to sell - skip this order
                  console.log(`⏭️ ${order.symbol}: Skipping sell order - no long position to sell`);
                  orderResults.push({
                    symbol: order.symbol,
                    side: order.side,
                    notional: order.notional,
                    status: "skipped",
                    error: "No long position to sell",
                  });
                  continue;
                }
              }
              
              // Get current price and calculate shares
              const bars = await alpacaClient.getBars(order.symbol, { limit: 1 });
              if (bars.length === 0) {
                throw new Error("Cannot get current price for qty calculation");
              }
              const currentPrice = bars[0].c;
              let qty = order.notional / currentPrice;
              
              // For sell orders, cap at actual shares owned
              if (order.side === "sell") {
                const currentPos = currentPositions.find(p => p.symbol === order.symbol);
                if (currentPos) {
                  const ownedQty = currentPos.qty; // Use actual qty (already verified > 0 above)
                  // Cap qty to what we actually own
                  if (qty > ownedQty) {
                    console.log(`📊 ${order.symbol}: Capping sell from ${qty.toFixed(6)} to owned quantity ${ownedQty.toFixed(6)} shares`);
                    qty = ownedQty;
                  }
                }
              }
              
              // Skip if qty is effectively zero
              if (qty < 0.000001) {
                console.log(`⏭️ ${order.symbol}: Skipping - notional $${order.notional.toFixed(2)} too small at $${currentPrice.toFixed(2)}/share`);
                orderResults.push({
                  symbol: order.symbol,
                  side: order.side,
                  notional: order.notional,
                  status: "skipped",
                  error: "Notional too small for order",
                });
                continue;
              }
              
              // For non-fractionable assets, round to whole shares
              // BUY: floor to avoid over-buying, SELL: use actual owned qty (already handled above)
              const finalQty = order.side === "buy" ? Math.floor(qty) : qty;
              
              // Skip if rounded to zero
              if (finalQty < 0.000001) {
                console.log(`⏭️ ${order.symbol}: Skipping - notional $${order.notional.toFixed(2)} rounds to 0 whole shares at $${currentPrice.toFixed(2)}/share`);
                orderResults.push({
                  symbol: order.symbol,
                  side: order.side,
                  notional: order.notional,
                  status: "skipped",
                  error: "Notional too small for whole share order",
                });
                continue;
              }
              
              // Retry with calculated qty (whole shares for non-fractionable assets)
              const alpacaOrder = await alpacaClient.placeOrder({
                symbol: order.symbol,
                qty: finalQty.toString(),
                side: order.side,
                type: "market",
                time_in_force: timeInForce,
              });
              
              orderResults.push({
                symbol: order.symbol,
                side: order.side,
                notional: finalQty * currentPrice,
                status: "success",
                orderId: alpacaOrder.id,
              });
              console.log(`✓ ${order.symbol}: Placed ${finalQty.toFixed(6)} shares at ~$${currentPrice.toFixed(2)}`);
            } else {
              // Different error, re-throw
              throw notionalError;
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`✗ ${order.symbol} order failed:`, errorMsg);
        orderResults.push({
          symbol: order.symbol,
          side: order.side,
          notional: order.notional,
          status: "failed",
          error: errorMsg,
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

    // 11. Calculate summary
    const successfulOrders = orderResults.filter(o => 
      o.status === "success" || o.status === "simulated"
    ).length;
    
    const failedOrders = orderResults.filter(o => 
      o.status === "failed"
    ).length;

    const totalBuyValue = adjustedOrders
      .filter(o => o.side === "buy")
      .reduce((sum, o) => sum + o.notional, 0);
    
    const totalSellValue = adjustedOrders
      .filter(o => o.side === "sell")
      .reduce((sum, o) => sum + o.notional, 0);

    const estimatedFees = calculateEstimatedFees(
      adjustedOrders.map(o => ({ symbol: o.symbol, notional: o.notional }))
    );

    console.log(`Strategy ${strategy.name}: ${successfulOrders} successful, ${failedOrders} failed out of ${adjustedOrders.length} orders`);

    // 12. Record execution for strategy ownership tracking
    if (recordOwnership && !dryRun) {
      try {
        // Map order results to match recordExecution signature
        // Filter out skipped orders since they weren't actually placed
        const recordableOrders = orderResults
          .filter(o => o.status !== "skipped")
          .map(o => ({
            symbol: o.symbol,
            side: o.side,
            notional: o.notional,
            status: (o.status === "simulated" ? "success" : o.status) as "success" | "failed",
            orderId: o.orderId || undefined,
            error: o.error,
          }));
        
        await recordExecution(
          strategy.user_id,
          strategy.id,
          recordableOrders,
          {
            ordersPlaced: successfulOrders,
            ordersFailed: failedOrders,
            totalBuyValue,
            totalSellValue,
            estimatedFees,
            marketStatus: marketIsOpen ? "open" : "closed",
          },
          {
            universeSize: universeSymbols.length,
            rankedSymbols: rankedSymbols.length,
            targetPositions: targets.length,
            signalReadings,
            validationMessage,
          },
          supabase
        );
        console.log(`Strategy ${strategy.name}: Recorded ${trigger} execution`);
      } catch (recordError) {
        console.error('Failed to record execution ownership:', recordError);
        // Don't fail the whole execution if recording fails
      }
    }

    return {
      success: true,
      strategyId: strategy.id,
      strategyName: strategy.name,
      ordersPlaced: successfulOrders,
      ordersFailed: failedOrders,
      details: {
        universeSize: universeSymbols.length,
        rankedSymbols: rankedSymbols.length,
        targetPositions: targets.length,
        currentPositions: currentPositions.length,
        allocatedEquity,
        totalBuyValue,
        totalSellValue,
        netChange: totalBuyValue - totalSellValue,
        estimatedFees,
        marketStatus: marketIsOpen ? "open" : "closed",
        validationMessage,
        orderResults,
        signalReadings,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Strategy ${strategy.name} execution failed:`, error);
    
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
        marketStatus: "closed",
        orderResults,
      },
    };
  }
}
