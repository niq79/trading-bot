import { AlpacaClient, Bar } from "@/lib/alpaca/client";
import { UniverseConfig, StrategyParams } from "@/types/strategy";

export interface RankingConfig {
  factors: Array<{
    factor: string;
    weight: number;
  }>;
  lookback_days?: number;
  top_n?: number;  // Long positions
  short_n?: number; // Short positions
}

export interface RankedSymbol {
  symbol: string;
  score: number;
  side: 'long' | 'short'; // Position side
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
    // Magnificent 7
    mag7: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"],

    // Dow 30
    dow30: [
      "AAPL", "AMGN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS", "DOW",
      "GS", "HD", "HON", "IBM", "INTC", "JNJ", "JPM", "KO", "MCD", "MMM",
      "MRK", "MSFT", "NKE", "PG", "TRV", "UNH", "V", "VZ", "WBA", "WMT",
    ],

    // S&P 500 Top 10 by market cap
    sp500_top10: [
      "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "UNH", "JNJ",
    ],

    // S&P 500 Top 50 by market cap
    sp500_top50: [
      "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "UNH", "JNJ",
      "V", "XOM", "JPM", "WMT", "PG", "MA", "HD", "CVX", "MRK", "ABBV",
      "LLY", "PEP", "KO", "COST", "AVGO", "TMO", "MCD", "CSCO", "ACN", "ABT",
      "DHR", "CRM", "ADBE", "CMCSA", "NKE", "PFE", "NFLX", "TXN", "AMD", "NEE",
      "INTC", "PM", "RTX", "HON", "AMGN", "QCOM", "T", "UPS", "MS", "ORCL",
    ],

    // NASDAQ 100 Top 10 by market cap
    nasdaq100_top10: [
      "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "COST", "ADBE",
    ],

    // NASDAQ 100 Top 50 by market cap
    nasdaq100_top50: [
      "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "COST", "ADBE",
      "CSCO", "NFLX", "AMD", "INTC", "QCOM", "TXN", "INTU", "CMCSA", "AMGN", "HON",
      "AMAT", "SBUX", "BKNG", "ISRG", "GILD", "MDLZ", "ADI", "VRTX", "LRCX", "REGN",
      "PYPL", "PANW", "SNPS", "KLAC", "CDNS", "ASML", "ADP", "MELI", "MNST", "CSX",
      "MAR", "ORLY", "NXPI", "FTNT", "PCAR", "MRNA", "AEP", "CTAS", "MCHP", "KDP",
    ],

    // Russell 2000 Top 50 (representative small-caps)
    russell2000_top50: [
      "SMCI", "CELH", "COOP", "EXAS", "PCVX", "HALO", "AXON", "LNTH", "PI", "RCM",
      "KTOS", "ENVX", "GSHD", "SFM", "AEHR", "CPRX", "UFPI", "CVLT", "APLS", "SPSC",
      "CRVL", "OLO", "FORM", "TMDX", "KRYS", "PRCT", "AGIO", "BRBR", "VCEL", "SAIA",
      "BCPC", "XPEL", "FROG", "IOVA", "ANF", "BOOT", "VCYT", "RXRX", "ESTE", "RELY",
      "SPWR", "MGY", "MNDY", "WFRD", "PRGS", "NEOG", "ROIC", "VERX", "AUR", "CRGY",
    ],

    // Top 10 Crypto (by market cap and liquidity)
    // Note: Alpaca requires BTC/USD format with slash
    // Crypto trades 24/7 but this bot only runs at 3:55 PM ET on weekdays
    // Crypto cannot be shorted on Alpaca
    crypto_top10: [
      "BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD",
      "ADA/USD", "AVAX/USD", "DOT/USD", "MATIC/USD", "LINK/USD",
    ],
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

  // Use lookback_days from config, default to 60 if not specified
  const lookbackDays = rankingConfig.lookback_days ?? 60;

