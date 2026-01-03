import { AlpacaClient } from "@/lib/alpaca/client";
import { UniverseConfig, StrategyParams } from "@/types/strategy";

export interface RankingConfig {
  factors: Array<{
    factor: string;
    weight: number;
  }>;
}

export interface RankedSymbol {
  symbol: string;
  score: number;
  metrics: Record<string, number>;
}

export interface RankingResult {
  rankedSymbols: RankedSymbol[];
  timestamp: string;
}

/**
 * Get the list of symbols from the universe configuration
 */
export async function getUniverseSymbols(
  universeConfig: UniverseConfig,
  alpacaClient: AlpacaClient,
  syntheticIndex?: { components: string[]; weights: number[] | null }
): Promise<string[]> {
  const symbols: Set<string> = new Set();

  // Add predefined list
  if (universeConfig.type === "predefined" && universeConfig.predefined_list) {
    const indexSymbols = await getIndexSymbols(universeConfig.predefined_list);
    indexSymbols.forEach((s) => symbols.add(s));
  }

  // Add custom symbols
  if (universeConfig.type === "custom" && universeConfig.custom_symbols) {
    universeConfig.custom_symbols.forEach((symbol) => symbols.add(symbol.toUpperCase()));
  }

  // Add synthetic index components
  if (universeConfig.type === "synthetic" && syntheticIndex) {
    syntheticIndex.components.forEach((symbol) => symbols.add(symbol.toUpperCase()));
  }

  // Filter by tradability on Alpaca
  const tradableSymbols = await filterTradableSymbols(
    Array.from(symbols),
    alpacaClient
  );

  return tradableSymbols;
}

/**
 * Get symbols for a predefined index
 */
async function getIndexSymbols(indexId: string): Promise<string[]> {
  // In a production system, these would be fetched from a data provider
  // For MVP, we use static lists
  const indices: Record<string, string[]> = {
    sp500_top10: [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "NVDA",
      "META",
      "TSLA",
      "BRK.B",
      "UNH",
      "JNJ",
    ],
    nasdaq100_top10: [
      "AAPL",
      "MSFT",
      "GOOGL",
      "AMZN",
      "NVDA",
      "META",
      "TSLA",
      "AVGO",
      "COST",
      "ADBE",
    ],
    dow30: [
      "AAPL",
      "AMGN",
      "AXP",
      "BA",
      "CAT",
      "CRM",
      "CSCO",
      "CVX",
      "DIS",
      "DOW",
      "GS",
      "HD",
      "HON",
      "IBM",
      "INTC",
      "JNJ",
      "JPM",
      "KO",
      "MCD",
      "MMM",
      "MRK",
      "MSFT",
      "NKE",
      "PG",
      "TRV",
      "UNH",
      "V",
      "VZ",
      "WBA",
      "WMT",
    ],
    mag7: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"],
  };

  return indices[indexId] || [];
}

/**
 * Filter symbols to only those tradable on Alpaca
 * TODO: Implement getAsset method in AlpacaClient
 */
async function filterTradableSymbols(
  symbols: string[],
  alpacaClient: AlpacaClient
): Promise<string[]> {
  // For now, return all symbols - will be validated at order time
  return symbols;
}

/**
 * Rank symbols based on the ranking configuration
 */
export async function rankSymbols(
  symbols: string[],
  rankingConfig: RankingConfig,
  alpacaClient: AlpacaClient
): Promise<RankingResult> {
  const rankedSymbols: RankedSymbol[] = [];

  for (const symbol of symbols) {
    const metrics: Record<string, number> = {};
    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of rankingConfig.factors) {
      const value = await getFactorValue(symbol, factor.factor, alpacaClient);

      if (value !== null) {
        metrics[factor.factor] = value;

        // Normalize and apply weight
        // Higher values are better unless factor is inverse (like volatility)
        const inverseFactor = ["volatility"].includes(factor.factor);
        const normalizedValue = inverseFactor ? -value : value;

        totalScore += normalizedValue * factor.weight;
        totalWeight += factor.weight;
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    rankedSymbols.push({
      symbol,
      score: finalScore,
      metrics,
    });
  }

  // Sort by score descending
  rankedSymbols.sort((a, b) => b.score - a.score);

  return {
    rankedSymbols,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get a factor value for a symbol
 * TODO: Implement getBars method in AlpacaClient
 */
async function getFactorValue(
  symbol: string,
  factor: string,
  alpacaClient: AlpacaClient
): Promise<number | null> {
  // TODO: Implement actual factor calculations once AlpacaClient has getBars
  console.warn(`Factor calculation for ${factor} on ${symbol} not yet implemented`);
  return Math.random(); // Temporary random value for testing
}

/**
 * Calculate momentum (simple return over period)
 */
function calculateMomentum(bars: { c: number }[], period: number): number {
  if (bars.length < period) {
    period = bars.length;
  }

  const startPrice = bars[bars.length - period].c;
  const endPrice = bars[bars.length - 1].c;

  return ((endPrice - startPrice) / startPrice) * 100;
}

/**
 * Calculate volatility (standard deviation of returns)
 */
function calculateVolatility(bars: { c: number }[]): number {
  const returns: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const dailyReturn = (bars[i].c - bars[i - 1].c) / bars[i - 1].c;
    returns.push(dailyReturn);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;

  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
}

/**
 * Calculate average volume
 */
function calculateAverageVolume(bars: { v: number }[]): number {
  const totalVolume = bars.reduce((sum, bar) => sum + bar.v, 0);
  return totalVolume / bars.length;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(bars: { c: number }[], period: number = 14): number {
  if (bars.length < period + 1) {
    return 50; // Default neutral value
  }

  let gains = 0;
  let losses = 0;

  for (let i = bars.length - period; i < bars.length; i++) {
    const change = bars[i].c - bars[i - 1].c;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
