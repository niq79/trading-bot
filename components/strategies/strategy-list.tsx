"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Settings, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Strategy, StrategyParams, UniverseConfig, PREDEFINED_LISTS, RANKING_METRICS } from "@/types/strategy";

interface StrategyListProps {
  strategies: Strategy[];
}

export function StrategyList({ strategies }: StrategyListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this strategy?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/strategies/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete strategy");
      }

      toast.success("Strategy deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("Error deleting strategy:", error);
      toast.error("Failed to delete strategy");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {strategies.map((strategy) => {
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
                <div className="flex justify-between items-center pt-2 border-t gap-2">
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
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/strategies/${strategy.id}`}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(strategy.id)}
                      disabled={deletingId === strategy.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === strategy.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
