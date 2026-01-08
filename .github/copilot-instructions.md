# Trading Bot - AI Coding Agent Instructions

## Architecture Overview

This is a **multi-user SaaS trading bot** built with Next.js 15 App Router, Supabase (PostgreSQL + Auth), and Alpaca API for paper trading. Users create algorithmic trading strategies that execute automatically via GitHub Actions at 3:55 PM ET daily.

**Key Design Philosophy**: Target-based execution with gradual rebalancing (not direct buy/sell rules). Strategies compute target positions, then orders move current positions partially toward targets using a `rebalance_fraction` (default 0.25 = 25% per run).

### Core Components

1. **Frontend**: Next.js 15 with App Router, React Server Components (RSC), Tailwind + shadcn/ui
2. **Backend**: Supabase with Row-Level Security (RLS) enforcing strict user isolation
3. **Trading Engine**: `lib/engine/` contains stateless execution logic (ranking → targets → rebalancing → orders)
4. **Scheduler**: GitHub Actions workflow (`.github/workflows/trading-bot.yml`) calls `/api/cron/run-all-users` daily
5. **Security**: Alpaca API keys encrypted at rest using AES-256-GCM (`lib/utils/crypto.ts`)

### Data Flow

```
User creates strategy → Stored in Supabase (RLS protected)
  ↓
GitHub Actions triggers (daily at 15:55 ET)
  ↓
/api/cron/run-all-users (protected by CRON_SECRET)
  ↓
lib/engine/runner.ts → Fetches all users with enabled strategies
  ↓
For each user: runner → executor → ranker → target-calculator → rebalancer
  ↓
Orders placed via AlpacaClient → Results recorded in strategy_runs
```

## Critical Patterns

### 1. Supabase Client Usage

**Always use the correct client for the context:**

- **Browser components**: `createClient()` from `lib/supabase/client.ts`
- **Server Components/Actions**: `await createClient()` from `lib/supabase/server.ts` (uses cookies for RLS)
- **API routes & cron jobs**: `await createServiceClient()` from `lib/supabase/server.ts` (bypasses RLS with service role key)

**Pattern in Server Components:**
```typescript
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // RLS automatically filters by user.id
}
```

**Pattern in API routes (authenticated):**
```typescript
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Proceed with user context
}
```

**Pattern in cron jobs (service role):**
```typescript
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServiceClient();
  // Can access all users' data - verify CRON_SECRET first!
}
```

### 2. Alpaca Credentials & Encryption

User API keys are **never stored in plaintext**. Always use:
- `encrypt(plaintext)` before storing in `alpaca_credentials` table
- `decrypt(ciphertext)` when retrieving for API calls

**Example (from `lib/engine/runner.ts`):**
```typescript
const { data: credentials } = await supabase
  .from("alpaca_credentials")
  .select("*")
  .eq("user_id", userId)
  .single();

const apiKey = await decrypt(credentials.api_key_encrypted);
const apiSecret = await decrypt(credentials.api_secret_encrypted);
const alpacaClient = new AlpacaClient({ apiKey, apiSecret, paper: true });
```

### 3. Strategy Execution Pipeline

The engine is **stateless and testable** - no side effects in pure functions:

1. **Ranker** (`lib/engine/ranker.ts`): Fetches bars, calculates metrics, ranks symbols
2. **Target Calculator** (`lib/engine/target-calculator.ts`): Computes target positions with weight schemes (equal, score-weighted, inverse-volatility)
3. **Rebalancer** (`lib/engine/rebalancer.ts`): Calculates orders to move `rebalance_fraction` toward targets
4. **Executor** (`lib/engine/executor.ts`): Orchestrates the above + places orders via Alpaca

**Example from `executor.ts`:**
```typescript
const rankedSymbols = await rankSymbols(universeSymbols, rankingConfig, alpacaClient);
const { targets } = calculateTargetPositions(rankedSymbols, executionConfig, equity, positions, signals);
const orders = calculateRebalanceOrders(currentPositions, targets, equity, rebalanceFraction);
```

### 4. App Router & Route Groups

Uses Next.js 15 App Router with route groups for layout isolation:

- `app/(app)/` - Authenticated app pages (strategies, positions, orders, etc.) - wrapped by `app-shell.tsx`
- `app/(auth)/` - Auth pages (login, signup) - minimal layout
- `app/(public)/` - Public pages (shared portfolios) - no auth required
- `app/api/` - API routes

**All (app) routes require authentication** via middleware (`middleware.ts`).

### 5. Row-Level Security (RLS)

**Every user-owned table has RLS policies** (`supabase/migrations/002_rls_policies.sql`):

```sql
CREATE POLICY "Users can view own strategies"
  ON strategies FOR SELECT
  USING (auth.uid() = user_id);
```

**When querying in Server Components with `createClient()`, RLS automatically filters by `auth.uid()`.** No need to add `.eq('user_id', user.id)` manually (but doing so is harmless).

**Service role bypasses RLS** - use `createServiceClient()` only in cron jobs and admin operations.

### 6. Environment Variables

Required in `.env.local` (see [.env.local](/.env.local)):

- `ENCRYPTION_KEY` - Generate with `openssl rand -base64 32`
- `CRON_SECRET` - Generate with `openssl rand -hex 32`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase (keep secret!)

**Never commit `.env.local` to git** - it's in `.gitignore`.

### 7. Ranking Metrics (Generic Design)

**All metrics use the lookback period to control the measurement window** - no hardcoded day counts in metric names.

