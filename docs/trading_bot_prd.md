
# Product Requirements Document (PRD)
## Project: Multi-User Rule-Based Trading Bot (Paper Trading MVP)

---

## 1. Overview

### 1.1 Purpose
Build a production-quality MVP for a **multi-user, rule-based trading bot SaaS** that:
- Supports **user registration** with email/password and Google OAuth
- Allows each user to **link their own Alpaca paper trading account**
- Trades **US equities, ETFs, and crypto**
- Executes **end-of-day** (once daily before market close)
- Integrates **external signal sources** (e.g., Fear & Greed Index) as strategy inputs
- Uses **deterministic, debuggable logic** suitable for extension later

This PRD is intended to be directly usable for implementation with:
- **Next.js 15 (App Router, RSC)**
- **Supabase (Postgres + Auth + RLS)**
- **Vercel (hosting)**
- **GitHub Actions (scheduled cron)**
- **Alpaca API (paper trading + market data)**

---

## 2. Goals & Non-Goals

### 2.1 Goals (MVP)
- Multi-user authentication (email/password + Google OAuth)
- User-linked Alpaca paper trading accounts with encrypted credentials
- Define trading rules via a structured configuration (JSON-based)
- Allocate capital per rule as % of total account equity
- External signal sources (e.g., Fear & Greed Index) as strategy inputs
- Evaluate rules once daily (end-of-day before market close)
- Gradually rebalance positions toward strategy targets (implicit pyramiding)
- Execute trades automatically via Alpaca paper trading
- Provide a minimal but functional UI for:
  - User account management & Alpaca connection
  - Rule management with signal conditions
  - Positions
  - Orders
  - Run history

### 2.2 Explicit Non-Goals (MVP)
- Real-money trading
- Backtesting engine
- Arbitrary user-defined code execution
- Complex execution algorithms (VWAP, TWAP, etc.)
- Tax optimization / lot selection
- 24/7 crypto-specific scheduling
- Intraday trading (hourly execution)

---

## 3. Core Concepts

### 3.1 User & Account Model
- Users register via **email/password** or **Google OAuth** (Supabase Auth)
- Each user links their own **Alpaca paper trading account** via API key input
- Alpaca credentials are **encrypted at rest** using `pgcrypto` extension
- All user data is isolated via **Row Level Security (RLS)** policies
- Users can validate their Alpaca connection before saving

### 3.2 Strategy ("Rule")
A Strategy is a repeatable policy that defines:
- Universe (symbols it can trade)
- Ranking or signal logic
- Capital allocation (% of equity)
- Rebalancing behavior
- Risk constraints
- **Signal conditions** (optional external signal triggers)

### 3.3 Target-Based Execution (Key Design Choice)
Each run computes **target positions** per symbol.
Orders move current positions **partially toward targets**.

This replaces explicit buy/sell rules and enables:
- Implicit pyramiding
- Gradual entries/exits
- Simple, deterministic execution

**Example with `rebalance_fraction: 0.25`:**

| Run | Current | Target | Difference | Trade (25%) | New Position |
|-----|---------|--------|------------|-------------|--------------|
| 1   | 0       | 100    | +100       | +25         | 25           |
| 2   | 25      | 100    | +75        | +19         | 44           |
| 3   | 44      | 100    | +56        | +14         | 58           |
| 4   | 58      | 100    | +42        | +11         | 69           |

Positions converge ~90% toward target within 8-10 runs.

---

## 4. Strategy Model (MVP)

### 4.1 Supported Strategy Template
`rank_and_rebalance`

This template supports:
- Momentum strategies
- Mean reversion strategies
- Factor-based strategies
- Copy-trade strategies (future)

### 4.2 Strategy Parameters (JSON)

Example:
```json
{
  "template": "rank_and_rebalance",
  "lookback_days": 30,
  "ranking_metric": "return",
  "long_n": 20,
  "short_n": 0,
  "rebalance_fraction": 0.25,
  "allocation_pct": 40,
  "max_weight_per_symbol": 0.05,
  "asset_classes": ["equity", "crypto"]
}
```

### 4.3 Ranking Metrics (Initial)
- % return over lookback window
- SMA / EMA slope
- RSI (later extension)

