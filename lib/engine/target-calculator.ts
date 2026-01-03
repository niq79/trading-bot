import { RankedSymbol } from "./ranker";
import { ExecutionConfig, SignalCondition } from "@/types/strategy";
import { SignalReading } from "@/types/signal";

export interface TargetPosition {
  symbol: string;
  side: 'long' | 'short';
  targetWeight: number;
  targetValue: number;
  currentValue: number;
  currentShares: number;
  score: number;
}

export interface TargetCalculationResult {
  targets: TargetPosition[];
  totalEquity: number;
  cashReserve: number;
  investableAmount: number;
  signalModifiers: Record<string, number>;
}

export interface CurrentPosition {
  symbol: string;
  qty: number;
  market_value: number;
  current_price: number;
}

/**
 * Calculate target positions based on ranking and execution config
 */
export function calculateTargetPositions(
  rankedSymbols: RankedSymbol[],
  executionConfig: ExecutionConfig,
  totalEquity: number,
  currentPositions: CurrentPosition[],
  signalReadings: SignalReading[]
): TargetCalculationResult {
  // Apply signal conditions to determine modifiers
  const signalModifiers = calculateSignalModifiers(
    executionConfig.signal_conditions ?? [],
    signalReadings
  );

  // Check if we should trade at all (conditional gate)
  const shouldTrade = checkConditionalGates(
    executionConfig.signal_conditions ?? [],
    signalReadings
  );

  if (!shouldTrade) {
    // Return all current positions with zero target (will trigger close all)
    return {
      targets: [],
      totalEquity,
      cashReserve: totalEquity * executionConfig.cash_reserve_pct,
      investableAmount: 0,
      signalModifiers,
    };
  }

  // Calculate investable amount after cash reserve
  const cashReserve = totalEquity * executionConfig.cash_reserve_pct;
  const baseInvestable = totalEquity - cashReserve;

  // Apply position modifier from signals
  const positionModifier = Object.values(signalModifiers).reduce(
    (acc, mod) => acc * mod,
    1
  );
  const investableAmount = baseInvestable * positionModifier;

  // Separate longs and shorts
  const longSymbols = rankedSymbols.filter(s => s.side === 'long');
  const shortSymbols = rankedSymbols.filter(s => s.side === 'short');

  // Calculate weights for longs
  let longWeights = calculateWeights(longSymbols, executionConfig.weight_scheme);
  
  // Calculate weights for shorts
  let shortWeights = calculateWeights(shortSymbols, executionConfig.weight_scheme);

  // Apply max weight per symbol cap and redistribute excess for longs
  const maxWeight = executionConfig.max_weight_per_symbol;
  if (maxWeight < 1) {
    longWeights = applyMaxWeightCap(longWeights, maxWeight);
    shortWeights = applyMaxWeightCap(shortWeights, maxWeight);
  }

  // Create position map for current positions
  const positionMap = new Map<string, CurrentPosition>();
  for (const pos of currentPositions) {
    positionMap.set(pos.symbol, pos);
  }

  // Calculate target positions for longs
  const longTargets: TargetPosition[] = longSymbols.map((symbol, index) => {
    const weight = longWeights[index];
    const targetValue = investableAmount * weight;
    const currentPos = positionMap.get(symbol.symbol);

    return {
      symbol: symbol.symbol,
      side: 'long' as const,
      targetWeight: weight,
      targetValue,
      currentValue: currentPos?.market_value || 0,
      currentShares: currentPos?.qty || 0,
      score: symbol.score,
    };
  });

  // Calculate target positions for shorts (negative values)
  const shortTargets: TargetPosition[] = shortSymbols.map((symbol, index) => {
    const weight = shortWeights[index];
    const targetValue = -(investableAmount * weight); // Negative for shorts
    const currentPos = positionMap.get(symbol.symbol);

    return {
      symbol: symbol.symbol,
      side: 'short' as const,
      targetWeight: weight,
      targetValue,
      currentValue: currentPos?.market_value || 0,
      currentShares: currentPos?.qty || 0,
      score: symbol.score,
    };
  });

  const targets = [...longTargets, ...shortTargets];

  return {
    targets,
    totalEquity,
    cashReserve,
    investableAmount,
    signalModifiers,
  };
}

/**
 * Calculate weights based on the weighting scheme
 */
