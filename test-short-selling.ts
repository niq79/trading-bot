/**
 * Test script to verify short selling implementation
 */

import { RankedSymbol } from "./lib/engine/ranker";
import { calculateTargetPositions, CurrentPosition } from "./lib/engine/target-calculator";
import { calculateRebalanceOrders } from "./lib/engine/rebalancer";

// Mock ranked symbols with long and short sides
const rankedSymbols: RankedSymbol[] = [
  { symbol: "AAPL", score: 100, side: "long", metrics: { momentum: 0.15 } },
  { symbol: "MSFT", score: 90, side: "long", metrics: { momentum: 0.12 } },
  { symbol: "GOOGL", score: 80, side: "long", metrics: { momentum: 0.10 } },
  { symbol: "TSLA", score: -80, side: "short", metrics: { momentum: -0.10 } },
  { symbol: "GME", score: -90, side: "short", metrics: { momentum: -0.12 } },
];

const executionConfig = {
  signal_conditions: null,
  cash_reserve_pct: 0.1, // 10% cash reserve
  top_n: 3, // Not used when symbols already have side
  weight_scheme: "equal" as const,
  max_weight_per_symbol: 0.3, // 30% max per symbol
};

const totalEquity = 100000;
const currentPositions: CurrentPosition[] = [];

console.log("🧪 Testing Short Selling Implementation\n");
console.log("=" .repeat(60));

// Test 1: Target calculation
console.log("\n📊 Test 1: Target Position Calculation");
console.log("-".repeat(60));

const { targets, investableAmount, cashReserve } = calculateTargetPositions(
  rankedSymbols,
  executionConfig,
  totalEquity,
  currentPositions,
  []
);

console.log(`Total Equity: $${totalEquity.toLocaleString()}`);
console.log(`Cash Reserve (10%): $${cashReserve.toLocaleString()}`);
console.log(`Investable Amount: $${investableAmount.toLocaleString()}\n`);

console.log("Target Positions:");
targets.forEach((target) => {
  const sign = target.targetValue >= 0 ? "+" : "";
  console.log(
    `  ${target.symbol.padEnd(6)} | ${target.side.toUpperCase().padEnd(5)} | ` +
    `Weight: ${(target.targetWeight * 100).toFixed(1)}% | ` +
    `Value: ${sign}$${target.targetValue.toFixed(2)}`
  );
});

// Test 2: Verify long/short separation
console.log("\n📈 Test 2: Long/Short Separation");
console.log("-".repeat(60));

const longTargets = targets.filter((t) => t.side === "long");
const shortTargets = targets.filter((t) => t.side === "short");

console.log(`Long positions: ${longTargets.length}`);
longTargets.forEach((t) => {
  console.log(`  ${t.symbol}: $${t.targetValue.toFixed(2)}`);
});

console.log(`\nShort positions: ${shortTargets.length}`);
shortTargets.forEach((t) => {
  console.log(`  ${t.symbol}: $${t.targetValue.toFixed(2)} (negative)`);
});

// Test 3: Verify negative values for shorts
console.log("\n✅ Test 3: Negative Value Verification");
console.log("-".repeat(60));

const allShortsNegative = shortTargets.every((t) => t.targetValue < 0);
const allLongsPositive = longTargets.every((t) => t.targetValue > 0);

console.log(`All shorts have negative values: ${allShortsNegative ? "✅ PASS" : "❌ FAIL"}`);
console.log(`All longs have positive values: ${allLongsPositive ? "✅ PASS" : "❌ FAIL"}`);

// Test 4: Verify weight distribution
console.log("\n⚖️  Test 4: Weight Distribution");
console.log("-".repeat(60));

const totalLongWeight = longTargets.reduce((sum, t) => sum + t.targetWeight, 0);
const totalShortWeight = shortTargets.reduce((sum, t) => sum + t.targetWeight, 0);

console.log(`Total long weight: ${(totalLongWeight * 100).toFixed(1)}%`);
console.log(`Total short weight: ${(totalShortWeight * 100).toFixed(1)}%`);

// When max_weight caps positions, weights may not sum to 100% (this is correct)
// With 3 longs at 30% each = 90% total (10% cash from capping)
// With 2 shorts at 30% each = 60% total (40% unutilized from capping)
const longWeightTest = Math.abs(totalLongWeight - 0.9) < 0.01; // 3 × 30% = 90%
const shortWeightTest = Math.abs(totalShortWeight - 0.6) < 0.01; // 2 × 30% = 60%

console.log(`Long weights correctly capped: ${longWeightTest ? "✅ PASS" : "❌ FAIL"}`);
console.log(`Short weights correctly capped: ${shortWeightTest ? "✅ PASS" : "❌ FAIL"}`);

const weightsCorrect = longWeightTest && shortWeightTest;

// Test 5: Max weight cap
console.log("\n🎯 Test 5: Max Weight Cap (30%)");
console.log("-".repeat(60));

const maxWeightExceeded = targets.some((t) => Math.abs(t.targetWeight) > 0.3);
console.log(`No position exceeds 30%: ${!maxWeightExceeded ? "✅ PASS" : "❌ FAIL"}`);
targets.forEach((t) => {
  const weightPct = (Math.abs(t.targetWeight) * 100).toFixed(1);
  console.log(`  ${t.symbol}: ${weightPct}%`);
});

// Test 6: Rebalancer handles shorts
console.log("\n🔄 Test 6: Rebalancer Order Generation");
console.log("-".repeat(60));

const { orders } = calculateRebalanceOrders(targets, currentPositions, 1.0);

console.log(`Total orders generated: ${orders.length}\n`);
orders.forEach((order) => {
  console.log(
    `  ${order.side.toUpperCase().padEnd(4)} ${order.symbol.padEnd(6)} | ` +
    `$${order.notional.toFixed(2).padStart(10)} | ${order.reason}`
  );
});

// Test 7: Verify order reasons mention "short"
console.log("\n📝 Test 7: Order Reason Verification");
console.log("-".repeat(60));

const shortOrders = orders.filter((o) =>
  targets.find((t) => t.symbol === o.symbol && t.side === "short")
);
const shortOrdersHaveLabel = shortOrders.every((o) =>
  o.reason.toLowerCase().includes("short")
);

console.log(`Short orders mention "short": ${shortOrdersHaveLabel ? "✅ PASS" : "❌ FAIL"}`);

// Summary
console.log("\n" + "=".repeat(60));
console.log("🎉 TEST SUMMARY");
console.log("=".repeat(60));

const allPassed = 
  allShortsNegative &&
  allLongsPositive &&
  weightsCorrect &&
  !maxWeightExceeded &&
  shortOrdersHaveLabel;

if (allPassed) {
  console.log("✅ All tests PASSED - Short selling works correctly!");
} else {
  console.log("❌ Some tests FAILED - Review implementation");
}

console.log("=".repeat(60));
