# Scripts Directory

This directory contains diagnostic and testing scripts for the trading bot.

## Test Scripts

Run these to validate trading engine logic:

- **`test-short-selling.ts`** - Tests long/short position handling (7 tests)
  ```bash
  npm run test:short-selling
  ```

- **`test-crypto.ts`** - Tests cryptocurrency trading constraints (8 tests)
  ```bash
  npm run test:crypto
  ```

- **`test-strategy-suite.ts`** - Comprehensive strategy validation (10 tests)
  ```bash
  npm run test:suite
  ```

## Diagnostic Scripts

Use these to debug strategy execution issues:

- **`check-crypto-data.ts`** - Verify crypto market data availability from Alpaca
  ```bash
  npx tsx scripts/check-crypto-data.ts
  ```

- **`check-crypto-strategy-orders.ts`** - Dry-run test of crypto strategy execution
  ```bash
  npx tsx scripts/check-crypto-strategy-orders.ts
  ```

- **`debug-crypto-symbols.ts`** - Validate crypto symbol format (BTC/USD vs BTCUSD)
  ```bash
  npx tsx scripts/debug-crypto-symbols.ts
  ```

## Running All Tests

```bash
npm test
```

This runs all three test suites sequentially (25 total tests).
