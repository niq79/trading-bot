import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LineChart, Plus, Settings } from "lucide-react";
import { Strategy, StrategyParams, UniverseConfig, PREDEFINED_LISTS, RANKING_METRICS } from "@/types/strategy";

export default async function StrategiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: strategies } = await supabase
    .from("strategies")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const typedStrategies = strategies as Strategy[] | null;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Strategies"
        description="Create and manage your trading strategies"
        action={
          <Button asChild>
            <Link href="/strategies/new">
              <Plus className="mr-2 h-4 w-4" />
              New Strategy
            </Link>
          </Button>
        }
      />

      {!typedStrategies || typedStrategies.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No strategies yet"
          description="Create your first trading strategy to get started with automated trading."
          action={
            <Button asChild>
              <Link href="/strategies/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Strategy
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {typedStrategies.map((strategy) => {
            const params = strategy.params_json as StrategyParams;
            const universe = strategy.universe_config_json as UniverseConfig;
            const listLabel =
              universe.type === "predefined"
                ? PREDEFINED_LISTS.find((l) => l.value === universe.predefined_list)?.label
                : universe.type === "custom"
                ? `${universe.custom_symbols?.length ?? 0} symbols`
                : "Synthetic";
            const metricLabel = RANKING_METRICS.find(
              (m) => m.value === params.ranking_metric
            )?.label;

            return (
              <Card key={strategy.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{strategy.name}</CardTitle>
                      <CardDescription>
                        {strategy.allocation_pct}% allocation • {listLabel}
                      </CardDescription>
                    </div>
                    <Badge variant={strategy.is_enabled ? "success" : "secondary"}>
                      {strategy.is_enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Metric</p>
                        <p className="font-medium">{metricLabel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lookback</p>
                        <p className="font-medium">{params.lookback_days} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Positions</p>
                        <p className="font-medium">
                          {params.long_n} long
                          {params.short_n > 0 && `, ${params.short_n} short`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rebalance</p>
                        <p className="font-medium">
                          {(params.rebalance_fraction * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={strategy.is_enabled}
                          disabled
                          className="scale-75"
                        />
                        <span className="text-sm text-muted-foreground">
                          {strategy.is_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/app/strategies/${strategy.id}`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
