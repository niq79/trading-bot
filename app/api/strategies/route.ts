import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: strategies, error } = await supabase
      .from("strategies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching strategies:", error);
      return NextResponse.json(
        { error: "Failed to fetch strategies" },
        { status: 500 }
      );
    }

    return NextResponse.json({ strategies });
  } catch (error) {
    console.error("Error in GET /api/strategies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      allocation_pct,
      rebalance_fraction,
      params_json,
      signal_conditions_json,
      universe_type,
      universe_config_json,
      is_enabled = false,
    } = body;

    if (!name || !allocation_pct || !params_json || !universe_config_json) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data: strategy, error} = await supabase
      .from("strategies")
      // @ts-expect-error - TODO: Update database types
      .insert({
        user_id: user.id,
        name,
        allocation_pct,
        rebalance_fraction: rebalance_fraction ?? 0.25,
        params_json,
        signal_conditions_json: signal_conditions_json ?? null,
        universe_type: universe_type ?? "predefined",
        universe_config_json,
        is_enabled,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating strategy:", error);
      return NextResponse.json(
        { error: "Failed to create strategy" },
        { status: 500 }
      );
    }

    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/strategies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
