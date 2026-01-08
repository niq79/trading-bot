# Trading Bot - TODO & Roadmap

## ✅ Completed
- [x] Multi-user authentication (email/password)
- [x] Alpaca paper trading integration
- [x] Database schema with RLS policies
- [x] Strategy CRUD operations
- [x] Synthetic indices feature
- [x] Signal sources (Fear & Greed Index)
- [x] Trading engine with rebalancing logic
- [x] All UI pages (Dashboard, Strategies, Signals, Positions, Orders, History, Settings)
- [x] Cron endpoint for automated execution
- [x] GitHub Actions workflow for daily execution
- [x] Bulk symbol input with Alpaca validation
- [x] Git repository initialized
- [x] Documentation (README, DEPLOYMENT, SUPABASE_CLI_SETUP)

---

## 🚀 Immediate Next Steps (Ready to Deploy)

### 1. Push to GitHub
**Priority: HIGH | Est. Time: 5 minutes**

```bash
# Create repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/trading-bot.git
git branch -M main
git push -u origin main
```

**Status:** Not started  
**Blocker:** None

---

### 2. Deploy to Vercel
**Priority: HIGH | Est. Time: 15 minutes**

**Steps:**
1. Go to [vercel.com](https://vercel.com) and import GitHub repository
2. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENCRYPTION_KEY`
   - `CRON_SECRET`
3. Deploy and verify application loads

**Reference:** See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions

**Status:** Not started  
**Blocker:** #1 (GitHub repository)

---

### 3. End-to-End Testing
**Priority: HIGH | Est. Time: 30 minutes**

**Test Checklist:**
- [ ] Create a test strategy with simple parameters
- [ ] Enable the strategy
- [ ] Manually trigger cron endpoint:
  ```bash
  curl -X POST https://your-app.vercel.app/api/cron/run-all-users \
    -H "Authorization: Bearer YOUR_CRON_SECRET" \
    -H "Content-Type: application/json"
  ```
- [ ] Verify orders appear in Alpaca dashboard
- [ ] Check Positions page shows new positions
- [ ] Check Orders page shows submitted orders
- [ ] Check History page shows execution log
- [ ] Test all navigation links work
- [ ] Test strategy edit and delete
- [ ] Test synthetic indices creation
- [ ] Test bulk symbol input

**Status:** Not started  
**Blocker:** #2 (Vercel deployment)

---

### 4. Configure GitHub Actions
**Priority: HIGH | Est. Time: 10 minutes**

**Steps:**
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `VERCEL_DEPLOYMENT_URL`: Your Vercel deployment URL
   - `CRON_SECRET`: Same secret from Vercel environment variables
3. Go to Actions tab and enable workflows
4. Manually trigger workflow to test
5. Verify it runs successfully

**Status:** Not started  
**Blocker:** #1 (GitHub repository) and #2 (Vercel deployment)

---

## 🔧 Production Readiness (Before Real Users)

### 5. TypeScript Improvements
**Priority: MEDIUM | Est. Time: 2 hours**

**Tasks:**
- [ ] Link Supabase project: `supabase link --project-ref YOUR_REF`
- [ ] Regenerate database types: `supabase gen types typescript --linked > lib/supabase/database.types.ts`
- [ ] Remove all `@ts-expect-error` comments
- [ ] Enable `strict: true` in tsconfig.json
- [ ] Fix resulting type errors
- [ ] Test application still works

**Files to Update:**
- `app/api/strategies/route.ts`
- `app/api/alpaca/validate/route.ts`
- `lib/engine/runner.ts`
- Others with `@ts-expect-error` comments

**Status:** Not started  
**Blocker:** None (can be done in parallel)

---

### 6. Implement Real Alpaca Methods
**Priority: MEDIUM | Est. Time: 3 hours**

**Currently Stubbed Methods:**
- `AlpacaClient.getBars()` - Get historical price data
- `AlpacaClient.getAsset()` - Get asset information

**Tasks:**
- [ ] Implement `getBars()` method using Alpaca's `/v2/stocks/{symbol}/bars` endpoint
- [ ] Implement `getAsset()` method using Alpaca's `/v2/assets/{symbol}` endpoint
- [ ] Update `ranker.ts` to use real market data instead of random scores
- [ ] Test ranking with actual price data

**Files to Update:**
- `lib/alpaca/client.ts`
- `lib/engine/ranker.ts`

**Status:** Not started  
**Impact:** High - currently strategies rank symbols randomly

---

### 7. Add Monitoring & Error Tracking
**Priority: MEDIUM | Est. Time: 2 hours**

**Options:**
- [Sentry](https://sentry.io) - Error tracking
- [LogTail](https://logtail.com) - Structured logging
- [BetterStack](https://betterstack.com) - Uptime monitoring

**Tasks:**
- [ ] Set up error tracking service
- [ ] Add error tracking to all API routes
- [ ] Add error tracking to cron endpoint
- [ ] Set up alerts for failed executions
- [ ] Add structured logging for strategy runs
- [ ] Create dashboard for monitoring

**Status:** Not started  
**Blocker:** None

---

### 8. Security Hardening
**Priority: HIGH | Est. Time: 3 hours**

**Tasks:**
- [ ] Add rate limiting to API endpoints
  - Consider [Upstash Rate Limit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
  - Limit `/api/alpaca/validate` to prevent brute force
  - Limit `/api/strategies` creation
- [ ] Review and test all RLS policies in Supabase
- [ ] Add input validation middleware
- [ ] Add CORS configuration if needed
- [ ] Review encryption implementation
- [ ] Add request size limits
- [ ] Test XSS and SQL injection protection

**Status:** Not started  
**Impact:** Critical for production

---

## 🎨 Feature Enhancements (Future)

### 9. User Experience Improvements
**Priority: LOW | Est. Time: 4 hours**

**Tasks:**
- [ ] Add loading states and skeleton screens
- [ ] Improve error messages (more user-friendly)
- [ ] Add confirmation dialogs for destructive actions
  - Delete strategy
  - Disconnect Alpaca
  - Delete synthetic index
- [ ] Add tooltips explaining strategy parameters
- [ ] Add help/documentation links
- [ ] Improve mobile responsiveness
- [ ] Add dark mode support (already has light/dark toggle?)

**Status:** Not started

---

### 10. Trading Engine Enhancements
**Priority: LOW | Est. Time: 8+ hours**

**Features:**
- [ ] Strategy backtesting engine
- [ ] Support limit orders (currently only market orders)
- [ ] Add stop-loss / take-profit rules
- [ ] Implement position sizing strategies (Kelly Criterion, etc.)
- [ ] Add more ranking metrics:
  - RSI (Relative Strength Index)
  - Volume-weighted momentum
  - Bollinger Bands
  - Moving average crossovers
- [ ] Add signal condition builder UI
- [ ] Support crypto trading (24/7 scheduling)
- [ ] Add paper trading simulation mode

**Status:** Not started  
**Impact:** Would significantly enhance strategy capabilities

---

### 11. Analytics & Reporting
**Priority: MEDIUM | Est. Time: 6 hours**

**Features:**
- [ ] Strategy performance dashboard
  - Total return
  - Sharpe ratio
  - Max drawdown
  - Win rate
- [ ] Trade history with profit/loss calculations
- [ ] Benchmark comparison (vs S&P 500, NASDAQ)
- [ ] Charts and visualizations (consider [Recharts](https://recharts.org))
- [ ] Export trade history to CSV
- [ ] Generate performance reports (PDF)
- [ ] Strategy comparison tool

**Status:** Not started

---

### 12. Notifications & Alerts
**Priority: LOW | Est. Time: 4 hours**

**Features:**
- [ ] Email notifications for strategy execution results
- [ ] Alerts for failed executions or errors
- [ ] Daily/weekly performance summaries
- [ ] SMS notifications for critical errors (optional)
- [ ] Webhook support for custom integrations
- [ ] In-app notification center

**Tools:**
- [Resend](https://resend.com) - Email API
- [Twilio](https://www.twilio.com) - SMS (optional)

**Status:** Not started

---

### 13. Additional Features (Nice to Have)

**User Management:**
- [ ] Google OAuth login (mentioned in PRD)
- [ ] User profile page
- [ ] Account settings (timezone, notifications)
- [ ] Subscription/billing (if monetizing)

**Strategy Features:**
- [ ] Strategy templates/presets
- [ ] Share strategies (public marketplace?)
- [ ] Copy other users' strategies
- [ ] Strategy versioning

**Data & Integrations:**
- [ ] More signal sources (VIX, economic indicators)
- [ ] Alternative data providers
- [ ] Webhook triggers for strategies
- [ ] API for programmatic access

---

## 📋 Recommended Order

**Week 1 - Get to Production:**
1. Push to GitHub (#1)
2. Deploy to Vercel (#2)
3. End-to-End Testing (#3)
4. Configure GitHub Actions (#4)

**Week 2 - Improve Code Quality:**
5. TypeScript Improvements (#5)
6. Implement Real Alpaca Methods (#6)
7. Security Hardening (#8)

**Week 3 - Production Ready:**
8. Add Monitoring & Error Tracking (#7)
9. Final testing and bug fixes
10. Soft launch to limited users

**Week 4+ - Feature Development:**
11. Analytics & Reporting (#11)
12. User Experience Improvements (#9)
13. Trading Engine Enhancements (#10)
14. Notifications & Alerts (#12)

---

## 🐛 Known Issues

### Critical
- None currently identified

### High
- Ranking uses random scores instead of real market data (#6)
- No rate limiting on API endpoints (#8)

### Medium
- TypeScript strict mode disabled (#5)
- No error monitoring (#7)

### Low
- Some navigation links needed fixing (completed)
- Variable naming conflict in runner.ts (completed)

---

## 📝 Notes

- Keep `ENCRYPTION_KEY` secure - cannot decrypt Alpaca credentials without it
- GitHub Actions runs at 15:55 ET (20:55 UTC) on weekdays only
- Skips US market holidays (list in `.github/workflows/trading-bot.yml`)
- Paper trading only for MVP - do not enable real money trading
- Vercel free tier has function execution time limits (10s for hobby, 60s for pro)

---

## 🔗 Resources

- [Alpaca API Docs](https://alpaca.markets/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Vercel Deployment](https://vercel.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Last Updated:** January 3, 2026  
**Project Status:** MVP Complete, Ready for Deployment
