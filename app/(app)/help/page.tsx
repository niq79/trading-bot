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
    <div className="space-y-6">
      <PageHeader
        title="Help & Documentation"
        description="Learn how to use the Trading Bot to automate your investment strategy"
      />

      <Tabs defaultValue="getting-started" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="indices">Indices</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
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
                    <li>Select a signal source (index or external signals)</li>
                    <li>Configure parameters like position count and rebalance frequency</li>
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
                  <p>The bot runs automatically every trading day at 9:00 AM EST:</p>
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
                <AccordionTrigger>Rebalance Frequency</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> How often the bot should adjust your portfolio holdings.
                  </p>
                  <p>
                    <strong>Options:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Daily:</strong> Portfolio rebalances every trading day (most active)</li>
                    <li><strong>Weekly:</strong> Rebalances once per week on Mondays</li>
                    <li><strong>Monthly:</strong> Rebalances on the 1st trading day of each month</li>
                  </ul>
                  <div className="bg-muted p-3 rounded mt-3">
                    <p className="font-semibold mb-2">Considerations:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Daily:</strong> Responds quickly to signal changes but generates more trades</li>
                      <li><strong>Weekly:</strong> Good middle ground for most strategies</li>
                      <li><strong>Monthly:</strong> Lower turnover, suitable for longer-term strategies</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Allocation Method</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> How capital should be divided among your positions.
                  </p>
                  <p>
                    <strong>Options:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Equal Weight:</strong> Each position gets the same dollar amount (e.g., $10,000 each)</li>
                    <li><strong>Signal Weight:</strong> Positions sized proportionally to signal strength (stronger signals = larger positions)</li>
                  </ul>
                  <div className="bg-muted p-3 rounded mt-3">
                    <p className="font-semibold mb-2">Example with 10 positions and $100k capital:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Equal Weight:</strong> All 10 stocks get $10,000 each</li>
                      <li><strong>Signal Weight:</strong> Top-ranked stock might get $15,000, lowest-ranked might get $7,000</li>
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
                    <strong>Note:</strong> This is only applied when using Signal Weight allocation.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Signal Source</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    <strong>What it is:</strong> Where the bot should get trading signals from.
                  </p>
                  <p>
                    <strong>Options:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Synthetic Index:</strong> Use one of your custom-defined symbol lists</li>
                    <li><strong>External Signals:</strong> Fetch signals from an external API endpoint</li>
                  </ul>
                  <p className="mt-3">
                    For synthetic indices, all symbols get a neutral signal (0) and are ranked alphabetically. This is useful for:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Equal-weight portfolios of specific stocks</li>
                    <li>Testing strategies with a fixed universe</li>
                    <li>Simple buy-and-hold approaches</li>
                  </ul>
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

        <TabsContent value="signals" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">External Signals</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What are External Signals?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    External signals are trading recommendations fetched from an API endpoint you provide. Unlike synthetic indices which treat all symbols equally, external signals include:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Symbol:</strong> The stock ticker (e.g., "AAPL")</li>
                    <li><strong>Signal:</strong> A numerical score indicating strength (-100 to +100)</li>
                    <li><strong>Date:</strong> When the signal was generated</li>
                  </ul>
                  <p className="mt-3">
                    The bot will rank symbols by their signal values and use this ranking to determine which positions to hold.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>Setting Up a Signal Source</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    When creating or editing a strategy with external signals:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Select "External Signals" as the signal source type</li>
                    <li>Enter your API endpoint URL</li>
                    <li>(Optional) Add any required authentication headers</li>
                    <li>Click "Fetch Signals" to test the connection</li>
                  </ol>
                  <p className="text-sm mt-3">
                    The bot will fetch fresh signals before each strategy execution.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>API Response Format</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Your API endpoint must return JSON in this exact format:
                  </p>
                  <div className="bg-muted p-3 rounded mt-2 font-mono text-sm">
                    <pre>{`{
  "signals": [
    {
      "symbol": "AAPL",
      "signal": 85.5,
      "date": "2026-01-04"
    },
    {
      "symbol": "MSFT",
      "signal": 72.3,
      "date": "2026-01-04"
    }
  ]
}`}</pre>
                  </div>
                  <p className="mt-3">
                    <strong>Requirements:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Top-level "signals" array</li>
                    <li>Each signal must have symbol, signal, and date fields</li>
                    <li>Signal values should be numbers (can be negative)</li>
                    <li>Dates should be in YYYY-MM-DD format</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>How Signals Are Used</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    During strategy execution:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Bot fetches the latest signals from your API</li>
                    <li>Sorts symbols by signal value (highest to lowest)</li>
                    <li>Selects the top N symbols based on your position count</li>
                    <li>Calculates target positions using your allocation method</li>
                    <li>If using Signal Weight, higher signals get larger positions</li>
                  </ol>
                  <div className="bg-muted p-3 rounded mt-3">
                    <p className="font-semibold mb-2">Example with 3 positions:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                      <li>AAPL: signal 85.5 → Rank #1</li>
                      <li>MSFT: signal 72.3 → Rank #2</li>
                      <li>GOOGL: signal 68.1 → Rank #3</li>
                      <li>TSLA: signal 45.2 → Not included (beyond top 3)</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>Authentication & Headers</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    If your API requires authentication, you can add custom headers:
                  </p>
                  <div className="bg-muted p-3 rounded mt-2">
                    <p className="font-semibold mb-2">Common Examples:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                      <li>
                        <strong>API Key:</strong> Authorization: Bearer your-api-key-here
                      </li>
                      <li>
                        <strong>Custom Header:</strong> X-API-Key: your-key-here
                      </li>
                      <li>
                        <strong>Basic Auth:</strong> Authorization: Basic base64-credentials
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm mt-3">
                    Headers are stored securely and sent with every signal fetch request.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>Testing Your Signal Source</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    Before enabling a strategy with external signals:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Use the "Fetch Signals" button in the strategy form to test connectivity</li>
                    <li>Verify the returned signals make sense (correct symbols, reasonable values)</li>
                    <li>Run a Test Run to see which positions would be selected</li>
                    <li>Check the execution logs to confirm signals are being fetched correctly</li>
                  </ol>
                  <p className="text-sm mt-3">
                    <strong>Tip:</strong> Start with a small position count (3-5) when testing a new signal source.
                  </p>
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
                    The bot runs automatically at <strong>9:00 AM EST</strong> every trading day (Monday-Friday, excluding market holidays).
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
                <AccordionTrigger>What happens if a signal fails to fetch?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <p>
                    If the bot can't fetch signals from your external API (due to network issues, API downtime, etc.):
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>The strategy execution is skipped for that run</li>
                    <li>An error is logged in the History page</li>
                    <li>Your existing positions remain unchanged</li>
                    <li>The bot will retry on the next scheduled run</li>
                  </ul>
                  <p className="text-sm mt-3">
                    <strong>Tip:</strong> Monitor the History page regularly to catch any persistent issues.
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
