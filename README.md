# Trading Bot MVP

A multi-user SaaS trading bot built with Next.js 15, Supabase, and Alpaca API. Users can create and manage algorithmic trading strategies that execute automatically at end-of-day.

## Features

- 🔐 **Multi-user authentication** - Email/password and Google OAuth via Supabase Auth
- 📊 **Strategy builder** - Visual interface to create rank-and-rebalance strategies
- 🔌 **Alpaca integration** - Connect your paper trading account with encrypted credentials
- 📈 **External signals** - Built-in Fear & Greed Index, custom API signals via JSONPath
- ⏰ **Automated execution** - Daily runs at 3:55 PM ET via GitHub Actions
- ⚡ **Manual execution** - Execute strategies on-demand with real-time preview and confirmation
- 🎯 **Target-based rebalancing** - Gradual position convergence with configurable fraction
- 📋 **Full audit trail** - Track positions, orders, and execution history
- 🧪 **Automated testing** - Comprehensive test suite with CI/CD integration
- 🔍 **Data availability checkers** - Diagnostic tools for crypto and stock data availability

## Architecture

- **Frontend**: Next.js 15 with App Router, React Server Components, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Trading API**: Alpaca API (paper trading)
- **Scheduler**: GitHub Actions (runs daily on weekdays at 15:55 ET)
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Alpaca paper trading account
- GitHub account (for automated execution)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd trading-bot
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** and copy:
   - Project URL
   - Anon/public key
   - Service role key (keep secret!)
3. Run the database migrations:
   ```bash
   # In Supabase Dashboard: SQL Editor > New query
   # Copy and run: supabase/migrations/001_initial_schema.sql
   # Then run: supabase/migrations/002_rls_policies.sql
   ```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Encryption key for Alpaca credentials
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Cron security token
CRON_SECRET=$(openssl rand -hex 32)

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Enable Google OAuth (Optional)

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click **Select a project** dropdown (top left) → **NEW PROJECT**
4. Enter project name (e.g., "Trading Bot") → Click **CREATE**
5. Wait for project creation, then select your new project from the dropdown

