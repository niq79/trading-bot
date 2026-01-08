# Trading Bot Test Suite

Comprehensive automated testing for the trading bot strategy engine.

## Test Coverage

### 1. Short Selling Tests (`scripts/test-short-selling.ts`)
- **7 tests** covering long/short position handling
- Validates negative values for short positions
- Tests weight distribution and capping for both sides
- Verifies rebalancer generates correct order types
- Checks order reasons mention "short" for short positions

**Run:** `npm run test:short-selling`

### 2. Crypto Trading Tests (`scripts/test-crypto.ts`)
- **8 tests** for cryptocurrency trading
- Validates BTC/USD symbol format (with slash)
- Tests shorting prevention for crypto (Alpaca limitation)
- Verifies long-only position enforcement
- Validates weight distribution and order generation
- Tests crypto-specific constraints

**Run:** `npm run test:crypto`

### 3. Strategy Suite Tests (`scripts/test-strategy-suite.ts`)
- **10 comprehensive tests** covering all strategy combinations
- Tests universes: Mag7, Dow30, S&P 500, NASDAQ, Crypto
- Tests strategies: Long-only, Long/Short
- Tests weight schemes: Equal, Score Weighted, Inverse Volatility
- Tests position limits: 10%, 20%, 30%
- Tests ranking metrics: Momentum, Volatility, Volume, RSI

**Run:** `npm run test:suite`

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Individual Test Suites
```bash
npm run test:short-selling  # Short selling tests only
npm run test:crypto         # Crypto trading tests only
npm run test:suite          # Comprehensive strategy tests
```

### Test on Every Build
Tests run automatically before deployment via GitHub Actions (`.github/workflows/test.yml`)

## Test Results

All tests must pass with **100% success rate**:
- ✅ **25 total tests**
- ✅ 7 short selling tests
- ✅ 8 crypto tests
- ✅ 10 strategy suite tests

## What's Tested

### Universe Coverage
- ✅ Magnificent 7 (AAPL, MSFT, GOOGL, AMZN, META, TSLA, NVDA)
- ✅ Dow 30 components
- ✅ S&P 500 Top 10
- ✅ NASDAQ 100 Top 10
- ✅ Top 10 Crypto (BTC/USD, ETH/USD, SOL/USD, DOGE/USD, XRP/USD, AVAX/USD, DOT/USD, LINK/USD, UNI/USD, LTC/USD)
- ✅ Top 25 Crypto (includes all Alpaca-supported USD pairs: BTC, ETH, SOL, DOGE, XRP, AVAX, DOT, LINK, UNI, LTC, BCH, AAVE, CRV, GRT, SUSHI, BAT, YFI, XTZ, SHIB, PEPE, SKY, TRUMP, stablecoins)

### Strategy Types
- ✅ Long-only (long_n > 0, short_n = 0)
- ✅ Long/short (long_n > 0, short_n > 0)
- ✅ Crypto long-only (shorts automatically prevented)

### Weight Schemes
- ✅ Equal weight
- ✅ Score weighted (normalized by ranking scores)
- ✅ Inverse volatility (lower volatility = higher weight)

### Position Limits
- ✅ 10% max per position (tight risk control)
- ✅ 20% max per position (balanced)
- ✅ 25-30% max per position (concentrated)

### Ranking Metrics
- ✅ Momentum (5d, 10d, 20d, 60d)
- ✅ Volatility (inverse - lower is better)
- ✅ Volume (higher is better)
- ✅ RSI (Relative Strength Index)

### Edge Cases
- ✅ Crypto shorting prevention (Alpaca limitation)
- ✅ Weight redistribution when positions hit max cap
- ✅ Empty portfolios (all new positions)
- ✅ Small universes (3 symbols)
- ✅ Long/short overlap prevention

## Test Implementation

Tests use **mock Alpaca client** to avoid API calls:
- Generates synthetic price data
- Simulates realistic market movements
- Ensures deterministic test results
- Fast execution (no network latency)

### Mock Data Generation
```typescript
// Generates oscillating price trends with noise
const basePrice = 100;
const trend = Math.sin(i / 10) * 10;
const noise = (Math.random() - 0.5) * 5;
const price = basePrice + trend + noise;
```

## Validation Checks

Each test validates:
1. **Ranking**: Correct number of symbols ranked
2. **Position Count**: Matches long_n + short_n
3. **Weight Limits**: No position exceeds max_weight_per_symbol
4. **Weight Scheme**: Proper distribution (equal/weighted/inverse vol)
5. **Long/Short Separation**: Correct side assignment
6. **Order Generation**: One order per target position
7. **Order Values**: Total value respects cash reserve

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/test.yml`):
- Runs on every push to `main`
- Runs on all pull requests
- Executes full test suite before build
- Fails deployment if any test fails

## Adding New Tests

To add a new test case to the suite:

```typescript
{
  name: "Your Test Name",
  universe: ["SYMBOL1", "SYMBOL2"],
  rankingMetric: "momentum_20d",
  longN: 5,
  shortN: 0,
  weightScheme: "equal",
  maxWeight: 0.20,
  expectedValidations: {
    minRankedSymbols: 5,
    maxPositions: 5,
    maxWeightPerPosition: 0.20,
  },
}
```

## Troubleshooting

### Test Failures

If tests fail, check:
1. **Ranking errors**: Ensure mock client returns enough bar data
2. **Weight limit violations**: Check max_weight_per_symbol logic
3. **Order count mismatch**: Verify rebalance_fraction = 1.0 in tests
4. **Crypto shorting**: Confirm short_n forced to 0 for crypto

### Mock Client Issues

If mock data isn't being returned:
```typescript
// Ensure getMultiBars returns data for all symbols
async getMultiBars(symbols: string[], params: any) {
  const result: Record<string, any[]> = {};
  for (const symbol of symbols) {
    result[symbol] = await this.getBars(symbol, params);
  }
  return result;
}
```

## Performance

Test suite execution time:
- Short selling: ~1 second
- Crypto: ~1 second
- Strategy suite: ~2 seconds
- **Total: ~4 seconds**

Fast enough to run on every commit without slowing development.

## Next Steps

Future test additions:
- [ ] Signal conditions integration tests
- [ ] Portfolio attribution tests
- [ ] Multi-strategy portfolio tests
- [ ] Rebalance fraction convergence tests
- [ ] Real Alpaca API integration tests (optional)
