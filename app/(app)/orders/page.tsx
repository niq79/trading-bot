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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default async function OrdersPage() {
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
          title="Orders"
          description="View your order history"
        />
        <EmptyState
          icon={Receipt}
          title="Alpaca not connected"
          description="Connect your Alpaca account to view your orders."
        />
      </div>
    );
  }

  // Decrypt and create client
  let orders: Awaited<ReturnType<AlpacaClient["getOrders"]>> = [];

  try {
    const apiKey = await decrypt(credentials.api_key_encrypted);
    const apiSecret = await decrypt(credentials.api_secret_encrypted);
    const client = new AlpacaClient({ apiKey, apiSecret, paper: true });

    orders = await client.getOrders({ status: "all", limit: 100 });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "filled":
        return "success";
      case "partially_filled":
        return "warning";
      case "canceled":
      case "expired":
      case "rejected":
        return "destructive";
      case "new":
      case "accepted":
      case "pending_new":
        return "secondary";
      default:
        return "outline";
    }
  };

  const filledOrders = orders.filter((o) => o.status === "filled");
  const pendingOrders = orders.filter((o) =>
    ["new", "accepted", "pending_new", "partially_filled"].includes(o.status)
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Orders"
        description="View your order history"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-2xl">{orders.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filled Orders</CardDescription>
            <CardTitle className="text-2xl text-success">{filledOrders.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Orders</CardDescription>
            <CardTitle className="text-2xl text-warning">{pendingOrders.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No orders"
          description="You haven't placed any orders yet. Create a strategy to start trading."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>
              Last {orders.length} order{orders.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty/Notional</TableHead>
                    <TableHead className="text-right">Filled Qty</TableHead>
                    <TableHead className="text-right">Filled Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const isBuy = order.side === "buy";

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isBuy ? (
                              <ArrowUpRight className="h-4 w-4 text-success" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-destructive" />
                            )}
                            {order.symbol}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isBuy ? "success" : "destructive"}>
                            {order.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{order.type}</TableCell>
                        <TableCell className="text-right">
                          {parseFloat(order.qty).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.filled_qty ? parseFloat(order.filled_qty).toFixed(4) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          -
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(order.status) as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}>
                            {order.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(order.submitted_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