function calculateWeights(
  symbols: RankedSymbol[],
  scheme: "equal" | "score_weighted" | "inverse_volatility"
): number[] {
  const n = symbols.length;

  if (n === 0) return [];

  switch (scheme) {
    case "equal":
      return Array(n).fill(1 / n);

    case "score_weighted": {
      // Normalize scores to be positive
      const minScore = Math.min(...symbols.map((s) => s.score));
      const adjustedScores = symbols.map((s) => s.score - minScore + 1);
      const totalScore = adjustedScores.reduce((a, b) => a + b, 0);
      return adjustedScores.map((score) => score / totalScore);
    }

    case "inverse_volatility": {
      // Use inverse volatility if available, otherwise equal weight
      const volatilities = symbols.map((s) => s.metrics.volatility || 20);
      const inverseVols = volatilities.map((v) => 1 / v);
      const totalInverseVol = inverseVols.reduce((a, b) => a + b, 0);
      return inverseVols.map((iv) => iv / totalInverseVol);
    }

    default:
      return Array(n).fill(1 / n);
  }
}

/**
 * Calculate position modifiers based on signal conditions
 */
function calculateSignalModifiers(
  conditions: SignalCondition[],
  readings: SignalReading[]
): Record<string, number> {
  const modifiers: Record<string, number> = {};

  for (const condition of conditions) {
    if (condition.action_type !== "position_modifier") continue;

    const reading = readings.find((r) => r.source_id === condition.source_id);
    if (!reading) continue;

    const meetsCondition = evaluateCondition(
      reading.value,
      condition.operator,
      condition.threshold
    );

    if (meetsCondition) {
      modifiers[condition.source_id] = condition.action_params.multiplier || 1;
    }
  }

  return modifiers;
}

/**
 * Check if any conditional gates prevent trading
 */
function checkConditionalGates(
  conditions: SignalCondition[],
  readings: SignalReading[]
): boolean {
  for (const condition of conditions) {
    if (condition.action_type !== "conditional_gate") continue;

    const reading = readings.find((r) => r.source_id === condition.source_id);
    if (!reading) continue;

    const meetsCondition = evaluateCondition(
      reading.value,
      condition.operator,
      condition.threshold
    );

    // If condition is met, check what action to take
    if (meetsCondition) {
      const action = condition.action_params.action;
      if (action === "skip_trading") {
        return false;
      }
    }
  }

  return true;
}

/**
 * Evaluate a condition against a value
 */
function evaluateCondition(
  value: number,
  operator: SignalCondition["operator"],
  threshold: number
): boolean {
  switch (operator) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    case "eq":
      return value === threshold;
    case "neq":
      return value !== threshold;
    default:
      return false;
  }
}

/**
 * Apply max weight cap to weights array and redistribute excess
 */
function applyMaxWeightCap(weights: number[], maxWeight: number): number[] {
  let result = [...weights];
  let redistributionNeeded = true;
  let iterations = 0;
  const maxIterations = 10; // Prevent infinite loops

  while (redistributionNeeded && iterations < maxIterations) {
    redistributionNeeded = false;
    let excessWeight = 0;
    const cappedIndices: number[] = [];

    // Find symbols exceeding max weight and calculate excess
    result.forEach((w, i) => {
      if (w > maxWeight) {
        excessWeight += w - maxWeight;
        result[i] = maxWeight;
        cappedIndices.push(i);
        redistributionNeeded = true;
      }
    });

    // Redistribute excess weight to uncapped symbols
    if (excessWeight > 0) {
      const uncappedIndices = result
        .map((w, i) => (w < maxWeight && !cappedIndices.includes(i) ? i : -1))
        .filter((i) => i >= 0);

      if (uncappedIndices.length > 0) {
        const sharePerUncapped = excessWeight / uncappedIndices.length;
        uncappedIndices.forEach((i) => {
          result[i] += sharePerUncapped;
        });
      } else {
        // All positions are capped - keep them capped, don't normalize
        // This ensures max_weight is respected even if sum < 1
        return result;
      }
    }

    iterations++;
  }

  // Normalize to ensure sum is exactly 1
  // Only normalize if we didn't hit the "all capped" case above
  const totalWeight = result.reduce((sum, w) => sum + w, 0);
  if (totalWeight > 0) {
    result = result.map((w) => w / totalWeight);
  }

  return result;
}
