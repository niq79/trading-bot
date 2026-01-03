import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
import { History, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface StrategyRun {
  id: string;
  ran_at: string;
  strategies_run: number;
  orders_placed: number;
  status: string;
  log: string | null;
}

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch run history
  const { data: runs } = await supabase
    .from("strategy_runs")
    .select("*")
    .eq("user_id", user.id)
    .order("ran_at", { ascending: false })
    .limit(50) as { data: StrategyRun[] | null };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "success":
        return "success";
      case "partial":
        return "warning";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const totalRuns = runs?.length || 0;
  const successfulRuns = runs?.filter((r) => r.status === "success").length || 0;
  const totalOrders = runs?.reduce((sum, r) => sum + (r.orders_placed || 0), 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Run History"
        description="View past strategy execution runs"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Runs</CardDescription>
            <CardTitle className="text-2xl">{totalRuns}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Successful Runs</CardDescription>
            <CardTitle className="text-2xl text-success">{successfulRuns}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders Placed</CardDescription>
            <CardTitle className="text-2xl">{totalOrders}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* History Table */}
      {!runs || runs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No run history"
          description="Strategy runs will appear here after your first scheduled execution."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
            <CardDescription>
              Last {runs.length} run{runs.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Strategies</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run: StrategyRun) => {
                    const runDate = new Date(run.ran_at);
                    let logData: { errors?: string[] } | null = null;
                    try {
                      logData = run.log ? JSON.parse(run.log) : null;
                    } catch {
                      // Invalid JSON
                    }

                    return (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">
                          {runDate.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {runDate.toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <Badge variant={getStatusVariant(run.status) as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}>
                              {run.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {run.strategies_run}
                        </TableCell>
                        <TableCell className="text-right">
                          {run.orders_placed}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {logData?.errors && logData.errors.length > 0
                            ? logData.errors.join(", ")
                            : "No errors"}
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
