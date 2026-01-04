import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/portfolio-settings
 * Fetch user's portfolio sharing settings
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: settings, error } = await supabase
    .from("user_portfolio_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found" error, which is okay
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: settings || null });
}

/**
 * POST /api/portfolio-settings
 * Update user's portfolio sharing settings
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      visibility,
      public_username,
      show_strategies,
      show_performance,
      custom_title,
      custom_description,
    } = body;

    // Validate visibility
    if (!["private", "public_anonymous", "public_full"].includes(visibility)) {
      return NextResponse.json(
        { error: "Invalid visibility value" },
        { status: 400 }
      );
    }

    // Validate public_username format (alphanumeric, hyphens, underscores only)
    if (public_username) {
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(public_username)) {
        return NextResponse.json(
          { error: "Username can only contain letters, numbers, hyphens, and underscores" },
          { status: 400 }
        );
      }

      // Check if username is already taken by another user
      const { data: existingUser } = await supabase
        .from("user_portfolio_settings")
        .select("user_id")
        .eq("public_username", public_username)
        .single();

      if (existingUser && existingUser.user_id !== user.id) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 }
        );
      }
    }

    // Upsert settings
    const { error } = await supabase
      .from("user_portfolio_settings")
      .upsert(
        {
          user_id: user.id,
          visibility,
          public_username: visibility !== "private" ? public_username : null,
          show_strategies: show_strategies ?? true,
          show_performance: show_performance ?? true,
          custom_title,
          custom_description,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