### 4.4 Symbol Universe
Users can define which symbols their strategies trade via:

**Pre-defined Lists:**
- S&P 500 constituents
- NASDAQ 100 constituents
- Top 100 Crypto by market cap

**Custom Lists:**
- User-entered symbol lists (e.g., `["AAPL", "GOOGL", "TSLA"]`)
- CSV upload (future)

**Synthetic Indices:**
- User-defined composite symbols for custom baskets
- Example: `$FAANG` = weighted average of FB, AAPL, AMZN, NFLX, GOOGL
- Stored in `synthetic_indices` table with `symbol`, `components_json`, `weighting`
- Can be used as ranking inputs or allocation targets

### 4.5 External Signal Sources
External signals provide market context for strategy decisions.

**Signal Source Model:**
```json
{
  "name": "Fear & Greed Index",
  "type": "api",
  "url": "https://api.alternative.me/fng/",
  "jsonpath": "$.data[0].value",
  "polling": "on_demand"
}
```

**Supported Source Types:**
- `api` — JSON endpoint with JSONPath extraction
- `scraper` — HTML page with CSS selector extraction (e.g., CNN Fear & Greed)

**Signal Actions (per strategy):**
Signals can trigger three types of actions:

1. **Position Modifier** — Scale allocation based on signal value
```json
{
  "signal_source": "fear_greed",
  "action": "position_modifier",
  "conditions": [
    { "when": "value < 25", "scale_factor": 1.5 },
    { "when": "value > 75", "scale_factor": 0.5 }
  ]
}
```

2. **Conditional Gate** — Block or allow strategy execution
```json
{
  "signal_source": "fear_greed",
  "action": "conditional_gate",
  "conditions": [
    { "when": "value < 20", "allow": true },
    { "when": "value > 80", "allow": false }
  ]
}
```

3. **Direct Trigger** — Execute specific trade action
```json
{
  "signal_source": "fear_greed",
  "action": "direct_trigger",
  "conditions": [
    { "when": "value < 15", "action": "buy", "symbol": "SPY", "allocation_pct": 10 }
  ]
}
```

**Global Overrides:**
Users can define global signal rules that apply to all strategies (e.g., "halt all trading when Fear > 90").

---

## 5. Execution Logic

### 5.1 Scheduler
- Runs **once daily** at **15:55 ET** (5 minutes before market close)
- Triggered via **GitHub Actions** scheduled workflow
- Workflow calls deployed API endpoint: `POST /api/cron/run-all-users`
- Endpoint processes all users with valid Alpaca connections
- Execution skipped if US market is closed (holidays)

