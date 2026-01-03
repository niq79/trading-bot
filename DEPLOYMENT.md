# Deployment Guide

## Prerequisites

- [Vercel Account](https://vercel.com)
- [Supabase Project](https://supabase.com) (already created)
- [GitHub Account](https://github.com) (for repository and Actions)
- Alpaca Paper Trading Account

## 1. Push to GitHub

```bash
# Create a new repository on GitHub (e.g., trading-bot)
# Then push your code:
git remote add origin https://github.com/YOUR_USERNAME/trading-bot.git
git branch -M main
git push -u origin main
```

## 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Import Project" or "Add New Project"
3. Import your GitHub repository
4. Configure environment variables:

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_64_character_hex_string

# Cron Secret (for GitHub Actions)
CRON_SECRET=your_secret_string_here
```

5. Click "Deploy"

## 3. Configure GitHub Actions

The workflow is already set up in `.github/workflows/trading-bot.yml`. It runs daily at 15:55 ET (5 minutes before market close).

### Set GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:
- `VERCEL_DEPLOYMENT_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- `CRON_SECRET`: Same secret you set in Vercel environment variables

### Workflow Features

- ✅ Runs Monday-Friday at 15:55 ET (20:55 UTC)
- ✅ Skips US market holidays
- ✅ Can be triggered manually via "workflow_dispatch"
- ✅ 10-minute timeout to prevent hanging
- ✅ Calls `/api/cron/run-all-users` endpoint

## 4. Testing the Cron Endpoint

You can manually trigger strategy execution:

```bash
curl -X POST https://your-app.vercel.app/api/cron/run-all-users \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Or test locally:

```bash
curl -X POST http://localhost:3000/api/cron/run-all-users \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## 5. Post-Deployment Checklist

- [ ] Verify all environment variables are set in Vercel
- [ ] Test login/signup functionality
- [ ] Connect Alpaca paper trading account
- [ ] Create a test strategy
- [ ] Manually trigger the cron endpoint to test strategy execution
- [ ] Check Positions and Orders pages for results
- [ ] Verify GitHub Actions workflow is enabled
- [ ] Test manual workflow trigger on GitHub

## 6. Monitoring

- **Vercel Logs**: Dashboard → Your Project → Deployments → View Function Logs
- **GitHub Actions**: Repository → Actions tab → View workflow runs
- **Supabase Logs**: Dashboard → Logs & Reports
- **Alpaca Dashboard**: Check your paper trading account for orders

## 7. Database Migrations

When you need to run new migrations:

**Option A: Supabase Dashboard**
1. Go to SQL Editor
2. Paste migration SQL
3. Run

**Option B: Supabase CLI**
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

See `SUPABASE_CLI_SETUP.md` for detailed CLI instructions.

## 8. Security Considerations

- ✅ Never commit `.env.local` to Git (it's in .gitignore)
- ✅ Rotate `CRON_SECRET` regularly
- ✅ Keep `ENCRYPTION_KEY` secure (can't decrypt credentials without it)
- ✅ Row Level Security (RLS) is enabled on all tables
- ✅ API routes check authentication
- ✅ Alpaca credentials are encrypted at rest

## 9. Scaling Considerations

**Current Setup (MVP):**
- Single daily execution at 15:55 ET
- All users run sequentially
- Works well for <100 users

**For Production Scale:**
- Consider adding queue system (e.g., BullMQ)
- Implement user-specific execution times
- Add retry logic for failed orders
- Monitor Vercel function execution time limits
- Consider dedicated cron service (e.g., EasyCron, Render Cron Jobs)

## 10. Troubleshooting

**Cron not running:**
- Check GitHub Actions workflow is enabled
- Verify `CRON_SECRET` matches in both places
- Check if it's a market holiday
- Look at workflow run logs

**Strategies not executing:**
- Check if strategies are enabled (`is_enabled: true`)
- Verify Alpaca credentials are valid
- Check Vercel function logs for errors
- Test endpoint manually with curl

**Database connection errors:**
- Verify Supabase environment variables
- Check if RLS policies allow access
- Regenerate anon key if needed

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Alpaca API Documentation](https://alpaca.markets/docs/)