#### Step 2: Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for any Google user) → Click **CREATE**
3. Fill in required fields:
   - **App name**: Trading Bot (or your app name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **SAVE AND CONTINUE**
5. Click **SAVE AND CONTINUE** on Scopes screen (no changes needed)
6. Click **SAVE AND CONTINUE** on Test users screen (optional)
7. Click **BACK TO DASHBOARD**

#### Step 3: Create OAuth 2.0 Credentials

1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** (top) → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Enter **Name**: Trading Bot Web Client (or any name)
5. Under **Authorized redirect URIs**, click **+ ADD URI**
6. Enter: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
   - Replace `YOUR-PROJECT` with your actual Supabase project reference ID
   - Find this in Supabase Dashboard → Project Settings → API → Project URL
   - Example: If URL is `https://abcdefgh.supabase.co`, use `https://abcdefgh.supabase.co/auth/v1/callback`
7. Click **CREATE**
8. A modal will appear with your **Client ID** and **Client Secret** - **COPY BOTH** (you'll need them next)

#### Step 4: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. In the left sidebar, go to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Toggle **Enable Sign in with Google** to ON
6. Paste the **Client ID** from Google Cloud Console
7. Paste the **Client Secret** from Google Cloud Console
8. Click **Save**

#### Step 5: Test OAuth Login

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click **Continue with Google** button
4. You should be redirected to Google sign-in
5. After signing in, you'll be redirected back to your app

**Note**: For production deployment, add your Vercel URL as an additional redirect URI:
- In Google Cloud Console → Credentials → Your OAuth Client
- Add: `https://your-vercel-app.vercel.app/auth/callback`

#### Common Issues

**Getting 404 after Google login?**

If your OAuth consent screen is in "Testing" mode, you must add yourself as a test user:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Scroll down to **Test users** section
5. Click **+ ADD USERS**
6. Enter your Google email address
7. Click **SAVE**
8. Try signing in again

**Wrong redirect URI error?**

Make sure your redirect URI in Google Cloud Console exactly matches:
- Development: `http://localhost:3000/auth/callback` (if testing locally)
- Production: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

You can add multiple redirect URIs - add both for development and production.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com)
3. Add environment variables from `.env.local`
4. Deploy!

### Set Up Automated Trading

1. In Vercel deployment, copy your production URL
2. Add GitHub secrets to your repository:
   - `APP_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - `CRON_SECRET`: Same value as in Vercel environment variables

3. GitHub Actions workflow (`.github/workflows/trading-bot.yml`) will:
   - Run Monday-Friday at 15:55 ET (5 minutes before market close)
   - Skip US market holidays
   - Call `/api/cron/run-all-users` endpoint
   - Execute all active strategies for all users

## Database Schema

### Tables

- **alpaca_credentials** - Encrypted API keys per user
- **strategies** - User-defined trading strategies
- **signal_sources** - Custom signal configurations (API, scraper)
- **signal_readings** - Historical signal values
- **strategy_runs** - Execution logs
- **synthetic_indices** - User-defined composite benchmarks

### Row Level Security

All tables have RLS policies ensuring users can only access their own data. The service role key bypasses RLS for cron jobs.

## Strategy Types

### Rank and Rebalance

1. **Universe**: Define stock universe (watchlist, sector, custom list)
2. **Ranking**: Rank stocks by metric (momentum, volume, Fear & Greed)
3. **Signal Conditions**: Optional gates based on external signals
4. **Execution**: Set position count and rebalance fraction

Example: "Buy top 5 momentum stocks when Fear & Greed > 60, rebalance 25% daily"

### Manual Execution

Execute any strategy immediately with the **Execute** button:

1. **Preview**: See exact orders that will be placed (market status, estimated fees)
2. **Confirm**: Review order breakdown and fees (0% stocks, 0.2% crypto)
3. **Execute**: Submit real orders to Alpaca paper trading account
4. **Results**: View success/failure for each order with links to Alpaca dashboard

**Safety Features:**
- Strategy must be enabled
- Two-step confirmation required
- Clear "REAL ORDERS" warnings
- Execution audit trail in database

## Security

- ✅ Alpaca credentials encrypted with AES-256-GCM
- ✅ Row Level Security on all tables
- ✅ Auth middleware on all app routes
- ✅ CRON_SECRET validation on automation endpoints
- ✅ Service role key only used server-side

## Project Structure

```
trading-bot/
├── app/
│   ├── (auth)/           # Login, signup pages
│   ├── (app)/            # Protected app routes
│   │   ├── alpaca/       # Alpaca connection
│   │   ├── strategies/   # Strategy CRUD
│   │   ├── signals/      # Signal sources
│   │   ├── positions/    # Current positions
│   │   ├── orders/       # Order history
│   │   ├── history/      # Execution logs
│   │   └── settings/     # User settings
│   ├── api/              # API routes
│   │   ├── alpaca/       # Alpaca validation
│   │   ├── strategies/   # Strategy CRUD
│   │   ├── signals/      # Signal fetching
│   │   └── cron/         # Automation endpoint
│   └── auth/             # OAuth callback
├── components/
│   ├── alpaca/           # Alpaca UI components
│   ├── strategies/       # Strategy form
│   ├── layout/           # App shell, sidebar, header
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── alpaca/           # Alpaca client wrapper
│   ├── engine/           # Trading engine
│   │   ├── runner.ts     # Main execution loop
│   │   ├── ranker.ts     # Stock ranking
│   │   ├── target-calculator.ts  # Position targets
│   │   └── rebalancer.ts # Order generation
│   ├── signals/          # Signal fetching
│   ├── supabase/         # Supabase clients
│   └── utils/            # Encryption, helpers
├── supabase/
│   └── migrations/       # Database migrations
└── types/                # TypeScript types
```

## Trading Engine Flow

1. **Runner** (`lib/engine/runner.ts`)
   - Fetches all users with active strategies
   - Validates Alpaca credentials and market hours
   - Orchestrates execution

2. **Signal Evaluation**
   - Fetches external signals (Fear & Greed, custom APIs)
   - Evaluates signal conditions (gates, triggers)
   - Decides whether to execute strategy

3. **Ranking** (`lib/engine/ranker.ts`)
   - Fetches market data for universe
   - Ranks symbols by configured metric
   - Selects top N positions

4. **Target Calculation** (`lib/engine/target-calculator.ts`)
   - Computes target positions (equal weight or custom)
   - Gets current positions
   - Calculates deltas

5. **Rebalancing** (`lib/engine/rebalancer.ts`)
   - Applies rebalance_fraction (gradual convergence)
   - Generates buy/sell orders
   - Submits to Alpaca API

6. **Logging**
   - Records execution in `strategy_runs` table
   - Stores signal readings
   - Captures errors for debugging

## Configuration Reference

### Strategy Parameters

```typescript
{
  template: "rank_and_rebalance",
  universe: {
    type: "watchlist" | "sector" | "custom",
    values: string[],  // Watchlist name, sector codes, or symbols
  },
  ranking: {
    metric: "momentum_3m" | "momentum_6m" | "volume_20d" | "fear_greed",
    direction: "desc" | "asc",
  },
  execution: {
    position_count: number,  // Top N positions
    rebalance_fraction: number,  // 0.0 to 1.0 (e.g., 0.25 = 25% per run)
  },
  signal_conditions_json?: {
    action: "position_modifier" | "conditional_gate" | "direct_trigger",
    conditions: Array<{
      source_id: string,  // Signal source ID or "fear_greed_crypto"
      operator: "gt" | "lt" | "eq" | "gte" | "lte",
      value: number,
    }>,
    logic: "AND" | "OR",
  }
}
```

### Signal Source Config

```typescript
{
  type: "api" | "scraper",
  url: string,
  method?: "GET" | "POST",
  headers?: Record<string, string>,
  json_path?: string,  // For API sources (e.g., "$.data[0].value")
  selector?: string,   // For scraper sources (regex pattern)
}
```

## Troubleshooting

### Database Migrations Not Applied

```bash
# In Supabase Dashboard > SQL Editor
# Run each migration file manually:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_rls_policies.sql
```

### Alpaca Connection Fails

- Verify API keys are correct (from Alpaca dashboard)
- Ensure paper trading is enabled
- Check that ENCRYPTION_KEY is set in environment

### Cron Job Not Running

- Verify `APP_URL` and `CRON_SECRET` in GitHub secrets
- Check GitHub Actions logs for errors
- Ensure Vercel deployment is live

### Orders Not Placed

- Check market is open (9:30-16:00 ET, weekdays)
- Verify Alpaca account has buying power
- Check strategy is marked as active
- Review logs in History page

## Development

### Running Tests

```bash
npm test                    # Run all tests (short selling + crypto + strategy suite)
npm run test:short-selling  # Test long/short position handling
npm run test:crypto         # Test cryptocurrency trading
npm run test:suite          # Test all strategy combinations
```

See [TESTING.md](./TESTING.md) for detailed test documentation.

**Test Coverage:**
- ✅ 25 total tests (100% pass rate)
- ✅ All universes: Mag7, Dow30, S&P 500, NASDAQ, Crypto
- ✅ All strategies: Long-only, Long/short
- ✅ All weight schemes: Equal, Score Weighted, Inverse Volatility
- ✅ Position limits and ranking metrics
- ✅ Crypto shorting prevention
- ✅ CI/CD via GitHub Actions

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Roadmap

- [ ] Backtesting engine
- [ ] More ranking metrics (RSI, volatility, Sharpe ratio)
- [ ] Portfolio-level risk management (max position size, stop loss)
- [ ] Email/Discord notifications
- [ ] Multi-timeframe execution (intraday, weekly)
- [ ] Advanced order types (limit, trailing stop)
- [ ] WebSocket real-time updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [github.com/your-username/trading-bot/issues](https://github.com/your-username/trading-bot/issues)
- Email: your-email@example.com

## Disclaimer

⚠️ **This software is for educational purposes only. Trading involves risk. Use paper trading accounts only. Past performance does not guarantee future results. The authors are not responsible for any financial losses.**
