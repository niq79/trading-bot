import { PageHeader } from "@/components/shared/page-header";
import { StrategyForm } from "@/components/strategies/strategy-form";

interface NewStrategyPageProps {
  searchParams: Promise<{
    template?: string;
    name?: string;
    universe?: string;
    ranking?: string;
    topN?: string;
    rebalance?: string;
  }>;
}

export default async function NewStrategyPage({ searchParams }: NewStrategyPageProps) {
  const params = await searchParams;
  
  // Build template config if params exist
  const templateConfig = params.template
    ? {
        name: params.name || "",
        universe: params.universe || "mag7",
        ranking: params.ranking || "momentum_20d",
        topN: parseInt(params.topN || "5", 10),
        rebalance: parseFloat(params.rebalance || "0.1"),
      }
    : undefined;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={params.template ? `Create Strategy: ${params.name}` : "Create Strategy"}
        description={
          params.template
            ? "Customize this template to fit your trading goals"
            : "Configure a new trading strategy"
        }
      />
      <StrategyForm mode="create" templateConfig={templateConfig} />
    </div>
  );
}
