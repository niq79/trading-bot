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

    const { data: indices, error } = await supabase
      .from("synthetic_indices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching indices:", error);
      return NextResponse.json(
        { error: "Failed to fetch indices" },
        { status: 500 }
      );
    }

    return NextResponse.json({ indices });
  } catch (error) {
    console.error("Error in GET /api/indices:", error);
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
    const { name, components, weights } = body;

    if (!name || !components || components.length === 0) {
      return NextResponse.json(
        { error: "Name and components are required" },
        { status: 400 }
      );
    }

    // Validate components are strings
    if (!Array.isArray(components) || !components.every((c) => typeof c === "string")) {
      return NextResponse.json(
        { error: "Components must be an array of strings" },
        { status: 400 }
      );
    }

    // Validate weights if provided
    if (weights !== null && weights !== undefined) {
      if (!Array.isArray(weights) || weights.length !== components.length) {
        return NextResponse.json(
          { error: "Weights must match components length" },
          { status: 400 }
        );
      }
      if (!weights.every((w) => typeof w === "number" && w >= 0)) {
        return NextResponse.json(
          { error: "All weights must be non-negative numbers" },
          { status: 400 }
        );
      }
    }

    const { data: index, error } = await supabase
      .from("synthetic_indices")
      .insert({
        user_id: user.id,
        name,
        components,
        weights: weights || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating index:", error);
      return NextResponse.json(
        { error: "Failed to create index" },
        { status: 500 }
      );
    }

    return NextResponse.json({ index }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/indices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
