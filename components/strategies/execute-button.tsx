"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExecuteButtonProps {
  strategyId: string;
  strategyName: string;
  isEnabled: boolean;
}

interface OrderResult {
  symbol: string;
  side: "buy" | "sell";
  notional: number;
  status: "success" | "failed";
  error?: string;
  orderId?: string;
}

interface ExecutionResponse {
  success: boolean;
  ordersPlaced: number;
  ordersFailed: number;
  marketStatus: "open" | "closed";
  summary: {
    totalOrders: number;
    successful: number;
    failed: number;
    totalBuyValue: number;
    totalSellValue: number;
    netChange: number;
    estimatedFees: number;
  };
  orderResults: OrderResult[];
  feeBreakdown: Array<{ symbol: string; fee: number }>;
  timestamp: string;
  error?: string;
}

export function ExecuteButton({ strategyId, strategyName, isEnabled }: ExecuteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);

  // Step 1: Preview orders (dry run)
  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/strategies/${strategyId}/test-run`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to preview orders");
      }

      const data = await response.json();
      setPreviewData(data);
      setShowConfirmDialog(true);
    } catch (error) {
      console.error("Preview error:", error);
      alert(error instanceof Error ? error.message : "Failed to preview orders");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Execute orders (real!)
  const handleExecute = async () => {
    setIsLoading(true);
    setShowConfirmDialog(false);
    
    try {
      const response = await fetch(`/api/strategies/${strategyId}/execute`, {
        method: "POST",
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to execute orders");
      }

      setExecutionResult(data);
    } catch (error) {
      console.error("Execution error:", error);
      setExecutionResult({
        success: false,
        ordersPlaced: 0,
        ordersFailed: 0,
        marketStatus: "closed",
        summary: {
          totalOrders: 0,
          successful: 0,
          failed: 0,
          totalBuyValue: 0,
          totalSellValue: 0,
          netChange: 0,
          estimatedFees: 0,
        },
        orderResults: [],
        feeBreakdown: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseResult = () => {
    setExecutionResult(null);
    setPreviewData(null);
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>⚡ Execute Strategy</CardTitle>
          <CardDescription>
            Place real orders on Alpaca for this strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <p>Strategy must be enabled before execution</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>⚡ Execute Strategy</CardTitle>
          <CardDescription>
            Place real orders on Alpaca for this strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-amber-900">Real Order Execution</p>
                <p className="text-sm text-amber-700">
                  This will place actual orders on your Alpaca paper trading account.
                  Orders can be placed even when the market is closed (they will be queued).
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Before executing:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Ensure your strategy configuration is correct</li>
              <li>Check your Alpaca account has sufficient buying power</li>
              <li>Review the order preview carefully</li>
              <li>Orders may experience slippage in real market conditions</li>
            </ul>
          </div>

          <Button 
            onClick={handlePreview} 
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Preview Orders
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⚠️ Confirm Order Execution</DialogTitle>
            <DialogDescription>
              Review these orders before execution. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              {/* Market Status */}
              <div className="flex items-center gap-2">
                <Badge variant={previewData.account ? "default" : "secondary"}>
                  Market: {previewData.account ? "Preview Ready" : "Unknown"}
                </Badge>
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Orders</p>
                      <p className="font-medium">{previewData.orders?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Buy Orders</p>
                      <p className="font-medium text-green-600">
                        {previewData.orders?.filter((o: any) => o.side === "buy").length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sell Orders</p>
                      <p className="font-medium text-red-600">
                        {previewData.orders?.filter((o: any) => o.side === "sell").length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Change</p>
                      <p className="font-medium">
                        ${((previewData.orders?.filter((o: any) => o.side === "buy").reduce((sum: number, o: any) => sum + o.notional, 0) || 0) -
                          (previewData.orders?.filter((o: any) => o.side === "sell").reduce((sum: number, o: any) => sum + o.notional, 0) || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Orders List */}
              {previewData.orders && previewData.orders.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Orders to Execute</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {previewData.orders.map((order: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={order.side === "buy" ? "default" : "secondary"}>
                              {order.side.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{order.symbol}</span>
                          </div>
                          <span className="font-mono">${order.notional.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {previewData.orders?.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No orders needed - portfolio is already aligned with targets
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecute}
              disabled={isLoading || !previewData?.orders?.length}
              variant="destructive"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                "Execute Orders"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution Result Dialog */}
      <Dialog open={!!executionResult} onOpenChange={handleCloseResult}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {executionResult?.success ? "✅ Execution Complete" : "❌ Execution Failed"}
            </DialogTitle>
            <DialogDescription>
              {executionResult?.error || "Order execution results"}
            </DialogDescription>
          </DialogHeader>

          {executionResult && executionResult.success && (
            <div className="space-y-4">
              {/* Market Status - Only show for stock orders, not crypto */}
              {(() => {
                const hasCrypto = executionResult.orderResults?.some(o => o.symbol.includes('/'));
                const hasStocks = executionResult.orderResults?.some(o => !o.symbol.includes('/'));
                
                return (
                  <div className="flex items-center gap-2">
                    {hasCrypto && !hasStocks && (
                      <>
                        <Badge variant="default">Crypto Trading (24/7)</Badge>
                        <p className="text-sm text-muted-foreground">
                          Crypto orders execute immediately
                        </p>
                      </>
                    )}
                    {hasStocks && !hasCrypto && (
                      <>
                        <Badge variant={executionResult.marketStatus === "open" ? "default" : "secondary"}>
                          Market {executionResult.marketStatus === "open" ? "Open" : "Closed"}
                        </Badge>
                        {executionResult.marketStatus === "closed" && (
                          <p className="text-sm text-muted-foreground">
                            Orders will be queued and executed when market opens
                          </p>
                        )}
                      </>
                    )}
                    {hasCrypto && hasStocks && (
                      <>
                        <Badge variant={executionResult.marketStatus === "open" ? "default" : "secondary"}>
                          Stock Market {executionResult.marketStatus === "open" ? "Open" : "Closed"}
                        </Badge>
                        <Badge variant="default">Crypto 24/7</Badge>
                        {executionResult.marketStatus === "closed" && (
                          <p className="text-sm text-muted-foreground">
                            Stock orders queued, crypto orders execute immediately
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
              

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Execution Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Orders Placed</p>
                      <p className="font-medium text-green-600">{executionResult.ordersPlaced}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Orders Failed</p>
                      <p className="font-medium text-red-600">{executionResult.ordersFailed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Buy</p>
                      <p className="font-medium">${executionResult.summary.totalBuyValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Sell</p>
                      <p className="font-medium">${executionResult.summary.totalSellValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Change</p>
                      <p className="font-medium">${executionResult.summary.netChange.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Est. Fees</p>
                      <p className="font-medium">${executionResult.summary.estimatedFees.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {executionResult.orderResults.map((order, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          {order.status === "success" ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <Badge variant={order.side === "buy" ? "default" : "secondary"}>
                            {order.side.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{order.symbol}</span>
                          <span className="text-sm text-muted-foreground">
                            ${order.notional.toLocaleString()}
                          </span>
                        </div>
                        {order.status === "failed" && order.error && (
                          <span className="text-xs text-red-600">{order.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Fee Breakdown (if any crypto) */}
              {executionResult.feeBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estimated Fee Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {executionResult.feeBreakdown.map((fee, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-muted-foreground">{fee.symbol}</span>
                          <span className="font-mono">${fee.fee.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href="https://app.alpaca.markets/paper/dashboard/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View in Alpaca
                  </a>
                </Button>
                <Button onClick={handleCloseResult} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
