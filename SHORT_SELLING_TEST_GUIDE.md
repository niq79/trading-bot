# Short Selling Test Guide

## Quick Test (5 minutes)

### 1. Access the Application
Open: http://localhost:3001

### 2. Create a Test Strategy

**Navigate to:** Strategies → New Strategy

**Configuration:**
```
Name: Short Selling Test
Allocation: 100%

Universe Tab:
- Type: Predefined List
- Index: SPY (S&P 500)

Ranking Tab:
- Metric: Momentum (20-day)
- Lookback: 60 days

Execution Tab:
- Long Positions: 5
- Short Positions: 3    ← KEY: Set this to enable shorts
- Weight Scheme: Equal
- Max Weight/Symbol: 20%
- Cash Reserve: 10%
- Rebalance Fraction: 100%
```

### 3. Run Test

1. Click **Save**
2. Click on the strategy name to open detail page
3. Go to **Test Run** tab
4. Click **Run Test**

### 4. What to Look For

#### ✅ Symbol Rankings Table
- Should have a **"Side"** column
- Top 5 symbols: Green "Long" badges
- Bottom 3 symbols: Red "Short" badges
- Example:
  ```
  Rank  Symbol  Side   Score
  1     NVDA    Long   25.3
  2     AAPL    Long   22.1
  ...
  498   F       Short  -18.5
  499   INTC    Short  -20.1
  500   BAC     Short  -22.3
  ```

#### ✅ Target Positions Table
- Should have a **"Side"** column
- 5 long positions with positive values
- 3 short positions with positive values displayed (internally negative)
- All weights at or below 20% (max weight cap)
- Example:
  ```
  Symbol  Side   Current  Target    Weight
  NVDA    Long   $0       $18,000   20.0%
  AAPL    Long   $0       $18,000   20.0%
  ...
  F       Short  $0       $18,000   20.0%
  INTC    Short  $0       $18,000   20.0%
  BAC     Short  $0       $18,000   20.0%
  ```

#### ✅ Orders Table
- BUY orders for long positions: "Increase **long** position..."
- SELL orders for short positions: "Reduce **short** position..." or "Increase short position..." (to open shorts)
- All orders respect the 20% max weight constraint

#### ✅ Analysis Summary
- Should mention both long and short positions
- Shows cash reserve (10%)
- Confirms max weight cap applied

### 5. Edge Cases to Test

#### Test A: More shorts than longs
```
Long Positions: 2
Short Positions: 8
```
Expected: 2 longs at top, 8 shorts at bottom

#### Test B: Long-only (shorts = 0)
```
Long Positions: 10
Short Positions: 0
```
Expected: No short positions, no "Side" differentiation needed

#### Test C: Max weight enforcement
```
Long Positions: 3
Short Positions: 2
Max Weight: 30%
```
Expected: All 5 positions at exactly 30% (90% for longs, 60% for shorts)

#### Test D: Different weight schemes
```
Weight Scheme: Score Weighted
Long Positions: 5
Short Positions: 3
```
Expected: Higher-scored longs get more weight, lower-scored shorts get more weight

## Detailed Verification Checklist

### Database Check
After creating a strategy, verify params are saved:
```sql
SELECT name, params_json->'long_n', params_json->'short_n' 
FROM strategies 
WHERE name = 'Short Selling Test';
```

### API Response Check
Open browser DevTools → Network tab when running test:
- Check `/api/strategies/[id]/test-run` response
- Verify `ranking.rankedSymbols` includes `side: 'long'` and `side: 'short'`
- Verify `targetPositions` includes `side` field
- Verify negative `targetValue` for shorts in raw response

### Console Check
Look for errors in browser console (F12)

## Common Issues & Solutions

### Issue: No "Side" column in rankings
**Cause:** Old test data in browser cache
**Fix:** Hard refresh (Cmd+Shift+R) or clear browser cache

### Issue: All positions show as Long
**Cause:** short_n parameter not passed to ranker
**Fix:** Check ranking config includes `short_n` in test-run route

### Issue: Weights exceed max_weight
**Cause:** applyMaxWeightCap not working
**Fix:** Run `npx tsx test-short-selling.ts` - should all pass

### Issue: Order reasons don't mention "short"
**Cause:** Rebalancer not accessing target.side
**Fix:** Check rebalancer.ts includes positionType logic

## Success Criteria

✅ Rankings show separate long/short sides
✅ Target positions respect max weight for both longs and shorts
✅ Short positions have correct (negative) values internally
✅ Orders clearly distinguish long vs short positions
✅ Cash reserve applied correctly
✅ Total long weight + short weight ≤ 200% (100% each side max)

## Next Steps After Testing

1. Test with real Alpaca paper account
2. Verify Alpaca supports shorting for your account tier
3. Check margin requirements for short positions
4. Monitor execution in Orders page after enabling strategy

## Notes

- Alpaca paper accounts support shorting
- Short positions require margin approval on live accounts
- Not all stocks are shortable (check Alpaca's easy-to-borrow list)
- Short positions carry unlimited risk - test thoroughly!
