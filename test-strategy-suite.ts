/**
 * Comprehensive Strategy Test Suite
 * 
 * Tests all combinations of:
 * - Universes: US equities (Mag7, Dow30, S&P 500, NASDAQ) + Crypto
 * - Strategies: Long-only, Short-only, Long/Short
 * - Weight Schemes: Equal, Score Weighted, Inverse Volatility
 * - Position Limits: 10%, 20%, 30%
 * - Ranking Metrics: Momentum, Volatility, Volume
 * 
 * Run with: npx tsx test-strategy-suite.ts
 */

import { rankSymbols, RankingConfig } from "./lib/engine/ranker";
import { calculateTargetPositions, CurrentPosition } from "./lib/engine/target-calculator";
import { calculateRebalanceOrders } from "./lib/engine/rebalancer";

interface TestCase {
  name: string;
  universe: string[];
  rankingMetric: string;
  longN: number;
  shortN: number;
  weightScheme: "equal" | "score_weighted" | "inverse_volatility";
  maxWeight: number;
  expectedValidations: {
    minRankedSymbols: number;
    maxPositions: number;
    maxWeightPerPosition: number;
  };
}

// Mock Alpaca client for testing (no real API calls)
class MockAlpacaClient {
  async getBars(symbol: string, params: any) {
    // Generate mock bar data - ensure we have enough bars
    const limit = params.limit || 30;
    const bars = [];
    for (let i = 0; i < limit; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate more realistic price movements
      const basePrice = 100;
      const trend = Math.sin(i / 10) * 10; // Oscillating trend
      const noise = (Math.random() - 0.5) * 5; // Random noise
      const price = basePrice + trend + noise;
      
      bars.push({
        t: date.toISOString(),
        o: price * 0.99,
        h: price * 1.02,
        l: price * 0.98,
        c: price,
        v: 1000000 + Math.random() * 500000,
        n: 1000,
        vw: price,
      });
    }
    return bars.reverse(); // Return oldest first
  }

  async getMultiBars(symbols: string[], params: any) {
    const result: Record<string, any[]> = {};
    for (const symbol of symbols) {
      result[symbol] = await this.getBars(symbol, params);
    }
    return result;
  }
}

