"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, Cpu, LayoutGrid } from "lucide-react";

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  params: {
    universe: string;
    ranking: string;
    topN: number;
    rebalance: number;
  };
}

const templates: StrategyTemplate[] = [
  {
    id: "momentum-top5",
    name: "Momentum Top 5",
    description: "Hold the 5 stocks with the strongest 20-day momentum from the Magnificent 7",
    icon: TrendingUp,
    params: {
      universe: "mag7",
      ranking: "momentum_20d",
      topN: 5,
      rebalance: 0.1,
    },
  },
  {
    id: "low-volatility",
    name: "Low Volatility",
    description: "Hold the 10 least volatile stocks from the S&P 500 Top 50 for defensive exposure",
    icon: Shield,
    params: {
      universe: "sp500_top50",
      ranking: "volatility",
      topN: 10,
      rebalance: 0.05,
    },
  },
  {
    id: "tech-momentum",
    name: "Tech Momentum",
    description: "Hold the top 10 NASDAQ 100 stocks ranked by 60-day momentum for growth exposure",
    icon: Cpu,
    params: {
      universe: "nasdaq100_top50",
      ranking: "momentum_60d",
      topN: 10,
      rebalance: 0.1,
    },
  },
  {
    id: "diversified-dow",
    name: "Diversified Dow",
    description: "Hold all 30 Dow components with equal weight for broad blue-chip exposure",
    icon: LayoutGrid,
    params: {
      universe: "dow30",
      ranking: "momentum_5d",
      topN: 30,
      rebalance: 0.05,
    },
  },
];

export function StrategyTemplates() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Quick Start Templates</h2>
        <p className="text-sm text-muted-foreground">
          Click a template to start with pre-filled settings you can customize
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          // Build query params for the template
          const queryParams = new URLSearchParams({
            template: template.id,
            name: template.name,
            universe: template.params.universe,
            ranking: template.params.ranking,
            topN: template.params.topN.toString(),
            rebalance: template.params.rebalance.toString(),
          });

          return (
            <Link
              key={template.id}
              href={`/strategies/new?${queryParams.toString()}`}
            >
              <Card className="h-full cursor-pointer transition-colors hover:border-primary hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-xs">
                    {template.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {template.params.universe.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Top {template.params.topN}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
