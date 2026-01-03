import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StrategyForm } from "@/components/strategies/strategy-form";
import { Strategy } from "@/types/strategy";

interface StrategyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StrategyDetailPage({
  params,
}: StrategyDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: strategy } = (await supabase
    .from("strategies")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()) as { data: Strategy | null };

  if (!strategy) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Edit Strategy"
        description={`Configure ${strategy.name}`}
      />
      <StrategyForm strategy={strategy} mode="edit" />
    </div>
  );
}