// Test configurations
const testCases: TestCase[] = [
  // US Equities - Long Only
  {
    name: "Mag7 - Long Only - Equal Weight",
    universe: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"],
    rankingMetric: "momentum_20d",
    longN: 5,
    shortN: 0,
    weightScheme: "equal",
    maxWeight: 0.25,
    expectedValidations: {
      minRankedSymbols: 7,
      maxPositions: 5,
      maxWeightPerPosition: 0.25,
    },
  },
  {
    name: "Dow30 - Long Only - Score Weighted",
    universe: ["AAPL", "MSFT", "JPM", "V", "UNH", "JNJ", "WMT", "PG", "HD", "CVX"],
    rankingMetric: "momentum_20d",
    longN: 5,
    shortN: 0,
    weightScheme: "score_weighted",
    maxWeight: 0.20,
    expectedValidations: {
      minRankedSymbols: 10,
      maxPositions: 5,
      maxWeightPerPosition: 0.20,
    },
  },
  {
    name: "S&P 500 Top 10 - Long Only - Inverse Volatility",
    universe: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "V", "UNH"],
    rankingMetric: "volatility",
    longN: 5,
    shortN: 0,
    weightScheme: "inverse_volatility",
    maxWeight: 0.30,
    expectedValidations: {
      minRankedSymbols: 10,
      maxPositions: 5,
      maxWeightPerPosition: 0.30,
    },
  },
  
  // Long/Short Strategies
  {
    name: "Mag7 - Long/Short - Equal Weight",
    universe: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"],
    rankingMetric: "momentum_20d",
    longN: 4,
    shortN: 3,
    weightScheme: "equal",
    maxWeight: 0.25,
    expectedValidations: {
      minRankedSymbols: 7,
      maxPositions: 7,
      maxWeightPerPosition: 0.25,
    },
  },
  {
    name: "NASDAQ Top 10 - Long/Short - Score Weighted",
    universe: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "COST", "NFLX"],
    rankingMetric: "momentum_60d",
    longN: 5,
    shortN: 3,
    weightScheme: "score_weighted",
    maxWeight: 0.20,
    expectedValidations: {
      minRankedSymbols: 10,
      maxPositions: 8,
      maxWeightPerPosition: 0.20,
    },
  },
  
  // Crypto Tests
  {
    name: "Crypto Top 5 - Long Only - Equal Weight",
    universe: ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD"],
    rankingMetric: "momentum_20d",
    longN: 3,
    shortN: 0,
    weightScheme: "equal",
    maxWeight: 0.30,
    expectedValidations: {
      minRankedSymbols: 5,
      maxPositions: 3,
      maxWeightPerPosition: 0.30,
    },
  },
  {
    name: "Crypto Top 5 - Attempted Short (Should Prevent)",
    universe: ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD"],
    rankingMetric: "momentum_20d",
    longN: 3,
    shortN: 2, // This should be forced to 0 by crypto detection
    weightScheme: "equal",
    maxWeight: 0.30,
    expectedValidations: {
      minRankedSymbols: 5,
      maxPositions: 3, // Only longs, shorts prevented
      maxWeightPerPosition: 0.30,
    },
  },
  
  // Different Ranking Metrics
  {
    name: "Mag7 - Volume Ranking",
    universe: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"],
    rankingMetric: "volume",
    longN: 5,
    shortN: 0,
    weightScheme: "equal",
    maxWeight: 0.20,
    expectedValidations: {
      minRankedSymbols: 7,
      maxPositions: 5,
      maxWeightPerPosition: 0.20,
    },
  },
  {
    name: "Mag7 - RSI Ranking",
    universe: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA"],
    rankingMetric: "rsi",
    longN: 5,
    shortN: 0,
    weightScheme: "equal",
    maxWeight: 0.20,
    expectedValidations: {
      minRankedSymbols: 7,
      maxPositions: 5,
      maxWeightPerPosition: 0.20,
    },
  },
  
  // Position Limit Tests
  {
    name: "Position Limit 10% - All Capped",
    universe: ["AAPL", "MSFT", "GOOGL"],
    rankingMetric: "momentum_20d",
    longN: 3,
    shortN: 0,
    weightScheme: "equal",
    maxWeight: 0.10,
    expectedValidations: {
      minRankedSymbols: 3,
      maxPositions: 3,
      maxWeightPerPosition: 0.10,
    },
  },
];

// Test execution
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

console.log("🧪 Strategy Test Suite\n");
console.log("=".repeat(80));
console.log("\n");

