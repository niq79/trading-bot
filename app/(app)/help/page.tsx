import { PageHeader } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function HelpPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Help & Documentation"
        description="Learn how to use the Trading Bot to automate your investment strategy"
      />

      <Tabs defaultValue="getting-started" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="indices">Indices</TabsTrigger>
          <TabsTrigger value="ranking">Ranking & Execution</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>1. Connect Your Alpaca Account</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Before you can start trading, you need to connect your Alpaca paper trading account:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Sign up for a free account at <a href="https://alpaca.markets" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">alpaca.markets</a></li>
                    <li>Navigate to the Paper Trading dashboard</li>
                    <li>Generate your API Key and Secret Key</li>
                    <li>Copy both keys and paste them into the Alpaca page in this app</li>
                    <li>Click "Save Configuration" to securely store your credentials</li>
                  </ol>
                  <p className="text-sm mt-3">
                    <strong>Important:</strong> Always use paper trading keys, never live trading keys. Your credentials are encrypted before storage.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>2. Create Your First Strategy</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>Strategies define how your portfolio should be managed:</p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Go to the Strategies page</li>
                    <li>Click "New Strategy"</li>
                    <li>Give it a descriptive name (e.g., "Tech Momentum")</li>
                    <li>Select a universe type (predefined list, custom symbols, or synthetic index)</li>
                    <li>Configure parameters like position count and allocation method</li>
                    <li>Enable the strategy when ready</li>
                  </ol>
                  <p className="text-sm mt-3">
                    <strong>Tip:</strong> Use the Test Run feature to see what orders would be placed without executing them.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>3. Understanding Daily Execution</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>The bot runs automatically every trading day at 3:55 PM ET:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Fetches latest signal data for your indices/sources</li>
                    <li>Ranks symbols by signal strength</li>
                    <li>Calculates target positions based on your strategy</li>
                    <li>Compares with current positions to determine trades</li>
                    <li>Places market orders to rebalance your portfolio</li>
                    <li>Logs all activity in the History page</li>
                  </ul>
                  <p className="text-sm mt-3">
                    The next run time is shown on each strategy card.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>4. Monitoring Your Portfolio</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>Track your trading activity across several pages:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Positions:</strong> See all currently held stocks and their values</li>
                    <li><strong>Orders:</strong> View pending and filled orders from recent trades</li>
                    <li><strong>History:</strong> Review execution logs with detailed analysis</li>
                    <li><strong>Alpaca:</strong> Check your account balance and buying power</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Strategy Parameters</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Position Count</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> The number of different stocks to hold simultaneously in your portfolio.
                  </p>
                  <p>
                    <strong>How it works:</strong> The bot will select the top N symbols from your signal source, ranked by signal strength.
                  </p>
                  <div className="bg-muted p-3 rounded mt-2">
                    <p className="font-semibold mb-2">Examples:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>5 positions:</strong> More concentrated, higher individual position sizes (20% each if equal-weighted)</li>
                      <li><strong>10 positions:</strong> Balanced approach, moderate diversification (10% each)</li>
                      <li><strong>20 positions:</strong> Highly diversified, smaller individual positions (5% each)</li>
                    </ul>
                  </div>
                  <p className="text-sm mt-3">
                    <strong>Tip:</strong> Start with 10-15 positions for a good balance between concentration and diversification.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Rebalance Fraction</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> How aggressively the bot adjusts your portfolio toward target positions on each run.
                  </p>
                  <p>
                    <strong>How it works:</strong> The bot runs daily at 3:55 PM ET. The rebalance fraction determines what percentage of the difference to trade for ALL position changes - including entries, increases, decreases, and exits.
                  </p>
                  <div className="bg-muted p-3 rounded mt-2">
                    <p className="font-semibold mb-2">Examples:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>1.0 (100%):</strong> Immediately move to target positions in one trade</li>
                      <li><strong>0.25 (25%):</strong> Gradually adjust over ~4 runs, trading 25% of the difference each day</li>
                      <li><strong>0.1 (10%):</strong> Very gradual adjustment over ~10 runs, averaging entry/exit prices</li>
                    </ul>
                  </div>
                  <p className="text-sm mt-3">
                    <strong>Important:</strong> This applies to exits too - positions leaving the universe will be sold gradually (e.g., 25% per day with 0.25 fraction), reducing market impact and allowing better average exit prices.
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Tip:</strong> Lower values (0.1-0.3) reduce trading costs and market impact but take longer to fully adjust. Higher values (0.5-1.0) respond faster but generate more trades.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Weighting Scheme</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> How capital should be divided among your positions.
                  </p>
                  <p>
                    <strong>Options:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Equal Weight:</strong> Each position gets the same dollar amount (e.g., $10,000 each)</li>
                    <li><strong>Score Weighted:</strong> Positions sized based on ranking score (higher-ranked = larger positions)</li>
                    <li><strong>Inverse Volatility:</strong> Less volatile stocks get larger positions (risk-based weighting)</li>
                  </ul>
                  <div className="bg-muted p-3 rounded mt-3">
                    <p className="font-semibold mb-2">Example with 10 positions and $100k capital:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Equal Weight:</strong> All 10 stocks get $10,000 each</li>
                      <li><strong>Score Weighted:</strong> Top-ranked stock might get $15,000, lowest-ranked might get $7,000</li>
                      <li><strong>Inverse Volatility:</strong> Low-volatility stock might get $12,000, high-volatility might get $8,000</li>
                    </ul>
                  </div>
                  <p className="text-sm mt-3">
                    <strong>Tip:</strong> Equal weight is simpler and easier to understand for beginners.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Max Position Size</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> The maximum percentage of your portfolio that can be allocated to a single stock.
                  </p>
                  <p>
                    <strong>Purpose:</strong> Risk management - prevents over-concentration in one position.
                  </p>
                  <div className="bg-muted p-3 rounded mt-2">
                    <p className="font-semibold mb-2">Examples:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>10%:</strong> No single stock can exceed 10% of portfolio value</li>
                      <li><strong>20%:</strong> Allows more concentration in high-conviction positions</li>
                      <li><strong>5%:</strong> Very conservative, ensures wide diversification</li>
                    </ul>
                  </div>
                  <p className="text-sm mt-3">
                    <strong>Note:</strong> This cap is applied to all weighting schemes to prevent over-concentration.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Universe Type</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> Which symbols your strategy can trade from.
                  </p>
                  <p>
                    <strong>Options:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Predefined List:</strong> Choose from built-in lists like Magnificent 7, S&P 500 Top 50, NASDAQ 100, etc.</li>
                    <li><strong>Custom Symbols:</strong> Enter a comma-separated list of specific symbols to trade</li>
                    <li><strong>Synthetic Index:</strong> Use one of your custom-defined symbol lists from the Indices page</li>
                  </ul>
                  <p className="mt-3">
                    All symbols in the universe are ranked by the selected ranking metric (momentum, volatility, volume, RSI) and the top N are selected for long positions.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>Test Run Feature</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> A dry-run of your strategy that shows what would happen without placing real orders.
                  </p>
                  <p>
                    <strong>What you'll see:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Your current account balance and buying power</li>
                    <li>Signal rankings for all symbols</li>
                    <li>Current positions vs. target positions</li>
                    <li>Exactly which orders would be placed (buy/sell with quantities)</li>
                    <li>Detailed analysis explaining each decision</li>
                  </ul>
                  <p className="text-sm mt-3">
                    <strong>Tip:</strong> Always run a test before enabling a new strategy to verify it behaves as expected.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </TabsContent>

        <TabsContent value="indices" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Synthetic Indices</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What are Synthetic Indices?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    A synthetic index is your own custom list of stock symbols that the bot can use as a trading universe.
                  </p>
                  <p>
                    Unlike external signals that come with ranking data, synthetic indices treat all symbols equally. They're perfect for:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Creating sector-specific portfolios (e.g., "Tech Giants", "Energy Stocks")</li>
                    <li>Building thematic baskets (e.g., "EV Companies", "Cloud Software")</li>
                    <li>Simple equal-weight strategies</li>
                    <li>Testing strategies on a specific set of stocks</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Adding Symbols Manually</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Use the Manual Input tab to add symbols one at a time:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Type a stock symbol (e.g., AAPL)</li>
                    <li>Click "Add Symbol"</li>
                    <li>The bot validates it with Alpaca to ensure it's tradeable</li>
                    <li>Valid symbols appear in your list below</li>
                    <li>Repeat for each symbol you want to add</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Bulk Paste Feature</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    For adding many symbols at once, use the Bulk Paste tab:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Copy a list of symbols from anywhere (spreadsheet, website, text file)</li>
                    <li>Paste into the text area</li>
                    <li>The bot automatically extracts symbols from any format:</li>
                  </ol>
                  <div className="bg-muted p-3 rounded mt-3">
                    <p className="font-semibold mb-2">Supported Formats:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                      <li>Comma-separated: AAPL, MSFT, GOOGL</li>
                      <li>Space-separated: AAPL MSFT GOOGL</li>
                      <li>Line-separated (one per line)</li>
                      <li>Mixed with text: "Buy AAPL and MSFT tomorrow"</li>
                      <li>With extra characters: [AAPL], (MSFT), GOOGL:</li>
                    </ul>
                  </div>
                  <ol start={4} className="list-decimal list-inside space-y-2 ml-4 mt-3">
                    <li>Click "Validate & Add Symbols"</li>
                    <li>The bot checks all symbols with Alpaca</li>
                    <li>Valid symbols are added, invalid ones are reported</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Example Use Cases</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold">1. "Magnificent 7" Tech Portfolio:</p>
                      <p className="text-sm mt-1">Create an index with AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA</p>
                      <p className="text-sm">Strategy: 7 positions, weekly rebalance, equal weight</p>
                    </div>
                    <div>
                      <p className="font-semibold">2. Dividend Aristocrats:</p>
                      <p className="text-sm mt-1">List 20-30 high-quality dividend stocks</p>
                      <p className="text-sm">Strategy: 15 positions, monthly rebalance, equal weight</p>
                    </div>
                    <div>
                      <p className="font-semibold">3. Sector Rotation:</p>
                      <p className="text-sm mt-1">Create separate indices for each sector (tech, finance, healthcare, etc.)</p>
                      <p className="text-sm">Strategy: Use different strategies per sector with varying rebalance frequencies</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Managing Your Indices</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    After creating an index:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Edit:</strong> Click the edit button to add/remove symbols anytime</li>
                    <li><strong>Delete:</strong> Remove indices you no longer need (strategies using it will need a new source)</li>
                    <li><strong>Duplicate:</strong> Start with an existing index and modify it for variations</li>
                  </ul>
                  <p className="text-sm mt-3">
                    <strong>Note:</strong> Changes to an index take effect at the next strategy execution.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Ranking & Execution</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Ranking Metrics</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    The bot ranks all symbols in your universe using one of these metrics:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Momentum (5d/10d/20d/60d):</strong> Price performance over the lookback period - higher is better</li>
                    <li><strong>Volatility:</strong> Price volatility - lower volatility ranks higher for stability-focused strategies</li>
                    <li><strong>Volume:</strong> Trading volume - higher volume ranks higher for liquidity</li>
                    <li><strong>RSI (Relative Strength Index):</strong> Technical indicator - values near 30 (oversold) or 70 (overbought)</li>
                  </ul>
                  <p className="mt-3">
                    After ranking, the bot selects the top N symbols for long positions and optionally bottom M symbols for short positions.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Lookback Period</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> How many days of historical data to use for calculating the ranking metric.
                  </p>
                  <div className="bg-muted p-3 rounded mt-2">
                    <p className="font-semibold mb-2">Common Settings:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>5-10 days:</strong> Very short-term, captures recent momentum swings</li>
                      <li><strong>20-30 days:</strong> Standard monthly period, balances responsiveness with stability</li>
                      <li><strong>60+ days:</strong> Longer-term trends, smoother but slower to react</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Long & Short Positions</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>Long Positions:</strong> Number of top-ranked symbols to buy and hold.
                  </p>
                  <p>
                    <strong>Short Positions:</strong> Number of bottom-ranked symbols to short (bet against). Set to 0 for long-only strategies.
                  </p>
                  <p className="mt-2">
                    <strong>Important:</strong> Shorting is not available for crypto assets on Alpaca. For crypto strategies, always set short positions to 0.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>Cash Reserve</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> Percentage of your allocated capital to keep as cash instead of investing.
                  </p>
                  <div className="bg-muted p-3 rounded mt-2">
                    <p className="font-semibold mb-2">Examples:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>0%:</strong> Fully invested - use all allocated capital for positions</li>
                      <li><strong>10%:</strong> Keep 10% as cash buffer, invest 90%</li>
                      <li><strong>20%:</strong> More conservative, maintains larger cash cushion</li>
                    </ul>
                  </div>
                  <p className="text-sm mt-3">
                    <strong>Use Case:</strong> Useful for volatile strategies or when you want to maintain dry powder for opportunities.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Signal Conditions (Advanced)</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Signal conditions allow you to use external data sources like the Fear & Greed Index to modify strategy behavior.
                  </p>
                  <p className="mt-2">
                    <strong>Available Source:</strong> Crypto Fear & Greed Index (0-100 scale)
                  </p>
                  <p className="mt-2">
                    <strong>Use Cases:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Skip trading when fear is extreme (&lt; 25)</li>
                    <li>Scale position sizes based on market sentiment</li>
                    <li>Only trade when greed is moderate (25-75)</li>
                  </ul>
                  <p className="text-sm mt-3">
                    Find this in the Signal Sources page to set up conditions for your strategies.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>Daily Execution Flow</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Every trading day at 3:55 PM ET, the bot performs these steps:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Fetch current account balance and positions from Alpaca</li>
                    <li>Load universe symbols based on your strategy configuration</li>
                    <li>Fetch price data for all symbols (lookback period)</li>
                    <li>Calculate ranking metric for each symbol</li>
                    <li>Sort and select top N symbols (and bottom M if shorting)</li>
                    <li>Calculate target positions using weighting scheme</li>
                    <li>Apply rebalance fraction to determine trades</li>
                    <li>Place market orders to move toward targets</li>
                    <li>Log all results to History page</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is this safe to use with real money?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>This bot is designed for paper trading only.</strong> Always use your Alpaca paper trading credentials, never live trading keys.
                  </p>
                  <p>
                    Paper trading lets you test strategies with simulated money in real market conditions without any financial risk. Once you're confident in your strategy, you can manually implement it with a live broker.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>When does the bot execute trades?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    The bot runs automatically at <strong>3:55 PM ET</strong> every trading day (Monday-Friday, excluding market holidays).
                  </p>
                  <p>
                    This timing allows the bot to execute at market open when liquidity is high. You can see the next scheduled run time on each strategy card.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Can I run multiple strategies at once?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Yes, but be careful about capital allocation. All enabled strategies share the same Alpaca account balance.
                  </p>
                  <p>
                    <strong>Example:</strong> If you have $100,000 in paper trading capital and enable two strategies each expecting to use the full balance, they'll compete for the same funds.
                  </p>
                  <p className="mt-2">
                    <strong>Best Practice:</strong> Either run one strategy at a time, or design strategies to target different symbols/sectors to avoid conflicts.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>What happens if price data can't be fetched?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    If the bot can't fetch price data from Alpaca (due to network issues, API downtime, market closure, etc.):
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>The strategy execution is skipped for that run</li>
                    <li>An error is logged in the History page</li>
                    <li>Your existing positions remain unchanged</li>
                    <li>The bot will retry on the next scheduled run (3:55 PM ET next trading day)</li>
                  </ul>
                  <p className="text-sm mt-3">
                    <strong>Tip:</strong> Monitor the History page regularly to catch any persistent issues with data fetching or execution.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>How do I stop a strategy from trading?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    To stop a strategy:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Go to the Strategies page</li>
                    <li>Find the strategy you want to stop</li>
                    <li>Toggle the "Enabled" switch to OFF</li>
                  </ol>
                  <p className="mt-2">
                    <strong>Important:</strong> Disabling a strategy only prevents future executions. It does NOT automatically close existing positions. To close positions:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Go to the Positions page</li>
                    <li>Manually sell each position through Alpaca's dashboard, or</li>
                    <li>Reduce the strategy's position count to 0 and run it one last time before disabling</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>Can I trade crypto or international stocks?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    The bot works with whatever assets your Alpaca account supports:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>US Stocks:</strong> Fully supported (NYSE, NASDAQ, etc.)</li>
                    <li><strong>Crypto:</strong> Supported if your Alpaca account has crypto enabled (BTC/USD, ETH/USD, etc.)</li>
                    <li><strong>International Stocks:</strong> Limited to what Alpaca offers (check their documentation)</li>
                  </ul>
                  <p className="text-sm mt-3">
                    <strong>Note:</strong> Crypto trades 24/7 but the bot only runs once daily at 9 AM EST.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger>Why aren't my orders executing?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Common reasons for order failures:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Insufficient buying power:</strong> Check your account balance on the Alpaca page</li>
                    <li><strong>Symbol not tradeable:</strong> Some symbols may be restricted or delisted</li>
                    <li><strong>Market closed:</strong> Orders placed outside market hours may be rejected</li>
                    <li><strong>Position size too small:</strong> Fractional shares might not be enabled</li>
                  </ul>
                  <p className="text-sm mt-3">
                    Check the History page for detailed error messages about failed orders.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8">
                <AccordionTrigger>How do I backup or export my data?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Currently, the bot stores all data in Supabase (your strategies, indices, execution history).
                  </p>
                  <p>
                    To backup your configuration:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Take screenshots of your strategy settings</li>
                    <li>Export your index symbol lists to a text file</li>
                    <li>Save your Alpaca API credentials securely</li>
                  </ul>
                  <p className="text-sm mt-3">
                    <strong>Planned Feature:</strong> Export/import functionality for strategies and indices is on the roadmap.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9">
                <AccordionTrigger>What if I want to use a different broker?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Currently, the bot only supports Alpaca. However, the architecture is designed to be extensible:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>The broker client is isolated in <code>lib/alpaca/client.ts</code></li>
                    <li>Core engine logic is broker-agnostic</li>
                    <li>You could implement a different broker client following the same interface</li>
                  </ul>
                  <p className="text-sm mt-3">
                    Adding support for other brokers (Interactive Brokers, TD Ameritrade, etc.) is technically feasible but would require development work.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-10">
                <AccordionTrigger>How can I contribute or report bugs?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    This is an open-source project! You can:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Report bugs or request features via GitHub Issues</li>
                    <li>Submit pull requests with improvements</li>
                    <li>Share your strategies and success stories</li>
                    <li>Help improve documentation</li>
                  </ul>
                  <p className="text-sm mt-3">
                    Check the project README on GitHub for contribution guidelines.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
