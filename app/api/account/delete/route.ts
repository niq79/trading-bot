import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service client to delete user data (bypasses RLS)
    const serviceClient = await createServiceClient();

    // Delete all user data in order (respecting foreign keys)
    // 1. Delete strategy runs
    await serviceClient
      .from("strategy_runs")
      .delete()
      .eq("user_id", user.id);

    // 2. Delete signal readings (via signal sources)
    const { data: signalSources } = await serviceClient
      .from("signal_sources")
      .select("id")
      .eq("user_id", user.id) as { data: { id: string }[] | null };

    if (signalSources && signalSources.length > 0) {
      const sourceIds = signalSources.map((s) => s.id);
      await serviceClient
        .from("signal_readings")
        .delete()
        .in("source_id", sourceIds);
    }

    // 3. Delete signal sources
    await serviceClient
      .from("signal_sources")
      .delete()
      .eq("user_id", user.id);

    // 4. Delete strategies
    await serviceClient
      .from("strategies")
      .delete()
      .eq("user_id", user.id);

    // 5. Delete synthetic indices
    await serviceClient
      .from("synthetic_indices")
      .delete()
      .eq("user_id", user.id);

    // 6. Delete Alpaca credentials
    await serviceClient
      .from("alpaca_credentials")
      .delete()
      .eq("user_id", user.id);

    // 7. Delete the user from Supabase Auth
    const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteUserError) {
      console.error("Error deleting user from auth:", deleteUserError);
      return NextResponse.json(
        { error: "Failed to delete user account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/account/delete:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
