"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface Position {
  symbol: string;
  side: string;
  qty: number | null;
  weight: string;
  marketValue: number | null;
  unrealizedPL: number | null;
  unrealizedPLPercent: string;
}

interface Strategy {
  id: string;
  name: string;
  universe: string;
  longPositions: number;
  shortPositions: number;
}

interface Performance {
  totalEquity: number | null;
  portfolioValue: number | null;
  cashBalance: number | null;
  totalPnL: number | null;
  totalPnLPercent: string;
}

interface PortfolioData {
  username: string;
  displayName: string;
  description: string | null;
  visibility: string;
  positions: Position[];
  strategies: Strategy[];
  performance: Performance | null;
  lastUpdated: string;
}

export default function PublicPortfolioPage() {
  const params = useParams();
  const username = params.username as string;
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const response = await fetch(`/api/public/portfolio/${username}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch portfolio");
        }
        const portfolioData = await response.json();
        setData(portfolioData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchPortfolio();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Portfolio Not Found</CardTitle>
            <CardDescription>{error || "This portfolio does not exist or is private"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const showDollarAmounts = data.visibility === "public_full";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">{data.displayName}'s Portfolio</h1>
          {data.description && (
            <p className="text-muted-foreground">{data.description}</p>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last updated: {new Date(data.lastUpdated).toLocaleString()}</span>
          </div>
        </div>

        {/* Performance */}
        {data.performance && (
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {showDollarAmounts && data.performance.totalEquity !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Total Equity</p>
                    <p className="text-2xl font-bold">
                      ${data.performance.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {showDollarAmounts && data.performance.portfolioValue !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Portfolio Value</p>
                    <p className="text-2xl font-bold">
                      ${data.performance.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {showDollarAmounts && data.performance.cashBalance !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cash Balance</p>
                    <p className="text-2xl font-bold">
                      ${data.performance.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {showDollarAmounts && data.performance.totalPnL !== null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Total P/L</p>
                    <p className={`text-2xl font-bold ${parseFloat(data.performance.totalPnLPercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseFloat(data.performance.totalPnLPercent) >= 0 ? '+' : ''}
                      ${data.performance.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Return %</p>
                  <div className="flex items-center gap-2">
                    {parseFloat(data.performance.totalPnLPercent) >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <p className={`text-2xl font-bold ${parseFloat(data.performance.totalPnLPercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseFloat(data.performance.totalPnLPercent) >= 0 ? '+' : ''}
                      {data.performance.totalPnLPercent}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Positions */}
        <Card>
          <CardHeader>
            <CardTitle>Current Positions ({data.positions.length})</CardTitle>
            <CardDescription>
              {showDollarAmounts ? "Full portfolio details" : "Position weights and performance (dollar amounts hidden)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.positions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No positions</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Weight</TableHead>
                    {showDollarAmounts && <TableHead>Quantity</TableHead>}
                    {showDollarAmounts && <TableHead>Market Value</TableHead>}
                    {showDollarAmounts && <TableHead>Unrealized P/L</TableHead>}
                    <TableHead>Unrealized P/L %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.positions.map((position) => (
                    <TableRow key={position.symbol}>
                      <TableCell className="font-bold">{position.symbol}</TableCell>
                      <TableCell>
                        <Badge className={position.side === "short" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}>
                          {position.side}
                        </Badge>
                      </TableCell>
                      <TableCell>{position.weight}%</TableCell>
                      {showDollarAmounts && <TableCell>{position.qty?.toLocaleString()}</TableCell>}
                      {showDollarAmounts && (
                        <TableCell>
                          ${position.marketValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      )}
                      {showDollarAmounts && (
                        <TableCell className={parseFloat(position.unrealizedPLPercent) >= 0 ? "text-green-600" : "text-red-600"}>
                          {parseFloat(position.unrealizedPLPercent) >= 0 ? '+' : ''}
                          ${position.unrealizedPL?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      )}
                      <TableCell className={parseFloat(position.unrealizedPLPercent) >= 0 ? "text-green-600" : "text-red-600"}>
                        {parseFloat(position.unrealizedPLPercent) >= 0 ? '+' : ''}
                        {position.unrealizedPLPercent}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Strategies */}
        {data.strategies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Strategies ({data.strategies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.strategies.map((strategy) => (
                  <Card key={strategy.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Universe:</span>
                          <Badge variant="outline">{strategy.universe}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Long Positions:</span>
                          <span className="font-medium">{strategy.longPositions}</span>
                        </div>
                        {strategy.shortPositions > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Short Positions:</span>
                            <span className="font-medium">{strategy.shortPositions}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by Trading Bot • Data from Alpaca Markets</p>
        </div>
      </div>
    </div>
  );
}
