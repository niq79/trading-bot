import { NextResponse } from "next/server";
import { fetchFearGreedIndex, fetchSignal } from "@/lib/signals/fetcher";
import { createClient } from "@/lib/supabase/server";
import { SignalSource } from "@/types/signal";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");

    // If no source specified, return Fear & Greed index
    if (!sourceId || sourceId === "fear_greed_crypto") {
      const result = await fetchFearGreedIndex();
      return NextResponse.json(result);
    }

    // Fetch custom signal source
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get signal source (either user's or global)
    const { data: source } = await supabase
      .from("signal_sources")
      .select("*")
      .eq("id", sourceId)
      .or(`user_id.eq.${user.id},is_global.eq.true`)
      .single();

    if (!source) {
      return NextResponse.json(
        { error: "Signal source not found" },
        { status: 404 }
      );
    }

    const typedSource = source as SignalSource;
    const result = await fetchSignal(typedSource.type, typedSource.config_json);

    // Store reading in database
    await supabase.from("signal_readings").insert({
      source_id: sourceId,
      user_id: user.id,
      value: result.value,
      raw_response: result.raw,
      fetched_at: result.fetchedAt,
    } as any);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching signal:", error);
    return NextResponse.json(
      { error: "Failed to fetch signal" },
      { status: 500 }
    );
  }
}
