# Alpaca Asset Support Analysis

## Summary of Findings

### 1. Crypto Support ❌ NOT PROPERLY IMPLEMENTED

**Current Status:**
- ✅ Crypto symbols defined in `crypto_top10` universe (BTCUSD, ETHUSD, etc.)
- ❌ **WRONG FORMAT**: Code uses `BTCUSD` but Alpaca requires `BTC/USD` format
- ❌ **Symbol incompatibility**: Market data and orders will fail with current format
- ❌ **Not tested**: Likely broken in production

**Alpaca's Requirements:**
- Symbol format: `BTC/USD` (with slash), not `BTCUSD`
- Asset class: `crypto` (separate from `us_equity`)
- Trading: 24/7, no shorting, no margin
- Fees: 15-25 bps (vs commission-free stocks)
- Order limit: $200k notional max

**What Needs Fixing:**
1. Update `crypto_top10` symbols to use `/` format: `BTC/USD`, `ETH/USD`, etc.
2. Add asset_class parameter to Alpaca client methods
3. Handle crypto-specific trading rules (no shorting, 24/7 hours)
4. Update symbol validation to accept `/` character
5. Document crypto fees and limitations

**Recommendation:** 
🚫 **DO NOT USE CRYPTO** until properly implemented and tested. High risk of API errors.

---

### 2. International Stocks ❌ NOT SUPPORTED BY ALPACA

**Current Status:**
- Alpaca only supports: `us_equity` and `crypto`
- **NO European stocks**
- **NO international exchanges** (LSE, Euronext, DAX, etc.)
- US-based broker restricted to US securities

**Available Asset Classes:**
- ✅ `us_equity` - US stocks (NYSE, NASDAQ, AMEX)
- ✅ `crypto` - Cryptocurrencies (BTC/USD, ETH/USD, etc.)
- ✅ Options - US options contracts
- ❌ International equities - NOT AVAILABLE

**European Indices - NOT POSSIBLE:**
- Cannot trade: FTSE 100, DAX, CAC 40, AEX, IBEX, etc.
- No ADRs or cross-listings would work (still US-traded)
- Alpaca is US-only broker

**Recommendation:**
🚫 **Cannot add European indices**. Alpaca does not support international stocks.

---

## Supported Asset Classes

### ✅ US Equities (Fully Supported)
- **Format**: Plain symbols (AAPL, MSFT, GOOGL)
- **Exchanges**: NYSE, NASDAQ, AMEX
- **Features**: Long, short, margin, fractional, options
- **Hours**: 9:30 AM - 4:00 PM ET (+ extended hours)
- **Commission**: $0

### ⚠️  Crypto (Defined but Broken)
- **Format**: Requires `BTC/USD` (currently using wrong format)
- **Pairs**: 56 trading pairs across 20+ coins
- **Features**: Long only, no margin, no shorting, fractional
- **Hours**: 24/7/365
- **Fees**: 15-25 bps per trade
- **Max order**: $200k notional

### ❌ International Stocks (Not Available)
- Alpaca does not support non-US equities
- No European, Asian, or other international markets

---

## Recommendations

### Before Building Test Scripts:

1. **Fix Crypto Implementation (if you want crypto)**
   - Update symbol format to `BTC/USD` style
   - Add asset_class routing in client
   - Disable shorting for crypto
   - Add fee warnings in UI
   - Test thoroughly with paper account

2. **Drop European Indices**
   - Not possible with Alpaca
   - Focus on US equity universes
   - Could add more US indices instead

3. **Test Automation Scope**
   - Focus on US equities (proven, stable)
   - Short selling (newly implemented)
   - Different weight schemes
   - Signal conditions (when implemented)
   - Skip crypto until fixed

### Proposed Test Script Coverage:

✅ **Should Test:**
- US equity universes (Mag7, Dow30, S&P 500, NASDAQ, Russell 2000)
- Long-only strategies
- Long/short strategies
- Different weight schemes (equal, score_weighted, inverse_volatility)
- Max weight caps
- Cash reserve percentages
- Rebalance fractions
- Multiple ranking metrics

❌ **Should NOT Test (Yet):**
- Crypto trading (broken format)
- International stocks (not supported)
- Features not yet implemented (signal conditions, custom signals)

---

## Proposed Action Plan

### Option A: Fix Crypto First
1. Fix symbol format and asset class handling
2. Test crypto trading thoroughly
3. Build comprehensive test suite including crypto
4. Document crypto-specific limitations

### Option B: Skip Crypto (Recommended)
1. Remove or disable `crypto_top10` universe
2. Focus test automation on US equities only
3. Build test suite for implemented features
4. Add crypto later if needed

### Test Script Priorities:
1. ✅ US equity long-only strategies
2. ✅ Long/short strategies (just implemented)
3. ✅ Weight scheme variations
4. ✅ Position limits and caps
5. ✅ Multiple universe types
6. ⏸️  Crypto (needs implementation fix)
7. ❌ International stocks (impossible)

---

## Questions for You:

1. **Do you want crypto support?**
   - If YES: We need to fix the implementation first
   - If NO: We can remove it from the UI

2. **Test automation scope?**
   - Focus on US equities only?
   - Or fix crypto and include it?

3. **Additional US indices?**
   - Since European indices impossible, want more US ones?
   - Examples: S&P 500 sectors, industry ETFs, mid-caps?

Let's align on the above before I build the test automation scripts.
