import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SignalSource } from "@/types/signal";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { BUILTIN_SIGNAL_SOURCES } from "@/types/signal";
import { fetchFearGreedIndex, getFearGreedClassification } from "@/lib/signals/fetcher";

export default async function SignalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's custom signal sources
  const { data: customSources } = (await supabase
    .from("signal_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as { data: SignalSource[] | null };

  // Fetch current Fear & Greed value
  let fearGreedValue: number | null = null;
  let fearGreedClassification: string | null = null;

  try {
    const result = await fetchFearGreedIndex();
    fearGreedValue = result.value;
    fearGreedClassification = getFearGreedClassification(result.value);
  } catch (error) {
    console.error("Failed to fetch Fear & Greed:", error);
  }

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "Extreme Fear":
        return "destructive";
      case "Fear":
        return "warning";
      case "Neutral":
        return "secondary";
      case "Greed":
        return "success";
      case "Extreme Greed":
        return "success";
      default:
        return "secondary";
    }
  };

  const getClassificationIcon = (classification: string) => {
    if (classification.includes("Fear")) return TrendingDown;
    if (classification.includes("Greed")) return TrendingUp;
    return Minus;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Signal Sources"
        description="Configure external data sources for strategy conditions"
        action={
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Custom Source
          </Button>
        }
      />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Built-in Sources</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_SIGNAL_SOURCES.map((source) => {
            const Icon =
              fearGreedClassification
                ? getClassificationIcon(fearGreedClassification)
                : Activity;

            return (
              <Card key={source.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                      <CardDescription>{source.type.toUpperCase()}</CardDescription>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {source.description}
                  </p>

                  {fearGreedValue !== null && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <span className="text-2xl font-bold">{fearGreedValue}</span>
                      </div>
                      {fearGreedClassification && (
                        <Badge
                          variant={getClassificationColor(fearGreedClassification) as "destructive" | "secondary" | "success" | "warning" | "default" | "outline" | null | undefined}
                        >
                          {fearGreedClassification}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <p>
                      <strong>Endpoint:</strong>{" "}
                      <code className="text-xs">{source.config_json.url}</code>
                    </p>
                    <p>
                      <strong>JSONPath:</strong>{" "}
                      <code className="text-xs">{source.config_json.jsonpath}</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Custom Sources</h2>

        {!customSources || customSources.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No custom signal sources"
            description="Add custom API or scraper-based signal sources to use in your strategies."
            action={
              <Button disabled>
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Source
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customSources.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <CardTitle>{source.name}</CardTitle>
                  <CardDescription>{source.type}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
