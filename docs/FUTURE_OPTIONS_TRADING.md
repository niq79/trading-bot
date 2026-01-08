# Future Enhancement: Options Trading Implementation

## Executive Summary

This document outlines a comprehensive implementation plan for adding **options trading** capabilities to the trading bot. Currently, the bot uses **share-based** long and short positions via Alpaca's equity API. Alpaca's API supports options trading, but our bot does not yet implement this functionality.

**Current State**: Share-based long/short positions for stocks/ETFs, long-only for crypto
**Proposed Enhancement**: Add covered calls, cash-secured puts, spreads, and algorithmic options strategies

---

## Why Options Trading?

### Advantages
- **Income Generation**: Sell covered calls on long positions for premium income
- **Capital Efficiency**: Control larger positions with less capital (leverage)
- **Defined Risk**: Spreads and protective strategies limit maximum loss
- **Volatility Strategies**: Profit from volatility itself (straddles, strangles)
- **Tax Efficiency**: Different tax treatment vs. short-term capital gains

### Risks & Complexity
- **Time Decay**: Options lose value as expiration approaches (theta decay)
- **Liquidity**: Lower volume than underlying stocks, wider bid-ask spreads
- **Assignment Risk**: Short options can be assigned at any time
- **Complex Greeks**: Delta, gamma, theta, vega require sophisticated modeling
- **Regulatory Requirements**: Pattern day trading rules, Level 3+ options approval

---

## Architecture Changes Required

### 1. Type System Extensions

**New Types** (`types/options.ts`):
```typescript
export type OptionType = 'call' | 'put';
export type OptionStrategy = 
  | 'covered_call'      // Long stock + short call
  | 'cash_secured_put'  // Short put with cash collateral
  | 'vertical_spread'   // Buy + sell same type, different strikes
  | 'iron_condor'       // 4-leg strategy (call spread + put spread)
  | 'straddle'          // Long call + long put, same strike
  | 'strangle';         // Long call + long put, different strikes

export interface OptionsConfig {
  enabled: boolean;
  strategy: OptionStrategy;
  expiration_dte_min: number;  // Days to expiration minimum
  expiration_dte_max: number;  // Days to expiration maximum
  delta_target?: number;       // Target delta for option selection
  max_premium_pct?: number;    // Max premium as % of account equity
}

export interface OptionsContract {
  symbol: string;               // e.g., "AAPL250117C00150000"
  underlying_symbol: string;    // e.g., "AAPL"
  option_type: OptionType;
  strike_price: number;
  expiration_date: string;      // ISO date
  premium: number;              // Price per contract
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  implied_volatility: number;
}
```

### 2. Database Schema Changes

**New Columns** (migration `006_options_trading.sql`):
```sql
-- Add to strategies table
ALTER TABLE strategies
  ADD COLUMN asset_class TEXT DEFAULT 'equity' CHECK (asset_class IN ('equity', 'crypto', 'options')),
  ADD COLUMN options_config JSONB DEFAULT NULL;

-- Add to positions table (for tracking options positions)
ALTER TABLE positions
  ADD COLUMN option_type TEXT CHECK (option_type IN ('call', 'put', NULL)),
  ADD COLUMN strike_price DECIMAL(12, 2),
  ADD COLUMN expiration_date DATE,
  ADD COLUMN underlying_symbol TEXT;

-- Add to orders table
ALTER TABLE orders
  ADD COLUMN option_type TEXT CHECK (option_type IN ('call', 'put', NULL)),
  ADD COLUMN strike_price DECIMAL(12, 2),
  ADD COLUMN expiration_date DATE;
```

### 3. Alpaca Client Extensions

