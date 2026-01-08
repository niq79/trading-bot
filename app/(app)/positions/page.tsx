import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Briefcase, TrendingUp, TrendingDown } from "lucide-react";

export default async function PositionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get Alpaca credentials
  const { data: credentials } = (await supabase
    .from("alpaca_credentials")
    .select("*")
    .eq("user_id", user.id)
    .single()) as { data: { api_key_encrypted: string; api_secret_encrypted: string } | null };

  if (!credentials) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Positions"
          description="View your current portfolio positions"
        />
        <EmptyState
          icon={Briefcase}
          title="Alpaca not connected"
          description="Connect your Alpaca account to view your positions."
        />
      </div>
    );
  }

  // Decrypt and create client
  let positions: Awaited<ReturnType<AlpacaClient["getPositions"]>> = [];
  let account: Awaited<ReturnType<AlpacaClient["getAccount"]>> | null = null;

  try {
    const apiKey = await decrypt(credentials.api_key_encrypted);
    const apiSecret = await decrypt(credentials.api_secret_encrypted);
    const client = new AlpacaClient({ apiKey, apiSecret, paper: true });

    positions = await client.getPositions();
    account = await client.getAccount();
  } catch (error) {
    console.error("Failed to fetch positions:", error);
  }

  const totalValue = positions.reduce(
    (sum, p) => sum + parseFloat(p.market_value),
    0
  );
  const totalCost = positions.reduce(
    (sum, p) => sum + parseFloat(p.cost_basis),
    0
  );
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Positions"
        description="View your current portfolio positions"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Portfolio Value</CardDescription>
            <CardTitle className="text-2xl">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total P&L</CardDescription>
            <CardTitle className={`text-2xl ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
              {totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Return %</CardDescription>
            <CardTitle className={`text-2xl ${totalPnLPercent >= 0 ? "text-success" : "text-destructive"}`}>
              {totalPnLPercent >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cash Balance</CardDescription>
            <CardTitle className="text-2xl">
              ${account ? parseFloat(account.cash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Positions Table */}
      {positions.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No positions"
          description="You don't have any open positions. Create a strategy to start trading."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
            <CardDescription>
              {positions.length} position{positions.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  const qty = parseFloat(position.qty);
                  const isShort = qty < 0;
                  const pnl = parseFloat(position.unrealized_pl);
                  const pnlPercent = parseFloat(position.unrealized_plpc) * 100;
                  const isPositive = pnl >= 0;

                  return (
                    <TableRow key={position.symbol}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          {position.symbol}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isShort ? "destructive" : "default"}>
                          {isShort ? 'Short' : 'Long'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.abs(qty).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(position.avg_entry_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(position.current_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(position.market_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={isPositive ? "success" : "destructive"}>
                          {isPositive ? "+" : ""}${pnl.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={isPositive ? "text-success" : "text-destructive"}>
                          {isPositive ? "+" : ""}{pnlPercent.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
