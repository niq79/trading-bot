import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";

/**
 * GET /api/public/portfolio/[username]
 * Public endpoint to view a user's portfolio
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const supabase = await createServiceClient();
  const { username } = await params;

  try {
    // Get portfolio settings by public username
    const { data: settings, error: settingsError } = await supabase
      .from("user_portfolio_settings")
      .select("*")
      .eq("public_username", username)
      .single() as { data: any; error: any };

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Portfolio not found or not public" },
        { status: 404 }
      );
    }

    // Check if portfolio is public
    if (settings.visibility === "private") {
      return NextResponse.json(
        { error: "This portfolio is private" },
        { status: 403 }
      );
    }

    const userId = settings.user_id;
    const showDollarAmounts = settings.visibility === "public_full";

    // Get user's email for display name fallback
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const displayName = settings.custom_title || userData?.user?.email?.split("@")[0] || username;

    // Get Alpaca credentials
    const { data: credentials } = await supabase
      .from("alpaca_credentials")
      .select("*")
      .eq("user_id", userId)
      .single() as { data: { api_key_encrypted: string; api_secret_encrypted: string } | null };

    if (!credentials) {
      return NextResponse.json(
        { error: "Portfolio data unavailable" },
        { status: 500 }
      );
    }

    // Decrypt and create Alpaca client
    const apiKey = await decrypt(credentials.api_key_encrypted);
    const apiSecret = await decrypt(credentials.api_secret_encrypted);
    const alpacaClient = new AlpacaClient({ apiKey, apiSecret, paper: true });

    // Fetch account and positions
    const [account, positions] = await Promise.all([
      alpacaClient.getAccount(),
      alpacaClient.getPositions(),
    ]);

    const totalEquity = parseFloat(account.equity);
    const portfolioValue = parseFloat((account as any).long_market_value || '0');

    // Format positions based on privacy level
    const formattedPositions = positions.map((p) => {
      const marketValue = parseFloat(p.market_value);
      const unrealizedPL = parseFloat(p.unrealized_pl);
      const unrealizedPLPercent = parseFloat(p.unrealized_plpc) * 100;

      return {
        symbol: p.symbol,
        side: p.side,
        qty: showDollarAmounts ? parseFloat(p.qty) : null,
        weight: ((marketValue / totalEquity) * 100).toFixed(2),
        marketValue: showDollarAmounts ? marketValue : null,
        unrealizedPL: showDollarAmounts ? unrealizedPL : null,
        unrealizedPLPercent: unrealizedPLPercent.toFixed(2),
      };
    });

    // Get active strategies if enabled
    let strategies: any[] = [];
    if (settings.show_strategies) {
      const serviceSupabase = await createServiceClient();
      const { data: strategiesData, error: strategiesError } = await serviceSupabase
        .from("strategies")
        .select("id, name, params")
        .eq("user_id", userId)
        .eq("is_enabled", true) as { data: any[] | null; error: any };

      console.log('Strategies query result:', {
        userId,
        count: strategiesData?.length || 0,
        error: strategiesError,
        showStrategies: settings.show_strategies
      });

      strategies = (strategiesData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        universe: s.params?.universe?.type || "unknown",
        longPositions: s.params?.execution?.top_n || 0,
        shortPositions: s.params?.execution?.short_n || 0,
      }));
    }

    // Calculate performance metrics if enabled
    let performance = null;
    if (settings.show_performance) {
      const lastEquity = parseFloat(account.last_equity);
      const dayPL = totalEquity - lastEquity;
      const dayPLPercent = ((dayPL / lastEquity) * 100).toFixed(2);

      performance = {
        totalEquity: showDollarAmounts ? totalEquity : null,
        portfolioValue: showDollarAmounts ? portfolioValue : null,
        dayPL: showDollarAmounts ? dayPL : null,
        dayPLPercent,
      };
    }

    return NextResponse.json({
      username,
      displayName,
      description: settings.custom_description || null,
      visibility: settings.visibility,
      positions: formattedPositions,
      strategies,
      performance,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching public portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio data" },
      { status: 500 }
    );
  }
}
