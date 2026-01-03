"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Play, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info } from "lucide-react";

// Helper function to format currency with thousand separators
function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface TestRunButtonProps {
  strategyId: string;
  strategyName: string;
}

interface RankedSymbol {
  symbol: string;
  side: 'long' | 'short';
  score: number;
  metrics: Record<string, number>;
}

interface Position {
  symbol: string;
  qty: number;
  market_value: number;
  current_price: number;
}

interface TargetPosition {
  symbol: string;
  side: 'long' | 'short';
  targetValue: number;
  targetWeight: number;
  currentValue: number;
}

interface Order {
  symbol: string;
  side: "buy" | "sell";
  notional: number;
  reason: string;
}

interface TestResult {
  success: boolean;
  timestamp: string;
  error?: string;
  account: {
    equity: number;
    buying_power: number;
    cash: number;
  };
  strategy?: {
    allocation_pct: number;
    rebalance_fraction: number;
    allocated_equity: number;
    weight_scheme: string;
    max_weight_per_symbol: number;
    cash_reserve_pct: number;
  };
  universe: {
    symbols: string[];
    size: number;
  };
  ranking: {
    rankedSymbols: RankedSymbol[];
    topN: number;
  };
  currentPositions: Position[];
  targetPositions: TargetPosition[];
  orders: Order[];
  analysis: {
    summary: string;
    details: string[];
  };
}

export function TestRunButton({ strategyId, strategyName }: TestRunButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch(`/api/strategies/${strategyId}/test-run`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run test");
      }

      setResult(data);
      toast.success("Test run completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run test");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Run (Dry Run)</CardTitle>
          <CardDescription>
            Simulate strategy execution without placing real orders. See what decisions would be made.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runTest} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Test Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && result.success && (
        <>
          {/* Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Test Results: {strategyName}
              </CardTitle>
              <CardDescription>
                {new Date(result.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="font-semibold text-lg">{result.analysis.summary}</p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {result.analysis.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground/50">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Equity</p>
                  <p className="text-2xl font-bold">${formatCurrency(result.account.equity)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Buying Power</p>
                  <p className="text-2xl font-bold">${formatCurrency(result.account.buying_power)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash</p>
                  <p className="text-2xl font-bold">${formatCurrency(result.account.cash)}</p>
                </div>
              </div>
              {result.strategy && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Strategy Parameters Applied</h4>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Allocation</p>
                      <p className="text-lg font-semibold">{result.strategy.allocation_pct}%</p>
                      <p className="text-xs text-muted-foreground">${formatCurrency(result.strategy.allocated_equity)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rebalance Fraction</p>
                      <p className="text-lg font-semibold">{(result.strategy.rebalance_fraction * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">of diff per run</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Top N Symbols</p>
                      <p className="text-lg font-semibold">{result.ranking.topN}</p>
                      <p className="text-xs text-muted-foreground">held positions</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Weight Scheme</p>
                      <p className="text-lg font-semibold capitalize">{result.strategy.weight_scheme.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">position sizing</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Max Weight/Symbol</p>
                      <p className="text-lg font-semibold">{(result.strategy.max_weight_per_symbol * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">position cap</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cash Reserve</p>
                      <p className="text-lg font-semibold">{(result.strategy.cash_reserve_pct * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">uninvested</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ranking Results */}
          <Card>
            <CardHeader>
              <CardTitle>Symbol Rankings</CardTitle>
              <CardDescription>
                All {result.universe.size} symbols evaluated and ranked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Metrics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.ranking.rankedSymbols.map((symbol, idx) => {
                    const isLong = symbol.side === 'long';
                    const isShort = symbol.side === 'short';
                    const isSelected = isLong || isShort;
                    return (
                      <TableRow key={symbol.symbol} className={isSelected ? "bg-muted/50" : ""}>
                        <TableCell className="font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-bold">{symbol.symbol}</TableCell>
                        <TableCell>
                          {isLong && <Badge variant="default">Long</Badge>}
                          {isShort && <Badge variant="destructive">Short</Badge>}
                        </TableCell>
                        <TableCell>{symbol.score.toFixed(2)}</TableCell>
                        <TableCell>
                          {isSelected ? (
                            <Badge variant="default">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Selected
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Excluded
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {Object.entries(symbol.metrics)
                            .map(([key, value]) => `${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`)
                            .join(", ")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Current Positions */}
          {result.currentPositions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Current Positions</CardTitle>
                <CardDescription>Holdings before rebalance</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Market Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.currentPositions.map((pos) => (
                      <TableRow key={pos.symbol}>
                        <TableCell className="font-bold">{pos.symbol}</TableCell>
                        <TableCell className="text-right">{pos.qty.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${formatCurrency(pos.current_price)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${formatCurrency(pos.market_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">
                        ${formatCurrency(result.currentPositions.reduce((s, p) => s + p.market_value, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Target Positions */}
          <Card>
            <CardHeader>
              <CardTitle>Target Positions</CardTitle>
              <CardDescription>Desired allocation after rebalance</CardDescription>
            </CardHeader>
            <CardContent>
              {result.targetPositions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Current Value</TableHead>
                      <TableHead className="text-right">Target Value</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.targetPositions.map((target) => {
                      const change = target.targetValue - target.currentValue;
                      const isShort = target.side === 'short';
                      return (
                        <TableRow key={target.symbol}>
                          <TableCell className="font-bold">{target.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={isShort ? "destructive" : "default"}>
                              {target.side === 'long' ? 'Long' : 'Short'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">${formatCurrency(Math.abs(target.currentValue))}</TableCell>
                          <TableCell className="text-right">${formatCurrency(Math.abs(target.targetValue))}</TableCell>
                          <TableCell className="text-right">{(Math.abs(target.targetWeight) * 100).toFixed(1)}%</TableCell>
                          <TableCell className={`text-right font-semibold ${change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : ""}`}>
                            {change > 0 ? "+$" : "-$"}{formatCurrency(Math.abs(change))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No target positions (all signals indicate skip trading)</p>
              )}
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Orders to Execute</CardTitle>
              <CardDescription>
                {result.orders.length === 0
                  ? "No orders needed - portfolio is already balanced"
                  : `${result.orders.length} orders would be placed`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Notional</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.orders.map((order, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold">{order.symbol}</TableCell>
                        <TableCell>
                          {order.side === "buy" ? (
                            <Badge variant="default" className="bg-green-500">
                              <TrendingUp className="mr-1 h-3 w-3" />
                              BUY
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <TrendingDown className="mr-1 h-3 w-3" />
                              SELL
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${formatCurrency(Math.abs(order.notional))}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{order.reason}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell colSpan={2}>Net Change</TableCell>
                      <TableCell className="text-right">
                        ${formatCurrency(
                          result.orders.filter((o) => o.side === "buy").reduce((s, o) => s + o.notional, 0) -
                          result.orders.filter((o) => o.side === "sell").reduce((s, o) => s + o.notional, 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Portfolio already optimally balanced
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {result && !result.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Test Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{result.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
