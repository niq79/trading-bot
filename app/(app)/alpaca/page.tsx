import { PageHeader } from "@/components/shared/page-header";
import { ConnectionForm } from "@/components/alpaca/connection-form";

export default function AlpacaPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Alpaca Connection"
        description="Connect your Alpaca paper trading account to enable automated trading"
      />
      <ConnectionForm />
    </div>
  );
}