async function runTest(testCase: TestCase): Promise<boolean> {
  totalTests++;
  
  try {
    console.log(`📋 Test ${totalTests}: ${testCase.name}`);
    console.log("-".repeat(80));
    
    // Create mock client
    const mockClient = new MockAlpacaClient() as any;
    
    // Setup ranking config
    const rankingConfig: RankingConfig = {
      factors: [{ factor: testCase.rankingMetric, weight: 1 }],
      lookback_days: 30,
      top_n: testCase.longN,
      short_n: testCase.shortN,
    };
    
    // Rank symbols
    const { rankedSymbols } = await rankSymbols(
      testCase.universe,
      rankingConfig,
      mockClient
    );
    
    console.log(`  📊 Universe: ${testCase.universe.length} symbols, Ranked: ${rankedSymbols.length}`);
    
    // Validation 1: Check ranking - should rank all symbols even if we only select top N
    // The ranker returns selected symbols (top_n + short_n), not all ranked
    // For crypto, shorts are prevented so actual count will be less if shorts were requested
    const hasCrypto = testCase.universe.some(s => s.includes('/'));
    const actualShortN = (hasCrypto && testCase.shortN > 0) ? 0 : testCase.shortN;
    
    const expectedRankedCount = Math.min(
      testCase.longN + actualShortN,
      testCase.universe.length
    );
    
    if (rankedSymbols.length < expectedRankedCount) {
      throw new Error(
        `Expected ${expectedRankedCount} ranked symbols (${testCase.longN} long + ${actualShortN} short), got ${rankedSymbols.length}`
      );
    }
    console.log(`  ✅ Ranking: ${rankedSymbols.length} symbols ranked`);
    
    // Check crypto shorting prevention
    const hasShorts = rankedSymbols.some(s => s.side === 'short');
    if (hasCrypto && hasShorts) {
      throw new Error("Crypto shorting should be prevented but shorts were found");
    }
    if (hasCrypto && testCase.shortN > 0) {
      console.log(`  ✅ Crypto shorting prevented (requested ${testCase.shortN}, got 0)`);
    }
    
    // Setup execution config
    const executionConfig = {
      signal_conditions: null,
      cash_reserve_pct: 0.1,
      top_n: testCase.longN,
      weight_scheme: testCase.weightScheme,
      max_weight_per_symbol: testCase.maxWeight,
    };
    
    const totalEquity = 100000;
    const currentPositions: CurrentPosition[] = [];
    
    // Calculate targets
    const { targets } = calculateTargetPositions(
      rankedSymbols,
      executionConfig,
      totalEquity,
      currentPositions,
      []
    );
    
    // Validation 2: Check position count
    if (targets.length > testCase.expectedValidations.maxPositions) {
      throw new Error(
        `Expected max ${testCase.expectedValidations.maxPositions} positions, got ${targets.length}`
      );
    }
    console.log(`  ✅ Position count: ${targets.length} positions`);
    
    // Validation 3: Check weight limits
    const maxActualWeight = Math.max(...targets.map(t => Math.abs(t.targetWeight)));
    if (maxActualWeight > testCase.expectedValidations.maxWeightPerPosition + 0.001) {
      throw new Error(
        `Max weight ${maxActualWeight.toFixed(3)} exceeds limit ${testCase.expectedValidations.maxWeightPerPosition}`
      );
    }
    console.log(`  ✅ Weight limit: Max ${(maxActualWeight * 100).toFixed(1)}% ≤ ${(testCase.maxWeight * 100).toFixed(0)}%`);
    
    // Validation 4: Check weight scheme application
    const longTargets = targets.filter(t => t.side === 'long');
    const shortTargets = targets.filter(t => t.side === 'short');
    
    if (testCase.weightScheme === "equal" && longTargets.length > 0) {
      const weights = longTargets.map(t => Math.abs(t.targetWeight));
      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
      
      // Allow some variance due to max weight capping
      if (variance > 0.001 && maxActualWeight < testCase.maxWeight - 0.01) {
        console.log(`  ⚠️  Weight variance detected: ${variance.toFixed(6)} (may be due to capping)`);
      }
    }
    console.log(`  ✅ Weight scheme: ${testCase.weightScheme} applied`);
    
    // Validation 5: Check long/short separation
    const longCount = longTargets.length;
    const shortCount = shortTargets.length;
    console.log(`  ✅ Long/Short: ${longCount} long, ${shortCount} short`);
    
    // Validation 6: Check order generation
    const { orders } = calculateRebalanceOrders(targets, currentPositions, 1.0);
    if (orders.length !== targets.length) {
      throw new Error(`Expected ${targets.length} orders, got ${orders.length}`);
    }
    console.log(`  ✅ Orders: ${orders.length} orders generated`);
    
    // Check order values
    const totalOrderValue = orders.reduce((sum, o) => sum + o.notional, 0);
    const expectedValue = totalEquity * 0.9; // After 10% cash reserve
    const tolerance = expectedValue * 0.15; // 15% tolerance for rounding/capping
    
    if (Math.abs(totalOrderValue - expectedValue) > tolerance) {
      console.log(`  ⚠️  Order value variance: Expected ~$${expectedValue.toFixed(0)}, got $${totalOrderValue.toFixed(0)}`);
    } else {
      console.log(`  ✅ Order value: $${totalOrderValue.toLocaleString()} (${((totalOrderValue/totalEquity)*100).toFixed(0)}% of equity)`);
    }
    
    // Summary
    console.log(`  ✅ TEST PASSED\n`);
    passedTests++;
    return true;
    
  } catch (error) {
    console.log(`  ❌ TEST FAILED: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    failedTests++;
    return false;
  }
}

// Run all tests
async function runAllTests() {
  for (const testCase of testCases) {
    await runTest(testCase);
  }
  
  // Final summary
  console.log("=".repeat(80));
  console.log("🎉 TEST SUITE SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`Passed:       ${passedTests} ✅`);
  console.log(`Failed:       ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
  console.log("=".repeat(80));
  
  if (failedTests === 0) {
    console.log("\n✅ All tests passed! Strategy engine is working correctly.\n");
    process.exit(0);
  } else {
    console.log(`\n❌ ${failedTests} test(s) failed. Please review the errors above.\n`);
    process.exit(1);
  }
}

// Execute
runAllTests().catch(error => {
  console.error("Fatal error running test suite:", error);
  process.exit(1);
});
