import { PageHeader } from "@/components/shared/page-header";
import { StrategyForm } from "@/components/strategies/strategy-form";

export default function NewStrategyPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Create Strategy"
        description="Configure a new trading strategy"
      />
      <StrategyForm mode="create" />
    </div>
  );
}
