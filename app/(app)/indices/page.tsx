import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { IndexList } from "@/components/indices/index-list";

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
        <IndexList indices={indices} />
      )}
    </div>
  );
}
