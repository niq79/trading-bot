import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: index, error } = await supabase
      .from("synthetic_indices")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error || !index) {
      return NextResponse.json({ error: "Index not found" }, { status: 404 });
    }

    return NextResponse.json({ index });
  } catch (error) {
    console.error("Error in GET /api/indices/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .update({
        name,
        components,
        weights: weights || null,
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !index) {
      console.error("Error updating index:", error);
      return NextResponse.json(
        { error: "Failed to update index" },
        { status: 500 }
      );
    }

    return NextResponse.json({ index });
  } catch (error) {
    console.error("Error in PATCH /api/indices/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("synthetic_indices")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting index:", error);
      return NextResponse.json(
        { error: "Failed to delete index" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/indices/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
