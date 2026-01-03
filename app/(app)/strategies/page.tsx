import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { LineChart, Plus } from "lucide-react";
import { Strategy } from "@/types/strategy";
import { StrategyList } from "@/components/strategies/strategy-list";

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
        <StrategyList strategies={typedStrategies} />
      )}
    </div>
  );
}
