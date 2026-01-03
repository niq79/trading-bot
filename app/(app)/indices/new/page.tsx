import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SyntheticIndexForm } from "@/components/indices/index-form";

export default async function NewIndexPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Create Synthetic Index"
        description="Combine multiple symbols into a custom composite index"
      />
      <SyntheticIndexForm mode="create" />
    </div>
  );
}
