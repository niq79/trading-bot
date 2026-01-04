"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface StockDataResult {
  symbol: string;
  hasData: boolean;
  dataPoints: number;
  error?: string;
  lastClose?: number;
  dateRange?: string;
}

interface CheckResult {
  success: boolean;
  universe: string;
  summary: {
    total: number;
    available: number;
    unavailable: number;
    percentage: number;
  };
  symbols: StockDataResult[];
  recommendations: string[];
}

const UNIVERSES = [
  { id: 'mag7', name: 'Magnificent 7', count: 7 },
  { id: 'dow30', name: 'Dow 30', count: 30 },
  { id: 'nasdaq_top10', name: 'NASDAQ Top 10', count: 10 },
];

export default function CheckStockDataPage() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [activeTab, setActiveTab] = useState('mag7');

  const checkUniverse = async (universeId: string) => {
    setIsChecking(true);

    try {
      const response = await fetch(`/api/alpaca/check-stock-data?universe=${universeId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check stock data');
      }

      setResults(prev => ({ ...prev, [universeId]: data }));
      
      if (data.summary.percentage === 100) {
        toast.success(`All ${universeId.toUpperCase()} symbols have data!`);
      } else if (data.summary.percentage >= 50) {
        toast.info(`${data.summary.available}/${data.summary.total} symbols available`);
      } else {
        toast.warning('Limited stock data available');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check data');
      console.error('Error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const checkAll = async () => {
    for (const universe of UNIVERSES) {
      await checkUniverse(universe.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Stock Data Availability"
        description="Check which stock symbols have sufficient historical data in your Alpaca account"
      />

      <Card>
        <CardHeader>
          <CardTitle>Data Availability Check</CardTitle>
          <CardDescription>
            This tool checks if your Alpaca paper trading account has at least 5 days of historical data
            for stocks in various universes. Minimum 5 days required for ranking strategies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={checkAll}
              disabled={isChecking}
              size="lg"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check All Universes
                </>
              )}
            </Button>
          </div>

          {Object.keys(results).length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {UNIVERSES.map(universe => {
                const result = results[universe.id];
                return result ? (
                  <Card key={universe.id}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{universe.name}</p>
                        <p className="text-2xl font-bold">
                          {result.summary.available}/{result.summary.total}
                        </p>
                        <Badge 
                          variant={result.summary.percentage === 100 ? "default" : result.summary.percentage >= 50 ? "secondary" : "destructive"}
                          className="mt-2"
                        >
                          {result.summary.percentage}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                {UNIVERSES.map(universe => (
                  <TabsTrigger key={universe.id} value={universe.id}>
                    {universe.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {UNIVERSES.map(universe => {
                const result = results[universe.id];
                if (!result) return null;

                return (
                  <TabsContent key={universe.id} value={universe.id} className="space-y-4">
                    {/* Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Symbols</p>
                            <p className="text-2xl font-bold">{result.summary.total}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Available</p>
                            <p className="text-2xl font-bold text-green-600">{result.summary.available}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Unavailable</p>
                            <p className="text-2xl font-bold text-red-600">{result.summary.unavailable}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Success Rate</p>
                            <p className="text-2xl font-bold">{result.summary.percentage}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Symbols Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Symbol Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data Points</TableHead>
                              <TableHead>Last Price</TableHead>
                              <TableHead>Date Range</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.symbols.map((symbol) => (
                              <TableRow key={symbol.symbol}>
                                <TableCell className="font-bold">{symbol.symbol}</TableCell>
                                <TableCell>
                                  {symbol.hasData ? (
                                    <Badge variant="default" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Available
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="gap-1">
                                      <XCircle className="h-3 w-3" />
                                      Unavailable
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={symbol.dataPoints >= 5 ? "text-green-600 font-medium" : "text-red-600"}>
                                    {symbol.dataPoints} days
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {symbol.lastClose ? `$${symbol.lastClose.toLocaleString()}` : '-'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {symbol.dateRange || (symbol.error ? symbol.error : '-')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Recommendations */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-blue-600" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {result.recommendations.map((rec, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-md bg-blue-50 border border-blue-200 text-sm"
                            >
                              {rec}
                            </div>
                          ))}
                        </div>

                        {result.summary.available > 0 && (
                          <div className="mt-4 p-4 rounded-md bg-green-50 border border-green-200">
                            <p className="font-medium text-green-900 mb-2">✅ Available Symbols:</p>
                            <p className="text-sm text-green-800">
                              {result.symbols
                                .filter(s => s.hasData)
                                .map(s => s.symbol)
                                .join(', ')}
                            </p>
                            <p className="text-xs text-green-700 mt-2">
                              You can create a Custom Universe with these symbols, or adjust your Long Positions
                              count to {result.summary.available} or less.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
