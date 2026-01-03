import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StrategyForm } from "@/components/strategies/strategy-form";
import { TestRunButton } from "@/components/strategies/test-run-button";
import { Strategy } from "@/types/strategy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        title={strategy.name}
        description="Configure and test your trading strategy"
      />
      
      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="test">Test Run</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="mt-6">
          <StrategyForm strategy={strategy} mode="edit" />
        </TabsContent>
        
        <TabsContent value="test" className="mt-6">
          <TestRunButton strategyId={strategy.id} strategyName={strategy.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