**Available Metrics**:
- `momentum` - Price return over lookback period (higher = better)
- `volatility_low` - Picks least volatile stocks (lower volatility ranks better)
- `volatility_high` - Picks most volatile stocks (higher volatility ranks better)
- `rsi` - RSI(14) oscillator (internally uses 14-period, needs ≥20 days lookback)
- `relative_volume` - Volume vs average (values >1 = above-average activity)
- `sharpe` - Risk-adjusted returns (Sharpe ratio)

**Legacy metrics** (deprecated but still supported):
- `momentum_20d`, `momentum_60d` - Use `momentum` with lookback_period instead
- `volatility`, `volume` - Use `volatility_low` or `relative_volume` instead

**Minimum Lookback Requirements**:
```typescript
const minimums = {
  momentum: 5,
  volatility_low: 20,
  volatility_high: 20,
  rsi: 20,
  relative_volume: 10,
  sharpe: 30,
};
```

### 8. Short Selling & Crypto Constraints

- **Stocks/ETFs**: Support both long and short positions (`side: 'long' | 'short'`)
- **Crypto**: **Long-only** (Alpaca limitation) - ranker automatically filters out shorts for crypto symbols
- Crypto symbols use slash format: `BTC/USD`, `ETH/USD`

**Example from `ranker.ts`:**
```typescript
if (symbol.includes('/') && shortN > 0) {
  console.warn(`Crypto symbol ${symbol} cannot be shorted - skipping shorts`);
}
```

### 9. Testing Patterns

All tests use **mock Alpaca clients** (`MockAlpacaClient` in `test-*.ts` files):

```bash
npm test                    # All tests
npm run test:short-selling  # Short position logic
npm run test:crypto         # Crypto constraints
npm run test:suite          # Full strategy combinations
```

Tests validate:
- Weight calculations (equal, score-weighted, inverse-volatility)
- Position limits (max_weight_per_symbol)
- Short selling logic
- Crypto long-only enforcement
- Order generation correctness

**Tests run in CI** - add new tests when changing execution logic.

## Development Workflows

### Local Development
```bash
npm run dev                 # Start dev server at localhost:3000
```

### Database Changes
1. Create new migration in `supabase/migrations/`
2. Apply via Supabase Dashboard SQL Editor (local dev)
3. For production, migrations run automatically on deployment

### Debugging Strategy Execution
Use diagnostic scripts (see [TESTING.md](TESTING.md)):
```bash
npx tsx check-crypto-data.ts          # Check if crypto bars are available
npx tsx check-crypto-strategy-orders.ts  # Test crypto strategy dry-run
npx tsx debug-crypto-symbols.ts       # Validate symbol format
```

### Manual Strategy Execution
Trigger via cron endpoint (requires `CRON_SECRET`):
```bash
curl -X POST http://localhost:3000/api/cron/run-all-users \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Add `?dry_run=true` to simulate without placing orders.

## Common Tasks

### Adding a New Strategy Parameter
1. Update `StrategyConfig` type in `lib/engine/executor.ts`
2. Add field to `strategy-form.tsx` with validation
3. Use parameter in `executor.ts` or relevant engine file
4. Update tests in `test-strategy-suite.ts`
5. Add migration if storing in database schema

### Adding a New Ranking Metric
1. Implement calculation in `calculateMetric()` in `lib/engine/ranker.ts`
2. Add to `RankingMetric` type
3. Update `strategy-form.tsx` select options
4. Add test case in `test-strategy-suite.ts`

### Changing Rebalancing Logic
Edit `calculateRebalanceOrders()` in `lib/engine/rebalancer.ts`. **This is critical code** - always add test cases.

### Adding a New Signal Source
1. Create signal source record in `signal_sources` table
2. Implement fetcher in `lib/signals/fetcher.ts`
3. Add signal condition UI in `strategy-form.tsx`
4. Signal modifiers are applied in `target-calculator.ts`

## Key Files Reference

- `lib/engine/executor.ts` - Main strategy execution orchestrator
- `lib/engine/runner.ts` - User-level runner for cron jobs
- `lib/engine/ranker.ts` - Symbol ranking with metrics (momentum, volatility, RSI, etc.)
- `lib/engine/target-calculator.ts` - Weight schemes and target position calculation
- `lib/engine/rebalancer.ts` - Order generation from current → target positions
- `lib/alpaca/client.ts` - Alpaca API wrapper (market data + order placement)
- `lib/utils/crypto.ts` - AES-256-GCM encryption for API keys
- `app/api/cron/run-all-users/route.ts` - Entry point for automated execution
- `supabase/migrations/002_rls_policies.sql` - All RLS policies

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions:

1. Push to GitHub
2. Deploy to Vercel with environment variables
3. Configure GitHub Actions secrets (`VERCEL_DEPLOYMENT_URL`, `CRON_SECRET`)
4. Workflow runs daily at 15:55 ET (skips market holidays)

## Anti-Patterns to Avoid

- ❌ Don't use `createServiceClient()` in user-facing routes (bypasses RLS)
- ❌ Don't store Alpaca keys in plaintext
- ❌ Don't add `.eq('user_id', user.id)` when using `createClient()` in Server Components (RLS handles it)
- ❌ Don't modify strategy state during ranking/target calculation (keep pure)
- ❌ Don't assume crypto supports shorting
- ❌ Don't forget to update tests when changing execution logic
- ❌ Don't expose `CRON_SECRET` or `ENCRYPTION_KEY` in client code

## Questions to Ask

When uncertain about a change:

1. **Does this affect multi-user isolation?** → Verify RLS policies
2. **Does this involve sensitive data?** → Check encryption usage
3. **Does this change execution logic?** → Add test coverage
4. **Is this a new API route?** → Ensure proper authentication
5. **Does this work for both stocks and crypto?** → Test symbol format and constraints
