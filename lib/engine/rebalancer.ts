import { TargetPosition, CurrentPosition } from "./target-calculator";

export interface RebalanceOrder {
  symbol: string;
  side: "buy" | "sell";
  notional: number;
  reason: string;
  isShortTarget?: boolean;  // True if target position is a short
}

export interface RebalanceResult {
  orders: RebalanceOrder[];
  totalBuyNotional: number;
  totalSellNotional: number;
  symbolsToClose: string[];
}

/**
 * Calculate the orders needed to rebalance from current to target positions
 * @param targets - Target positions to achieve
 * @param currentPositions - Current positions (filtered to only this strategy's positions)
 * @param rebalanceFraction - Fraction of difference to trade (0.25 = 25%)
 * @param minTradeSize - Minimum trade size in dollars
 */
export function calculateRebalanceOrders(
  targets: TargetPosition[],
  currentPositions: CurrentPosition[],
  rebalanceFraction: number = 1.0, // Default to full rebalance
  minTradeSize: number = 1 // Minimum $1 trade
): RebalanceResult {
  const orders: RebalanceOrder[] = [];
  const targetSymbols = new Set(targets.map((t) => t.symbol));
  const symbolsToClose: string[] = [];

  // Clamp rebalance fraction between 0 and 1
  const fraction = Math.max(0, Math.min(1, rebalanceFraction));

  // First, identify positions to close (not in targets)
  // Apply rebalance_fraction to exits as well for consistency
  for (const position of currentPositions) {
    // Skip positions with no value (already flat)
    if (Math.abs(position.market_value) < 0.01) continue;
    
    if (!targetSymbols.has(position.symbol)) {
      symbolsToClose.push(position.symbol);
      const isShort = position.market_value < 0;
      const exitAmount = Math.abs(position.market_value) * fraction;
      const stepPercent = (fraction * 100).toFixed(0);
      
      orders.push({
        symbol: position.symbol,
        side: isShort ? "buy" : "sell",  // Buy to close short, sell to close long
        notional: exitAmount,
        reason: `Exit ${isShort ? 'short' : 'long'} position not in target universe (${stepPercent}% step)`,
        isShortTarget: isShort,
      });
    }
  }

  // Calculate buy and sell orders for target positions
  for (const target of targets) {
    const fullDiff = target.targetValue - target.currentValue;
    
    // Apply rebalance fraction to the difference
    const diff = fullDiff * fraction;

    // Skip if difference is too small
    if (Math.abs(diff) < minTradeSize) {
      continue;
    }

    // Determine position type and action for reason
    const positionType = target.side === 'short' ? 'short' : 'long';
    const weightPercent = (Math.abs(target.targetWeight) * 100).toFixed(1);
    const stepPercent = (fraction * 100).toFixed(0);
    const isShortTarget = target.side === 'short';
    
    // For shorts: currentValue and targetValue are both negative (or zero)
    // Opening short: current=0, target<0 → diff<0 → SELL
    // Closing short: current<0, target=0 → diff>0 → BUY
    // For longs: both positive
    const hasCurrentPosition = Math.abs(target.currentValue) > 0.01;
    const currentlyShort = target.currentValue < -0.01;
    const currentlyLong = target.currentValue > 0.01;

    if (diff > 0) {
      // Positive diff: BUY order (increase long OR cover short)
      let action = 'Increase';
      if (currentlyShort && !isShortTarget) {
        action = 'Cover short and establish';
      } else if (currentlyShort && isShortTarget) {
        action = 'Cover';
      }
      
      orders.push({
        symbol: target.symbol,
        side: "buy",
        notional: diff,
        reason: `${action} ${positionType} position toward ${weightPercent}% target (${stepPercent}% step)`,
        isShortTarget,
      });
    } else if (diff < 0) {
      // Negative diff: SELL order (reduce long OR open short)
      let action = 'Reduce';
      if (!hasCurrentPosition && isShortTarget) {
        action = 'Open';
      } else if (currentlyLong && isShortTarget) {
        action = 'Close long and open';
      }
      
      orders.push({
        symbol: target.symbol,
        side: "sell",
        notional: Math.abs(diff),
        reason: `${action} ${positionType} position toward ${weightPercent}% target (${stepPercent}% step)`,
        isShortTarget,
      });
    }
  }

  // Sort orders: sells first, then buys (to free up cash)
  orders.sort((a, b) => {
    if (a.side === "sell" && b.side === "buy") return -1;
    if (a.side === "buy" && b.side === "sell") return 1;
    return 0;
  });

  const totalBuyNotional = orders
    .filter((o) => o.side === "buy")
    .reduce((sum, o) => sum + o.notional, 0);

  const totalSellNotional = orders
    .filter((o) => o.side === "sell")
    .reduce((sum, o) => sum + o.notional, 0);

  return {
    orders,
    totalBuyNotional,
    totalSellNotional,
    symbolsToClose,
  };
}

/**
 * Validate that orders can be executed given available buying power
 */
export function validateOrders(
  orders: RebalanceOrder[],
  buyingPower: number
): { valid: boolean; adjustedOrders: RebalanceOrder[]; message: string } {
  const totalBuyNotional = orders
    .filter((o) => o.side === "buy")
    .reduce((sum, o) => sum + o.notional, 0);

  if (totalBuyNotional <= buyingPower) {
    return {
      valid: true,
      adjustedOrders: orders,
      message: "All orders can be executed",
    };
  }

  // Scale down buy orders proportionally
  const scaleFactor = buyingPower / totalBuyNotional;
  const adjustedOrders = orders.map((order) => {
    if (order.side === "buy") {
      return {
        ...order,
        notional: order.notional * scaleFactor,
        reason: `${order.reason} (scaled to ${(scaleFactor * 100).toFixed(0)}%)`,
      };
    }
    return order;
  });

  return {
    valid: false,
    adjustedOrders,
    message: `Insufficient buying power. Orders scaled to ${(scaleFactor * 100).toFixed(1)}%`,
  };
}
