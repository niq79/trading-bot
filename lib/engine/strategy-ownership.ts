/**
 * Strategy ownership utilities
 * Helps track which positions belong to which strategy
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export interface PositionOwnership {
  symbol: string;
  strategy_id: string;
  last_order_side: 'buy' | 'sell';
  last_order_at: string;
}

/**
 * Get all symbols currently owned by a specific strategy
 * Based on the most recent successful orders from execution_orders table
 */
export async function getStrategyPositions(
  userId: string,
  strategyId: string,
  supabase?: any
): Promise<Set<string>> {
  // If no client provided, create one (for backwards compatibility)
  const client = supabase || await createSupabaseClient();
  
  // Get all successful buy/sell orders for this strategy, ordered by most recent
  const { data: orders } = await client
    .from('execution_orders')
    .select('symbol, side, created_at')
    .eq('user_id', userId)
    .eq('strategy_id', strategyId)
    .eq('status', 'success')
    .order('created_at', { ascending: false });

  if (!orders || orders.length === 0) {
    return new Set();
  }

  // Track the most recent action for each symbol
  const symbolActions = new Map<string, 'buy' | 'sell'>();
  
  for (const order of orders as Array<{ symbol: string; side: string; created_at: string }>) {
    if (!symbolActions.has(order.symbol)) {
      symbolActions.set(order.symbol, order.side as 'buy' | 'sell');
    }
  }

  // Only include symbols where the last action was 'buy' (meaning we still own it)
  const ownedSymbols = new Set<string>();
  for (const [symbol, lastAction] of symbolActions.entries()) {
    if (lastAction === 'buy') {
      ownedSymbols.add(symbol);
    }
  }

  return ownedSymbols;
}

/**
 * Get symbols owned by OTHER strategies (to avoid conflicts)
 */
export async function getOtherStrategiesPositions(
  userId: string,
  currentStrategyId: string,
  supabase?: any
): Promise<Set<string>> {
  const client = supabase || await createSupabaseClient();
  
  // Get all successful orders from OTHER strategies
  const { data: orders } = await client
    .from('execution_orders')
    .select('symbol, side, strategy_id, created_at')
    .eq('user_id', userId)
    .neq('strategy_id', currentStrategyId)
    .eq('status', 'success')
    .order('created_at', { ascending: false });

  if (!orders || orders.length === 0) {
    return new Set();
  }

  // Track most recent action per symbol per strategy
  const symbolsByStrategy = new Map<string, Map<string, 'buy' | 'sell'>>();
  
  for (const order of orders as Array<{ symbol: string; side: string; strategy_id: string; created_at: string }>) {
    if (!symbolsByStrategy.has(order.strategy_id)) {
      symbolsByStrategy.set(order.strategy_id, new Map());
    }
    
    const strategySymbols = symbolsByStrategy.get(order.strategy_id)!;
    if (!strategySymbols.has(order.symbol)) {
      strategySymbols.set(order.symbol, order.side as 'buy' | 'sell');
    }
  }

  // Collect all symbols owned by other strategies
  const otherSymbols = new Set<string>();
  for (const [_, symbols] of symbolsByStrategy) {
    for (const [symbol, lastAction] of symbols) {
      if (lastAction === 'buy') {
        otherSymbols.add(symbol);
      }
    }
  }

  return otherSymbols;
}

/**
 * Record orders from an execution
 */
export async function recordExecution(
  userId: string,
  strategyId: string,
  orders: Array<{
    symbol: string;
    side: 'buy' | 'sell';
    notional: number;
    status: 'success' | 'failed';
    orderId?: string;
    error?: string;
  }>,
  summary: {
    ordersPlaced: number;
    ordersFailed: number;
    totalBuyValue: number;
    totalSellValue: number;
    estimatedFees: number;
    marketStatus: string;
  },
  metadata?: any,
  supabase?: any
): Promise<string> {
  const client = supabase || await createSupabaseClient();
  
  // Insert execution record
  const { data: execution, error: execError } = await client
    .from('executions')
    .insert({
      user_id: userId,
      strategy_id: strategyId,
      orders_placed: summary.ordersPlaced,
      orders_failed: summary.ordersFailed,
      total_buy_value: summary.totalBuyValue,
      total_sell_value: summary.totalSellValue,
      estimated_fees: summary.estimatedFees,
      market_status: summary.marketStatus,
      execution_metadata: metadata,
    } as any)
    .select()
    .single();

  if (execError || !execution) {
    console.error('Failed to record execution:', execError);
    throw new Error('Failed to record execution');
  }

  // Insert individual orders
  if (orders.length > 0) {
    const orderRecords = orders.map(order => ({
      execution_id: (execution as any).id,
      user_id: userId,
      strategy_id: strategyId,
      symbol: order.symbol,
      side: order.side,
      notional: order.notional,
      status: order.status,
      alpaca_order_id: order.orderId,
      error_message: order.error,
    }));

    const { error: ordersError } = await client
      .from('execution_orders')
      .insert(orderRecords as any);

    if (ordersError) {
      console.error('Failed to record orders:', ordersError);
      // Don't throw - execution record is already created
    }
  }

  return (execution as any).id;
}
