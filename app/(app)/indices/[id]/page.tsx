import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SyntheticIndexForm } from "@/components/indices/index-form";

interface SyntheticIndex {
  id: string;
  user_id: string;
  name: string;
  components: string[];
  weights: number[] | null;
  created_at: string;
}

interface EditIndexPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIndexPage({
  params,
}: EditIndexPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: index } = (await supabase
    .from("synthetic_indices")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()) as { data: SyntheticIndex | null };

  if (!index) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Edit Synthetic Index"
        description="Update your custom composite index configuration"
      />
      <SyntheticIndexForm mode="edit" index={index} />
    </div>
  );
}
