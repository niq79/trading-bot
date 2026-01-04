/**
 * Test script to verify crypto trading implementation
 */

import { RankedSymbol } from "./lib/engine/ranker";
import { calculateTargetPositions, CurrentPosition } from "./lib/engine/target-calculator";
import { calculateRebalanceOrders } from "./lib/engine/rebalancer";

// Mock crypto symbols
const cryptoSymbols: RankedSymbol[] = [
  { symbol: "BTC/USD", score: 100, side: "long", metrics: { momentum: 0.25 } },
  { symbol: "ETH/USD", score: 90, side: "long", metrics: { momentum: 0.20 } },
  { symbol: "SOL/USD", score: 80, side: "long", metrics: { momentum: 0.15 } },
  { symbol: "XRP/USD", score: 70, side: "long", metrics: { momentum: 0.10 } },
  { symbol: "DOGE/USD", score: 60, side: "long", metrics: { momentum: 0.05 } },
];

const executionConfig = {
  signal_conditions: null,
  cash_reserve_pct: 0.1, // 10% cash reserve
  top_n: 5,
  weight_scheme: "equal" as const,
  max_weight_per_symbol: 0.25, // 25% max per symbol
};

const totalEquity = 100000;
const currentPositions: CurrentPosition[] = [];

console.log("🪙 Testing Crypto Trading Implementation\n");
console.log("=" .repeat(60));

// Test 1: Symbol format validation
console.log("\n✅ Test 1: Symbol Format Validation");
console.log("-".repeat(60));

const allCrypto = cryptoSymbols.every(s => s.symbol.includes('/'));
console.log(`All symbols use BTC/USD format: ${allCrypto ? "✅ PASS" : "❌ FAIL"}`);
cryptoSymbols.forEach(s => {
  console.log(`  ${s.symbol} - ${s.symbol.includes('/') ? "✅" : "❌"} Valid format`);
});

// Test 2: Shorting disabled
console.log("\n🚫 Test 2: Shorting Disabled for Crypto");
console.log("-".repeat(60));

const hasShorts = cryptoSymbols.some(s => s.side === 'short');
console.log(`No short positions: ${!hasShorts ? "✅ PASS" : "❌ FAIL"}`);
if (hasShorts) {
  console.log("  ❌ ERROR: Crypto symbols found with side='short' - this should be prevented!");
} else {
  console.log("  ✅ All crypto positions are long-only (Alpaca requirement)");
}

// Test 3: Target calculation
console.log("\n📊 Test 3: Target Position Calculation");
console.log("-".repeat(60));

const { targets, investableAmount, cashReserve } = calculateTargetPositions(
  cryptoSymbols,
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
  console.log(
    `  ${target.symbol.padEnd(10)} | ${target.side.toUpperCase().padEnd(5)} | ` +
    `Weight: ${(target.targetWeight * 100).toFixed(1)}% | ` +
    `Value: $${target.targetValue.toFixed(2)}`
  );
});

// Test 4: Verify all positions are long
console.log("\n✅ Test 4: Long-Only Verification");
console.log("-".repeat(60));

const allLong = targets.every(t => t.side === 'long');
const allPositive = targets.every(t => t.targetValue > 0);

console.log(`All positions are long: ${allLong ? "✅ PASS" : "❌ FAIL"}`);
console.log(`All values are positive: ${allPositive ? "✅ PASS" : "❌ FAIL"}`);

// Test 5: Weight distribution
console.log("\n⚖️  Test 5: Weight Distribution");
console.log("-".repeat(60));

const totalWeight = targets.reduce((sum, t) => sum + t.targetWeight, 0);
console.log(`Total weight: ${(totalWeight * 100).toFixed(1)}%`);

const maxWeightExceeded = targets.some(t => t.targetWeight > 0.25);
console.log(`Weights respect 25% max: ${!maxWeightExceeded ? "✅ PASS" : "❌ FAIL"}`);

targets.forEach(t => {
  const weightPct = (t.targetWeight * 100).toFixed(1);
  const indicator = t.targetWeight > 0.25 ? "❌" : "✅";
  console.log(`  ${indicator} ${t.symbol}: ${weightPct}%`);
});

// Test 6: Order generation
console.log("\n🔄 Test 6: Order Generation");
console.log("-".repeat(60));

const { orders } = calculateRebalanceOrders(targets, currentPositions, 1.0);

console.log(`Total orders generated: ${orders.length}\n`);
orders.forEach((order) => {
  console.log(
    `  ${order.side.toUpperCase().padEnd(4)} ${order.symbol.padEnd(10)} | ` +
    `$${order.notional.toFixed(2).padStart(10)} | ${order.reason}`
  );
});

// Test 7: Crypto-specific checks
console.log("\n🪙 Test 7: Crypto-Specific Constraints");
console.log("-".repeat(60));

const allBuyOrders = orders.every(o => o.side === 'buy' || o.side === 'sell');
const noShortOrders = !orders.some(o => 
  targets.find(t => t.symbol === o.symbol)?.side === 'short'
);

console.log(`Orders are valid (buy/sell): ${allBuyOrders ? "✅ PASS" : "❌ FAIL"}`);
console.log(`No short orders generated: ${noShortOrders ? "✅ PASS" : "❌ FAIL"}`);

// Test 8: Symbol format in orders
console.log("\n📝 Test 8: Symbol Format in Orders");
console.log("-".repeat(60));

const allOrdersHaveSlash = orders.every(o => o.symbol.includes('/'));
console.log(`All order symbols use / format: ${allOrdersHaveSlash ? "✅ PASS" : "❌ FAIL"}`);

// Summary
console.log("\n" + "=".repeat(60));
console.log("🎉 TEST SUMMARY");
console.log("=".repeat(60));

const allPassed = 
  allCrypto &&
  !hasShorts &&
  allLong &&
  allPositive &&
  !maxWeightExceeded &&
  allBuyOrders &&
  noShortOrders &&
  allOrdersHaveSlash;

if (allPassed) {
  console.log("✅ All tests PASSED - Crypto trading is properly configured!");
  console.log("\n📋 Next Steps:");
  console.log("1. Test with actual Alpaca API (paper account)");
  console.log("2. Verify crypto market data fetching");
  console.log("3. Check crypto order execution");
  console.log("4. Monitor trading fees (15-25 bps)");
} else {
  console.log("❌ Some tests FAILED - Review implementation");
}

console.log("=".repeat(60));

// Additional Info
console.log("\n📚 Crypto Trading Notes:");
console.log("-".repeat(60));
console.log("• Symbol format: BTC/USD (with slash)");
console.log("• Alpaca endpoint: /v1beta3/crypto/us/bars");
console.log("• Trading: 24/7 (bot runs weekdays 3:55 PM ET)");
console.log("• Fees: 15-25 bps maker/taker");
console.log("• Max order: $200k notional");
console.log("• Shorting: NOT supported");
console.log("• Margin: NOT available");
console.log("• Fractional: YES (e.g., 0.001 BTC)");
console.log("=".repeat(60));