**GitHub Actions Workflow:**
```yaml
name: Trading Bot Daily Run
on:
  schedule:
    - cron: '55 20 * * 1-5'  # 20:55 UTC = 15:55 ET (Mon-Fri)
  workflow_dispatch:  # Manual trigger for testing
jobs:
  run-trading-bot:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger bot run
        run: |
          curl -X POST "${{ secrets.BOT_ENDPOINT }}/api/cron/run-all-users" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Free Tier Limits:**
- GitHub Actions: 2,000 minutes/month (plenty for daily runs)
- Max execution time: 6 hours per job

### 5.2 Run Loop
1. Authenticate cron request (verify `CRON_SECRET`)
2. Fetch all users with valid Alpaca connections
3. For each user (in parallel where possible):
   a. Check market hours (Alpaca clock)
   b. Fetch account equity and current positions
   c. Fetch external signal values (on-demand)
   d. For each enabled strategy:
      - Evaluate signal conditions (gates, modifiers)
      - Compute strategy capital (with any scale factors)
      - Fetch required market data from Alpaca
      - Rank universe symbols
      - Build target portfolio
   e. Compare targets to current positions
   f. Trade `rebalance_fraction` of the difference
   g. Submit market orders to Alpaca
   h. Persist results and logs to Supabase

### 5.3 Risk Constraints (MVP)
- Max position size per symbol (% of strategy capital)
- Max turnover per run
- Minimum trade size threshold

---

## 6. Asset Classes

### 6.1 Equities & ETFs
- Traded only during US market hours
- Market orders only (MVP)

### 6.2 Crypto
- Included in strategies
- Evaluated and traded only during market hours (MVP simplification)

---

## 7. Data Model (Supabase)

### 7.1 Authentication & Users
Managed by **Supabase Auth** with support for:
- Email/password registration
- Google OAuth
- Session management via JWT

### 7.2 Tables

#### profiles (extends auth.users)
- id (FK to auth.users.id)
- display_name
- avatar_url
- created_at
- updated_at

#### user_alpaca_credentials
- id
- user_id (FK)
- encrypted_api_key (encrypted via pgcrypto)
- encrypted_api_secret (encrypted via pgcrypto)
- is_paper (boolean, always true for MVP)
- validated_at
- created_at

#### strategies
- id
- user_id (FK)
- name
- allocation_pct
- rebalance_fraction
- params_json
- signal_conditions_json
- universe_type (predefined | custom | synthetic)
- universe_config_json
- is_enabled
- created_at

#### strategy_runs
- id
- user_id (FK)
- strategy_id (FK)
- started_at
- ended_at
- status
- signal_values_json
- log_json

#### targets
- run_id (FK)
- symbol
- target_shares
- target_value

#### positions_snapshot
- id
- user_id (FK)
- as_of
- symbol
- qty
- avg_price
- market_value
- asset_class

#### orders
- id
- user_id (FK)
- run_id (FK)
- symbol
- side
- qty
- status
- alpaca_order_id
- submitted_at

#### signal_sources
- id
- user_id (FK, nullable for system-wide sources)
- name
- type (api | scraper)
- config_json (url, jsonpath/selector, headers)
- is_global
- created_at

#### signal_readings
- id
- source_id (FK)
- value (numeric)
- raw_response
- fetched_at

#### synthetic_indices
- id
- user_id (FK)
- symbol (e.g., "$FAANG")
- name
- components_json (array of {symbol, weight})
- created_at

#### global_signal_rules
- id
- user_id (FK)
- signal_source_id (FK)
- conditions_json
- priority
- is_enabled

### 7.3 Row Level Security (RLS)
All user-scoped tables enforce RLS policies:
```sql
CREATE POLICY "Users can only access their own data"
ON strategies FOR ALL
USING (auth.uid() = user_id);
```

### 7.4 Encryption
Alpaca credentials encrypted using `pgcrypto`:
```sql
-- Encrypt on insert
INSERT INTO user_alpaca_credentials (user_id, encrypted_api_key, encrypted_api_secret)
VALUES (
  auth.uid(),
  pgp_sym_encrypt(api_key, current_setting('app.encryption_key')),
  pgp_sym_encrypt(api_secret, current_setting('app.encryption_key'))
);

