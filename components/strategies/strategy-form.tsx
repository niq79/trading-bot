"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Strategy,
  CreateStrategyInput,
  DEFAULT_STRATEGY_PARAMS,
  DEFAULT_UNIVERSE_CONFIG,
  PREDEFINED_LISTS,
  RANKING_METRICS,
  StrategyParams,
  UniverseConfig,
} from "@/types/strategy";

interface SyntheticIndex {
  id: string;
  name: string;
  components: string[];
}

interface TemplateConfig {
  name: string;
  universe: string;
  ranking: string;
  topN: number;
  rebalance: number;
}

interface StrategyFormProps {
  strategy?: Strategy;
  mode: "create" | "edit";
  templateConfig?: TemplateConfig;
}

export function StrategyForm({ strategy, mode, templateConfig }: StrategyFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Build initial values from template if provided
  const initialParams: StrategyParams = templateConfig
    ? {
        ...DEFAULT_STRATEGY_PARAMS,
        long_n: templateConfig.topN,
        rebalance_fraction: templateConfig.rebalance,
        ranking_metric: templateConfig.ranking as StrategyParams["ranking_metric"],
      }
    : ((strategy?.params_json as StrategyParams) ?? DEFAULT_STRATEGY_PARAMS);

  const initialUniverse: UniverseConfig = templateConfig
    ? {
        type: "predefined",
        predefined_list: templateConfig.universe as UniverseConfig["predefined_list"],
      }
    : ((strategy?.universe_config_json as UniverseConfig) ?? DEFAULT_UNIVERSE_CONFIG);

  // Basic info
  const [name, setName] = useState(templateConfig?.name ?? strategy?.name ?? "");
  const [allocationPct, setAllocationPct] = useState(
    strategy?.allocation_pct ?? 10
  );
  const [isEnabled, setIsEnabled] = useState(strategy?.is_enabled ?? false);

  // Params
  const [params, setParams] = useState<StrategyParams>(initialParams);

  // Universe
  const [universeConfig, setUniverseConfig] = useState<UniverseConfig>(initialUniverse);
  const [customSymbols, setCustomSymbols] = useState(
    universeConfig.custom_symbols?.join(", ") ?? ""
  );

  // Synthetic Indices
  const [syntheticIndices, setSyntheticIndices] = useState<SyntheticIndex[]>([]);
  const [isLoadingIndices, setIsLoadingIndices] = useState(false);

  // Fetch synthetic indices when type is synthetic
  useEffect(() => {
    if (universeConfig.type === "synthetic") {
      setIsLoadingIndices(true);
      fetch("/api/indices")
        .then((res) => res.json())
        .then((data) => {
          setSyntheticIndices(data.indices || []);
        })
        .catch((err) => {
          console.error("Failed to fetch indices:", err);
          toast.error("Failed to load synthetic indices");
        })
        .finally(() => {
          setIsLoadingIndices(false);
        });
    }
  }, [universeConfig.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const finalUniverseConfig: UniverseConfig = {
        ...universeConfig,
        custom_symbols:
          universeConfig.type === "custom"
            ? customSymbols
                .split(",")
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean)
            : undefined,
      };

      const payload: CreateStrategyInput = {
        name,
        allocation_pct: allocationPct,
        rebalance_fraction: params.rebalance_fraction,
        params_json: params,
        universe_type: universeConfig.type,
        universe_config_json: finalUniverseConfig,
        is_enabled: isEnabled,
      };

      const url =
        mode === "create" ? "/api/strategies" : `/api/strategies/${strategy?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save strategy");
      }

      toast.success(
        mode === "create"
          ? "Strategy created successfully"
          : "Strategy updated successfully"
      );
      router.push("/strategies");
      router.refresh();
    } catch (error) {
      console.error("Error saving strategy:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save strategy"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="universe">Universe</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
              <CardDescription>
                Configure the name and allocation for this strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Strategy Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Momentum Strategy"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allocation">
                  Allocation (% of portfolio)
                </Label>
                <Input
                  id="allocation"
                  type="number"
                  min={1}
                  max={100}
                  value={allocationPct}
                  onChange={(e) => setAllocationPct(Number(e.target.value))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of your total account equity allocated to this strategy
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Strategy</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, this strategy will execute during daily runs
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="universe">
          <Card>
            <CardHeader>
              <CardTitle>Symbol Universe</CardTitle>
              <CardDescription>
                Define which symbols this strategy can trade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Universe Type</Label>
                <Select
                  value={universeConfig.type}
                  onValueChange={(value: "predefined" | "custom" | "synthetic") =>
                    setUniverseConfig({ ...universeConfig, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="predefined">Pre-defined List</SelectItem>
                    <SelectItem value="custom">Custom Symbols</SelectItem>
                    <SelectItem value="synthetic">Synthetic Index</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {universeConfig.type === "predefined" && (
                <div className="space-y-2">
                  <Label>Select List</Label>
                  <Select
                    value={universeConfig.predefined_list}
                    onValueChange={(value) =>
                      setUniverseConfig({
                        ...universeConfig,
                        predefined_list: value as UniverseConfig["predefined_list"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_LISTS.map((list) => (
                        <SelectItem key={list.value} value={list.value}>
                          {list.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {universeConfig.type === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="symbols">Custom Symbols</Label>
                  <Input
                    id="symbols"
                    value={customSymbols}
                    onChange={(e) => setCustomSymbols(e.target.value)}
                    placeholder="AAPL, GOOGL, MSFT, TSLA"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter symbols separated by commas
                  </p>
                </div>
              )}

              {universeConfig.type === "synthetic" && (
                <div className="space-y-2">
                  <Label>Synthetic Index</Label>
                  {isLoadingIndices ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading indices...
                    </div>
                  ) : syntheticIndices.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        No synthetic indices found.
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/indices/new">Create Synthetic Index</Link>
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={universeConfig.synthetic_index}
                      onValueChange={(value) =>
                        setUniverseConfig({
                          ...universeConfig,
                          synthetic_index: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a synthetic index" />
                      </SelectTrigger>
                      <SelectContent>
                        {syntheticIndices.map((index) => (
                          <SelectItem key={index.id} value={index.id}>
                            {index.name} ({index.components.length} symbols)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Parameters</CardTitle>
              <CardDescription>
                Configure how symbols are ranked and selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ranking Metric</Label>
                <Select
                  value={params.ranking_metric}
                  onValueChange={(value: StrategyParams["ranking_metric"]) =>
                    setParams({ ...params, ranking_metric: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKING_METRICS.map((metric) => (
                      <SelectItem key={metric.value} value={metric.value}>
                        {metric.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lookback">Lookback Period (days)</Label>
                <Input
                  id="lookback"
                  type="number"
                  min={1}
                  max={365}
                  value={params.lookback_days}
                  onChange={(e) =>
                    setParams({ ...params, lookback_days: Number(e.target.value) })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="longN">Long Positions</Label>
                  <Input
                    id="longN"
                    type="number"
                    min={1}
                    max={100}
                    value={params.long_n}
                    onChange={(e) =>
                      setParams({ ...params, long_n: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of top-ranked symbols to go long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortN">Short Positions</Label>
                  <Input
                    id="shortN"
                    type="number"
                    min={0}
                    max={100}
                    value={params.short_n}
                    onChange={(e) =>
                      setParams({ ...params, short_n: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of bottom-ranked symbols to short (0 = long only)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution">
          <Card>
            <CardHeader>
              <CardTitle>Execution Parameters</CardTitle>
              <CardDescription>
                Configure position sizing and rebalancing behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rebalanceFraction">
                  Rebalance Fraction (0.1 - 1.0)
                </Label>
                <Input
                  id="rebalanceFraction"
                  type="number"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={params.rebalance_fraction}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      rebalance_fraction: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Fraction of the difference to trade each run (0.25 = 25%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxWeight">Max Weight per Symbol</Label>
                <Input
                  id="maxWeight"
                  type="number"
                  min={0.01}
                  max={1}
                  step={0.01}
                  value={params.max_weight_per_symbol}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      max_weight_per_symbol: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Maximum allocation per symbol (0.1 = 10% of strategy capital)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightScheme">Weighting Scheme</Label>
                <Select
                  value={params.weight_scheme}
                  onValueChange={(value) =>
                    setParams({
                      ...params,
                      weight_scheme: value as "equal" | "score_weighted" | "inverse_volatility",
                    })
                  }
                >
                  <SelectTrigger id="weightScheme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equal Weight</SelectItem>
                    <SelectItem value="score_weighted">Score Weighted</SelectItem>
                    <SelectItem value="inverse_volatility">Inverse Volatility</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How to distribute capital among selected symbols
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashReserve">Cash Reserve (%)</Label>
                <Input
                  id="cashReserve"
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={(params.cash_reserve_pct * 100).toFixed(0)}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      cash_reserve_pct: Number(e.target.value) / 100,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of allocated capital to keep as cash (0-50%)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/strategies")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create Strategy" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
