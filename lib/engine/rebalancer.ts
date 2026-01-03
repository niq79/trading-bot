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
 */
export function calculateRebalanceOrders(
  targets: TargetPosition[],
  currentPositions: CurrentPosition[],
  minTradeSize: number = 1 // Minimum $1 trade
): RebalanceResult {
  const orders: RebalanceOrder[] = [];
  const targetSymbols = new Set(targets.map((t) => t.symbol));
  const symbolsToClose: string[] = [];

  // First, identify positions to close (not in targets)
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
    const diff = target.targetValue - target.currentValue;

    // Skip if difference is too small
    if (Math.abs(diff) < minTradeSize) {
      continue;
    }

    if (diff > 0) {
      orders.push({
        symbol: target.symbol,
        side: "buy",
        notional: diff,
        reason: `Increase position to ${(target.targetWeight * 100).toFixed(1)}% target`,
      });
    } else if (diff < 0) {
      orders.push({
        symbol: target.symbol,
        side: "sell",
        notional: Math.abs(diff),
        reason: `Reduce position to ${(target.targetWeight * 100).toFixed(1)}% target`,
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