-- Decrypt on read (server-side only)
SELECT pgp_sym_decrypt(encrypted_api_key::bytea, current_setting('app.encryption_key')) as api_key
FROM user_alpaca_credentials WHERE user_id = auth.uid();
```

---

## 8. Architecture

### 8.1 Backend
- **Next.js 15 API routes** (App Router, RSC) for:
  - User authentication flows
  - Alpaca credential management
  - Strategy CRUD
  - Signal source management
  - Cron endpoint (`/api/cron/run-all-users`)
- **GitHub Actions** triggers daily runs via HTTP POST
- **Supabase** as source of truth (Postgres + Auth + RLS)
- **Alpaca API** for market data & order execution

### 8.2 Frontend (Next.js 15 + shadcn/ui)
Core screens:
1. **Landing Page** (marketing)
2. **Login / Signup** (email + Google OAuth)
3. **Dashboard** (account overview, recent runs)
4. **Alpaca Connection** (API key input, test connection)
5. **Strategies** (CRUD with signal conditions)
6. **Signal Sources** (manage external data feeds)
7. **Synthetic Indices** (create custom baskets)
8. **Positions** (current holdings)
9. **Orders** (order history)
10. **Run History** (logs and audit trail)
11. **Account Settings** (profile, display name)

---

## 9. UI Component Guidelines (shadcn/ui)

Recommended components:
- Card (dashboard metrics)
- Table (rules, positions, orders)
- Dialog / Sheet (rule editor)
- Tabs (rule configuration sections)
- Badge (status indicators)
- Alert (risk warnings)
- Command (navigation)

---

## 10. MVP Milestones

1. **Project Scaffolding** — Next.js 15 + Supabase + shadcn/ui SaaS starter
2. **Authentication** — Email/password + Google OAuth via Supabase Auth
3. **Alpaca Integration** — API key input, validation, encrypted storage
4. **Supabase Schema** — All tables with RLS policies
5. **Strategy CRUD UI** — Create, edit, enable/disable strategies
6. **Symbol Universe** — Pre-defined lists + custom + synthetic indices
7. **Signal Sources** — Fear & Greed API integration, condition builder
8. **Daily Runner** — GitHub Actions workflow + cron endpoint
9. **Order Execution** — Target calculation, rebalancing, Alpaca orders
10. **Dashboard & Logs** — Positions, orders, run history

---

## 11. Open Questions / Future Extensions

- Backtesting engine
- Natural language → strategy JSON (AI-powered rule creation)
- Copy-trade data sources (Congress trades, whale wallets)
- Advanced indicators (Bollinger Bands, MACD)
- Intraday execution (hourly runs)
- Live trading (real money)
- Multi-strategy capital arbitration
- Additional signal sources (social sentiment, news)
- Mobile app / push notifications
- Webhook-based triggers (external events)

---

## 12. Definition of Done (MVP)

- Users can sign up via email/password or Google OAuth
- Users can connect their Alpaca paper trading account
- Users can create strategies with symbol universes and signal conditions
- At least one external signal source (Fear & Greed) is available
- Daily runner executes at 15:55 ET via GitHub Actions
- Orders are placed and filled in user's Alpaca paper account
- Positions converge toward strategy targets over time
- UI shows strategies, positions, orders, and run history
- All actions are auditable and logged per user
- RLS policies enforce complete data isolation between users

---

## 13. Project Structure

```
app/
  (marketing)/
    page.tsx                    # Landing page
  (auth)/
    login/page.tsx
    signup/page.tsx
    callback/route.ts           # OAuth callback
  (app)/
    layout.tsx                  # Protected app shell
    page.tsx                    # Dashboard
    alpaca/page.tsx             # Alpaca connection
    strategies/
      page.tsx                  # Strategy list
      [id]/page.tsx             # Strategy detail/edit
      new/page.tsx              # Create strategy
    signals/page.tsx            # Signal sources
    indices/page.tsx            # Synthetic indices
    positions/page.tsx
    orders/page.tsx
    history/page.tsx            # Run history
    settings/page.tsx           # Account settings
  api/
    cron/
      run-all-users/route.ts    # GitHub Actions endpoint
    alpaca/
      validate/route.ts         # Test Alpaca connection
      account/route.ts
      positions/route.ts
      orders/route.ts
    strategies/route.ts
    signals/
      sources/route.ts
      fetch/route.ts            # Fetch signal value
    health/route.ts

components/
  ui/                           # shadcn components
  layout/
    app-header.tsx
    app-sidebar.tsx
    app-shell.tsx
    marketing-header.tsx
  strategies/
    strategy-form.tsx
    strategy-card.tsx
    signal-condition-builder.tsx
    universe-selector.tsx
  alpaca/
    connection-form.tsx
    account-status.tsx
  shared/
    page-header.tsx
    empty-state.tsx
    loading-state.tsx
    data-table.tsx

lib/
  supabase/
    client.ts
    server.ts
    middleware.ts
    types.ts
  alpaca/
    client.ts
    market-data.ts
    trading.ts
  signals/
    fetcher.ts
    sources/
      fear-greed.ts
      scraper.ts
  engine/
    runner.ts
    ranker.ts
    target-calculator.ts
    rebalancer.ts
  utils/
    cn.ts
    env.ts
    crypto.ts                   # Encryption helpers

hooks/
  use-user.ts
  use-alpaca.ts
  use-strategies.ts

types/
  strategy.ts
  signal.ts
  alpaca.ts

.github/
  workflows/
    trading-bot.yml             # Daily cron workflow

supabase/
  migrations/
    001_initial_schema.sql
    002_rls_policies.sql
```

---

## 14. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Encryption
ENCRYPTION_KEY=                 # For pgcrypto / AES

# Cron Security
CRON_SECRET=                    # Validates GitHub Actions requests

# OAuth (Supabase Dashboard)
# Google OAuth configured in Supabase Auth settings
```