  // Fetch bars for all symbols at once (more efficient)
  let allBars: Record<string, Bar[]> = {};
  try {
    allBars = await alpacaClient.getMultiBars(symbols, { limit: lookbackDays });
  } catch {
    // Fall back to empty bars - will result in no ranking for these symbols
  }

  for (const symbol of symbols) {
    const bars = allBars[symbol] || [];
    
    // Skip symbols with insufficient data (need at least 5 days for basic metrics)
    if (bars.length < 5) {
      continue;
    }

    const metrics: Record<string, number> = {};
    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of rankingConfig.factors) {
      const value = getFactorValue(bars, factor.factor);

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

  // Select top N for longs and bottom N for shorts
  const result: RankedSymbol[] = [];
  
  const topN = rankingConfig.top_n ?? 0;
  let shortN = rankingConfig.short_n ?? 0;
  const totalSymbols = rankedSymbols.length;

  // CRYPTO CONSTRAINT: Crypto cannot be shorted on Alpaca
  // Check if any symbols are crypto (contain slash)
  const hasCrypto = rankedSymbols.some(s => s.symbol.includes('/'));
  if (hasCrypto && shortN > 0) {
    console.warn('Crypto symbols detected - shorting disabled (Alpaca limitation)');
    shortN = 0; // Force disable shorts for crypto
  }

  // Ensure no overlap: if top_n + short_n > total, adjust
  const actualTopN = Math.min(topN, totalSymbols);
  const actualShortN = Math.min(shortN, Math.max(0, totalSymbols - actualTopN));

  // Add top N as long positions
  if (actualTopN > 0) {
    const longs = rankedSymbols.slice(0, actualTopN).map(s => ({
      ...s,
      side: 'long' as const
    }));
    result.push(...longs);
  }

  // Add bottom N as short positions (no overlap with longs)
  if (actualShortN > 0) {
    const shorts = rankedSymbols.slice(-actualShortN).map(s => ({
      ...s,
      side: 'short' as const
    }));
    result.push(...shorts);
  }

  return {
    rankedSymbols: result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get a factor value for a symbol using its price bars
 */
function getFactorValue(
  bars: Bar[],
  factor: string
): number | null {
  if (bars.length === 0) return null;

  switch (factor) {
    case "momentum_5d":
      return calculateMomentum(bars, 5);
    case "momentum_10d":
      return calculateMomentum(bars, 10);
    case "momentum_20d":
    case "momentum":
    case "return":
      return calculateMomentum(bars, 20);
    case "momentum_60d":
      return calculateMomentum(bars, 60);
    case "volatility":
      return calculateVolatility(bars);
    case "volume":
      return calculateAverageVolume(bars);
    case "rsi":
      return calculateRSI(bars);
    default:
      console.warn(`Unknown factor: ${factor}`);
      return null;
  }
}

/**
 * Calculate momentum (simple return over period)
 */
function calculateMomentum(bars: Bar[], period: number): number {
  if (bars.length < 2) return 0;
  
  const effectivePeriod = Math.min(period, bars.length);
  const startPrice = bars[bars.length - effectivePeriod].c;
  const endPrice = bars[bars.length - 1].c;

  if (startPrice === 0) return 0;
  return ((endPrice - startPrice) / startPrice) * 100;
}

/**
 * Calculate volatility (standard deviation of returns)
 */
function calculateVolatility(bars: Bar[]): number {
  if (bars.length < 2) return 0;
  
  const returns: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].c === 0) continue;
    const dailyReturn = (bars[i].c - bars[i - 1].c) / bars[i - 1].c;
    returns.push(dailyReturn);
  }

  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;

  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility
}

/**
 * Calculate average volume
 */
function calculateAverageVolume(bars: Bar[]): number {
  if (bars.length === 0) return 0;
  const totalVolume = bars.reduce((sum, bar) => sum + bar.v, 0);
  return totalVolume / bars.length;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(bars: Bar[], period: number = 14): number {
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
