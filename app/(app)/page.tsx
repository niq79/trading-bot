import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { NextRunTime } from "@/components/shared/next-run-time";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has Alpaca credentials
  const { data: alpacaCredentials } = await supabase
    .from("alpaca_credentials")
    .select("id, created_at")
    .eq("user_id", user.id)
    .single();

  // Get strategies count
  const { count: strategiesCount } = await supabase
    .from("strategies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get recent runs
  const { data: recentRuns } = (await supabase
    .from("strategy_runs")
    .select("id, ran_at, status")
    .eq("user_id", user.id)
    .order("ran_at", { ascending: false })
    .limit(5)) as { data: Array<{ id: string; ran_at: string; status: string }> | null };

  const hasAlpacaConnected = !!alpacaCredentials;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your trading bot activity"
      />

      {!hasAlpacaConnected && (
        <Card className="border-warning bg-warning/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg">Connect Your Alpaca Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To start trading, you need to connect your Alpaca paper trading account.
            </p>
            <Button asChild>
              <Link href="/alpaca">
                Connect Alpaca
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasAlpacaConnected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Alpaca Paper Trading
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategiesCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Trading strategies configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Runs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentRuns?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Strategy executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Run</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <NextRunTime />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to manage your trading bot</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/strategies/new">
                <LineChart className="mr-2 h-4 w-4" />
                Create New Strategy
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/signals">
                <Activity className="mr-2 h-4 w-4" />
                Configure Signal Sources
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/positions">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Positions
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest strategy run results</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRuns && recentRuns.length > 0 ? (
              <div className="space-y-2">
                {recentRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Strategy Run</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(run.ran_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={run.status === "success" ? "success" : "secondary"}
                    >
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity. Create a strategy to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
