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
import { Plus, TrendingUp, Trash2 } from "lucide-react";

interface SyntheticIndex {
  id: string;
  user_id: string;
  name: string;
  components: string[];
  weights: number[] | null;
  created_at: string;
}

export default async function IndicesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: indices } = (await supabase
    .from("synthetic_indices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as { data: SyntheticIndex[] | null };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Synthetic Indices"
        description="Create custom composite indices from multiple symbols"
        action={
          <Button asChild>
            <Link href="/indices/new">
              <Plus className="mr-2 h-4 w-4" />
              New Index
            </Link>
          </Button>
        }
      />

      {!indices || indices.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No synthetic indices yet"
          description="Create a custom index by combining multiple symbols with optional weights."
          action={
            <Button asChild>
              <Link href="/indices/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Index
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {indices.map((index) => {
            const hasWeights = index.weights && index.weights.length > 0;
            const isEqualWeight = !hasWeights;

            return (
              <Card key={index.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{index.name}</CardTitle>
                      <CardDescription>
                        {index.components.length} components
                      </CardDescription>
                    </div>
                    <Badge variant={isEqualWeight ? "secondary" : "default"}>
                      {isEqualWeight ? "Equal Weight" : "Custom Weights"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Components:</p>
                      <div className="flex flex-wrap gap-1">
                        {index.components.slice(0, 8).map((symbol, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {symbol}
                            {hasWeights && index.weights[i] && (
                              <span className="ml-1 text-muted-foreground">
                                {(index.weights[i] * 100).toFixed(0)}%
                              </span>
                            )}
                          </Badge>
                        ))}
                        {index.components.length > 8 && (
                          <Badge variant="outline" className="text-xs">
                            +{index.components.length - 8} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={`/indices/${index.id}`}>Edit</Link>
                      </Button>
                      <form action={`/api/indices/${index.id}`} method="POST">
                        <input type="hidden" name="_method" value="DELETE" />
                        <Button
                          variant="outline"
                          size="sm"
                          type="submit"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
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