**New Methods** (`lib/alpaca/client.ts`):
```typescript
export class AlpacaClient {
  // ... existing methods ...

  /**
   * Get options chain for an underlying symbol
   */
  async getOptionsChain(params: {
    underlying_symbol: string;
    expiration_date_gte?: string;  // ISO date
    expiration_date_lte?: string;
    option_type?: 'call' | 'put';
    strike_price_gte?: number;
    strike_price_lte?: number;
  }): Promise<OptionsContract[]> {
    const url = new URL(`${this.baseUrl}/v2/options/contracts`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, String(value));
    });

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch options chain: ${response.statusText}`);
    }

    const data = await response.json();
    return data.contracts.map((contract: any) => ({
      symbol: contract.symbol,
      underlying_symbol: contract.underlying_asset.symbol,
      option_type: contract.type,
      strike_price: parseFloat(contract.strike_price),
      expiration_date: contract.expiration_date,
      premium: parseFloat(contract.close_price || contract.bid || 0),
      delta: parseFloat(contract.greeks?.delta || 0),
      gamma: parseFloat(contract.greeks?.gamma || 0),
      theta: parseFloat(contract.greeks?.theta || 0),
      vega: parseFloat(contract.greeks?.vega || 0),
      implied_volatility: parseFloat(contract.implied_volatility || 0),
    }));
  }

  /**
   * Submit options order
   */
  async submitOptionsOrder(params: {
    symbol: string;             // Option contract symbol
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    limit_price?: number;
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
    order_class?: 'simple' | 'bracket' | 'oco' | 'oto';
    take_profit?: { limit_price: number };
    stop_loss?: { stop_price: number };
  }): Promise<Order> {
    const response = await fetch(`${this.baseUrl}/v2/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to submit options order: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Get options Greeks for analysis
   */
  async getOptionsGreeks(symbol: string): Promise<{
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
    implied_volatility: number;
  }> {
    const response = await fetch(
      `${this.baseUrl}/v2/options/contracts/${symbol}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Greeks for ${symbol}`);
    }

    const data = await response.json();
    return {
      delta: parseFloat(data.greeks?.delta || 0),
      gamma: parseFloat(data.greeks?.gamma || 0),
      theta: parseFloat(data.greeks?.theta || 0),
      vega: parseFloat(data.greeks?.vega || 0),
      rho: parseFloat(data.greeks?.rho || 0),
      implied_volatility: parseFloat(data.implied_volatility || 0),
    };
  }
}
```

### 4. New Engine File: Options Ranker

**`lib/engine/options-ranker.ts`**:
```typescript
import { AlpacaClient } from '@/lib/alpaca/client';
import { OptionsConfig, OptionsContract } from '@/types/options';

export interface OptionsRankingParams {
  underlying_symbols: string[];
  config: OptionsConfig;
  current_date: Date;
}

/**
 * Rank options contracts based on strategy criteria
 */
export async function rankOptionsContracts(
  params: OptionsRankingParams,
  alpacaClient: AlpacaClient
): Promise<OptionsContract[]> {
  const { underlying_symbols, config, current_date } = params;

  // Calculate target expiration date range
  const minExpiration = new Date(current_date);
  minExpiration.setDate(minExpiration.getDate() + config.expiration_dte_min);
  
  const maxExpiration = new Date(current_date);
  maxExpiration.setDate(maxExpiration.getDate() + config.expiration_dte_max);

  // Fetch options chains for all underlyings
  const allContracts: OptionsContract[] = [];
  
  for (const symbol of underlying_symbols) {
    const chain = await alpacaClient.getOptionsChain({
      underlying_symbol: symbol,
      expiration_date_gte: minExpiration.toISOString().split('T')[0],
      expiration_date_lte: maxExpiration.toISOString().split('T')[0],
    });
    
    allContracts.push(...chain);
  }

  // Filter based on strategy-specific criteria
  const filtered = allContracts.filter((contract) => {
    // Delta targeting (for directional strategies)
    if (config.delta_target !== undefined) {
      const deltaDiff = Math.abs(Math.abs(contract.delta) - config.delta_target);
      if (deltaDiff > 0.1) return false;  // Within ±0.1 delta
    }

    // Liquidity filter (must have reasonable volume/open interest)
    // TODO: Add volume/OI fields to OptionsContract type

    return true;
  });

  // Rank by premium (for income strategies) or risk/reward
  filtered.sort((a, b) => {
    if (config.strategy === 'covered_call' || config.strategy === 'cash_secured_put') {
      return b.premium - a.premium;  // Higher premium better
    }
    
    // For other strategies, rank by risk-adjusted return
    const scoreA = a.premium / (a.implied_volatility || 1);
    const scoreB = b.premium / (b.implied_volatility || 1);
    return scoreB - scoreA;
  });

  return filtered;
}

/**
 * Calculate target positions for options strategy
 */
export function calculateOptionsTargets(
  contracts: OptionsContract[],
  config: OptionsConfig,
  equity: number,
  max_position_value: number
): Array<{ contract: OptionsContract; quantity: number }> {
  const targets: Array<{ contract: OptionsContract; quantity: number }> = [];

  for (const contract of contracts) {
    // Calculate max contracts based on capital constraints
    const contractValue = contract.premium * 100;  // 100 shares per contract
    
    let maxQty: number;
    if (config.strategy === 'covered_call') {
      // Require owning underlying shares (100 per contract)
      maxQty = 1;  // Conservative: 1 contract for now
    } else if (config.strategy === 'cash_secured_put') {
      // Require cash to cover assignment
      const cashRequired = contract.strike_price * 100;
      maxQty = Math.floor(max_position_value / cashRequired);
    } else {
      // For other strategies, limit by premium cost
      maxQty = Math.floor(max_position_value / contractValue);
    }

    if (maxQty > 0) {
      targets.push({ contract, quantity: maxQty });
    }

    // Stop after filling target position count
    if (targets.length >= 10) break;  // Arbitrary limit
  }

  return targets;
}
```

### 5. New Engine File: Options Roller

**`lib/engine/options-roller.ts`**:
```typescript
import { AlpacaClient } from '@/lib/alpaca/client';
import { OptionsContract } from '@/types/options';

export interface RollDecision {
  close_position: OptionsContract;
  open_position: OptionsContract;
  reason: string;
}

/**
 * Determine if options positions should be rolled to new expiration/strike
 */
export async function evaluateRolling(
  current_positions: OptionsContract[],
  days_to_expiration_threshold: number,
  alpacaClient: AlpacaClient
): Promise<RollDecision[]> {
  const decisions: RollDecision[] = [];
  const today = new Date();

  for (const position of current_positions) {
    const expiration = new Date(position.expiration_date);
    const daysToExpiration = Math.floor(
      (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Roll if expiration is near
    if (daysToExpiration <= days_to_expiration_threshold) {
      // Fetch new options chain for underlying
      const newExpiration = new Date(today);
      newExpiration.setDate(newExpiration.getDate() + 30);  // 30 DTE target

      const chain = await alpacaClient.getOptionsChain({
        underlying_symbol: position.underlying_symbol,
        expiration_date_gte: newExpiration.toISOString().split('T')[0],
        option_type: position.option_type,
        strike_price_gte: position.strike_price * 0.95,  // ±5% strike range
        strike_price_lte: position.strike_price * 1.05,
      });

      if (chain.length > 0) {
        // Select closest strike to current
        const newContract = chain.reduce((closest, contract) => {
          const currentDiff = Math.abs(contract.strike_price - position.strike_price);
          const closestDiff = Math.abs(closest.strike_price - position.strike_price);
          return currentDiff < closestDiff ? contract : closest;
        });

        decisions.push({
          close_position: position,
          open_position: newContract,
          reason: `Expiring in ${daysToExpiration} days - rolling to ${newContract.expiration_date}`,
        });
      }
    }
  }

  return decisions;
}
```

### 6. Strategy Form Updates

**`components/strategies/options-config-section.tsx`** (new component):
```tsx
import { OptionsConfig } from '@/types/options';

export function OptionsConfigSection({
  config,
  onChange,
}: {
  config: OptionsConfig;
  onChange: (config: OptionsConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Options Configuration</h3>
      
      <div>
        <label>Options Strategy</label>
        <select
          value={config.strategy}
          onChange={(e) => onChange({ ...config, strategy: e.target.value as any })}
        >
          <option value="covered_call">Covered Call</option>
          <option value="cash_secured_put">Cash-Secured Put</option>
          <option value="vertical_spread">Vertical Spread</option>
          <option value="iron_condor">Iron Condor</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Min Days to Expiration</label>
          <input
            type="number"
            value={config.expiration_dte_min}
            onChange={(e) => onChange({
              ...config,
              expiration_dte_min: parseInt(e.target.value)
            })}
          />
        </div>
        
        <div>
          <label>Max Days to Expiration</label>
          <input
            type="number"
            value={config.expiration_dte_max}
            onChange={(e) => onChange({
              ...config,
              expiration_dte_max: parseInt(e.target.value)
            })}
          />
        </div>
      </div>

      <div>
        <label>Target Delta (optional)</label>
        <input
          type="number"
          step="0.05"
          min="0"
          max="1"
          value={config.delta_target || ''}
          placeholder="e.g., 0.30 for 30 delta"
          onChange={(e) => onChange({
            ...config,
            delta_target: e.target.value ? parseFloat(e.target.value) : undefined
          })}
        />
        <p className="text-sm text-gray-500">
          Delta indicates probability ITM and directional exposure
        </p>
      </div>
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Foundation (2-3 weeks)
- [ ] Add `asset_class` column to strategies table
- [ ] Create `OptionsConfig` type system
- [ ] Implement Alpaca options API methods (`getOptionsChain`, `submitOptionsOrder`)
- [ ] Add options contract parsing and validation
- [ ] Create basic UI for enabling options in strategy form

### Phase 2: Single-Leg Strategies (3-4 weeks)
- [ ] Implement covered call strategy
  - Require existing long position in underlying
  - Select OTM call based on delta target
  - Generate sell-to-open order
- [ ] Implement cash-secured put strategy
  - Calculate cash requirement (strike × 100)
  - Select OTM put based on delta target
  - Generate sell-to-open order
- [ ] Add options-specific validation (margin requirements, assignment risk)
- [ ] Test with paper trading account

### Phase 3: Rolling & Management (2-3 weeks)
- [ ] Implement `options-roller.ts` logic
- [ ] Add expiration monitoring to daily cron job
- [ ] Create roll decisions based on:
  - Days to expiration threshold
  - P&L thresholds (close at 50% profit)
  - Delta changes (delta hedging)
- [ ] Add assignment handling (early exercise detection)

### Phase 4: Multi-Leg Strategies (4-6 weeks)
- [ ] Implement vertical spreads (call/put spreads)
  - Buy + sell same type, different strikes
  - Calculate max profit/loss
  - Generate simultaneous orders
- [ ] Implement iron condor
  - Call spread + put spread
  - Complex P&L calculation
  - Margin requirement modeling
- [ ] Add Greeks aggregation (portfolio-level delta, theta, vega)
- [ ] Test complex scenarios (assignment on one leg, early close)

### Phase 5: Production Hardening (2-3 weeks)
- [ ] Add real-time Greeks monitoring
- [ ] Implement risk limits (max delta, max contracts)
- [ ] Add bid-ask spread validation (avoid illiquid options)
- [ ] Create alerts for:
  - Positions near expiration
  - High probability of assignment
  - Large unrealized losses
- [ ] Comprehensive testing suite for options
- [ ] Documentation and user guides

**Total Estimated Timeline**: 13-19 weeks (~3-5 months)

---

## Risk Management Considerations

### Assignment Risk
- **Short calls**: Risk of stock being called away at strike price
- **Short puts**: Risk of being forced to buy stock at strike price
- **Mitigation**: Monitor ITM probability, close positions before expiration, maintain adequate margin

### Liquidity Risk
- Options may have low volume and wide bid-ask spreads
- **Mitigation**: Filter by minimum volume/open interest, use limit orders only

### Pin Risk
- Stock closing at or near strike price at expiration creates uncertainty
- **Mitigation**: Close positions day before expiration, avoid naked short options

### Early Exercise Risk
- American options can be exercised any time (unlike European options)
- **Mitigation**: Monitor dividend dates (calls), deep ITM positions (puts)

### Regulatory Risk
- Pattern day trading rules apply to options
- Options approval level required (Alpaca must approve account)
- **Mitigation**: Check account permissions before enabling options trading

---

## Testing Strategy

### Unit Tests
```typescript
// test-options-ranking.ts
describe('Options Ranking', () => {
  test('filters contracts by DTE range', async () => {
    const contracts = await rankOptionsContracts({
      underlying_symbols: ['AAPL'],
      config: { expiration_dte_min: 20, expiration_dte_max: 40 },
      current_date: new Date('2025-01-15'),
    }, mockAlpacaClient);

    // All contracts should expire between Feb 4 and Feb 24
    contracts.forEach((c) => {
      const expDate = new Date(c.expiration_date);
      const dte = Math.floor((expDate - Date.now()) / (1000*60*60*24));
      expect(dte).toBeGreaterThanOrEqual(20);
      expect(dte).toBeLessThanOrEqual(40);
    });
  });

  test('ranks by premium for covered call', async () => {
    const contracts = await rankOptionsContracts({
      underlying_symbols: ['AAPL'],
      config: { strategy: 'covered_call', expiration_dte_min: 30, expiration_dte_max: 45 },
      current_date: new Date(),
    }, mockAlpacaClient);

    // Should be sorted descending by premium
    for (let i = 0; i < contracts.length - 1; i++) {
      expect(contracts[i].premium).toBeGreaterThanOrEqual(contracts[i+1].premium);
    }
  });
});
```

### Integration Tests
```typescript
// test-options-execution.ts
describe('Options Execution', () => {
  test('executes covered call with existing position', async () => {
    const positions = [
      { symbol: 'AAPL', qty: 100, side: 'long' }  // Own 100 shares
    ];

    const result = await executeOptionsStrategy({
      strategy: 'covered_call',
      underlying_symbols: ['AAPL'],
      expiration_dte_min: 30,
      expiration_dte_max: 45,
      delta_target: 0.30,
    }, positions, 10000, mockAlpacaClient);

    // Should generate sell-to-open call order
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].side).toBe('sell');
    expect(result.orders[0].symbol).toMatch(/AAPL\d{6}C\d{8}/);  // Option symbol format
  });
});
```

---

## User Education & Documentation

### User-Facing Docs
- **Options 101**: Basic concepts (calls, puts, premium, strike, expiration)
- **Strategy Guides**: When to use each strategy type
- **Greeks Explained**: What delta, theta, vega mean for your positions
- **Risk Warnings**: Assignment, early exercise, liquidity risks
- **Tax Implications**: How options are taxed vs. stocks

### In-App Tooltips
Add `HelpPopover` components for:
- Options terminology (strike, premium, ITM/OTM)
- Strategy selection (when to use covered calls vs. cash-secured puts)
- Delta targeting (how to choose delta for risk preference)
- Expiration management (when to roll positions)

---

## Migration Path from Current System

### Backwards Compatibility
- Existing strategies continue to work (share-based)
- New `asset_class` column defaults to `'equity'`
- Options trading is **opt-in** per strategy
- No changes to existing execution pipeline

### Phased Rollout
1. **Beta Testing**: Invite select users to test covered calls (lowest risk)
2. **Feedback Loop**: Collect issues, refine UI/UX
3. **Gradual Expansion**: Add cash-secured puts, then spreads
4. **Full Release**: Enable for all users with proper documentation

### User Communication
- Email announcement with educational content
- In-app banners explaining new feature
- Video tutorials for options strategies
- Clear risk disclosures

---

## Open Questions

1. **Margin Requirements**: How does Alpaca calculate margin for multi-leg strategies?
2. **Assignment Handling**: What API endpoint detects early exercise?
3. **Greeks Updates**: How frequently do Greeks refresh in Alpaca's data?
4. **Paper Trading Limitations**: Do options in paper accounts behave identically to live?
5. **Tax Reporting**: Does Alpaca provide 1099-B for options trades?

---

## References

- [Alpaca Options Trading API Docs](https://docs.alpaca.markets/docs/options-trading)
- [Options Pricing Models (Black-Scholes)](https://en.wikipedia.org/wiki/Black%E2%80%93Scholes_model)
- [CBOE Options Education](https://www.cboe.com/education/)
- [OCC Options Disclosure Document](https://www.theocc.com/company-information/documents-and-archives/options-disclosure-document)

---

## Conclusion

Adding options trading will significantly expand the bot's capabilities and appeal to sophisticated traders. However, it requires careful implementation with strong risk management, comprehensive testing, and clear user education.

**Recommended Approach**: Start with covered calls only (lowest risk), validate with extensive paper trading, then gradually add more complex strategies over 6-12 months.

**Next Steps**:
1. Review this document with stakeholders
2. Prioritize Phase 1 tasks
3. Set up dedicated options testing environment
4. Begin Alpaca options API integration
