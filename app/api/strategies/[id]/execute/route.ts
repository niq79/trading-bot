import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";
import { executeStrategy, StrategyConfig } from "@/lib/engine/executor";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get strategy
    const { data: strategy } = (await supabase
      .from("strategies")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()) as {
      data: {
        id: string;
        name: string;
        allocation_pct: number;
        is_enabled: boolean;
        params_json: Record<string, unknown>;
        universe_config_json: Record<string, unknown>;
      } | null;
    };

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    // Check if strategy is enabled
    if (!strategy.is_enabled) {
      return NextResponse.json(
        { error: "Strategy is disabled. Enable it before executing." },
        { status: 400 }
      );
    }

    // Get Alpaca credentials
    const { data: credentials } = (await supabase
      .from("alpaca_credentials")
      .select("*")
      .eq("user_id", user.id)
      .single()) as { data: { api_key_encrypted: string; api_secret_encrypted: string } | null };

    if (!credentials) {
      return NextResponse.json(
        { error: "No Alpaca credentials found. Connect your Alpaca account first." },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const apiKey = await decrypt(credentials.api_key_encrypted);
    const apiSecret = await decrypt(credentials.api_secret_encrypted);

    // Create Alpaca client
    const alpacaClient = new AlpacaClient({ apiKey, apiSecret, paper: true });

    // Execute strategy using unified executor
    const strategyConfig: StrategyConfig = {
      id: strategy.id,
      name: strategy.name,
      user_id: user.id,
      allocation_pct: strategy.allocation_pct,
      params_json: strategy.params_json as StrategyConfig['params_json'],
      universe_config_json: strategy.universe_config_json as StrategyConfig['universe_config_json'],
    };

    const result = await executeStrategy(
      strategyConfig,
      alpacaClient,
      supabase,
      {
        dryRun: false,
        recordOwnership: true,
        trigger: "manual",
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Return results
    return NextResponse.json({
      success: true,
      ordersPlaced: result.ordersPlaced,
      ordersFailed: result.ordersFailed,
      marketStatus: result.details.marketStatus,
      summary: {
        totalOrders: result.details.orderResults.length,
        successful: result.ordersPlaced,
        failed: result.ordersFailed,
        totalBuyValue: result.details.totalBuyValue,
        totalSellValue: result.details.totalSellValue,
        netChange: result.details.netChange,
        estimatedFees: result.details.estimatedFees,
      },
      orderResults: result.details.orderResults,
      feeBreakdown: result.details.orderResults
        .filter(o => o.symbol.includes('/')) // Only crypto has fees
        .map(o => ({
          symbol: o.symbol,
          fee: o.notional * 0.002, // 20 bps
        }))
        .filter(f => f.fee > 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error executing strategy:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
