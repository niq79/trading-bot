import { TargetPosition, CurrentPosition } from "./target-calculator";

export interface RebalanceOrder {
  symbol: string;
  side: "buy" | "sell";
  notional: number;
  reason: string;
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
 * @param currentPositions - Current positions
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
  // Note: Positions not in target universe are closed fully regardless of rebalance_fraction
  for (const position of currentPositions) {
    if (!targetSymbols.has(position.symbol) && position.market_value > 0) {
      symbolsToClose.push(position.symbol);
      orders.push({
        symbol: position.symbol,
        side: "sell",
        notional: position.market_value,
        reason: "Position not in target universe",
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

    // Determine position type for reason
    const positionType = target.side === 'short' ? 'short' : 'long';
    const weightPercent = (Math.abs(target.targetWeight) * 100).toFixed(1);
    const stepPercent = (fraction * 100).toFixed(0);

    if (diff > 0) {
      orders.push({
        symbol: target.symbol,
        side: "buy",
        notional: diff,
        reason: `Increase ${positionType} position toward ${weightPercent}% target (${stepPercent}% step)`,
      });
    } else if (diff < 0) {
      orders.push({
        symbol: target.symbol,
        side: "sell",
        notional: Math.abs(diff),
        reason: `Reduce ${positionType} position toward ${weightPercent}% target (${stepPercent}% step)`,
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
