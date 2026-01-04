import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";

// Check multiple universes
const STOCK_UNIVERSES = {
  mag7: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"],
  dow30: [
    "AAPL", "AMGN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS", "DOW",
    "GS", "HD", "HON", "IBM", "INTC", "JNJ", "JPM", "KO", "MCD", "MMM",
    "MRK", "MSFT", "NKE", "PG", "TRV", "UNH", "V", "VZ", "WBA", "WMT",
  ],
  nasdaq_top10: [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "COST", "ADBE",
  ],
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: credentials } = await supabase
      .from('alpaca_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single() as { data: { api_key_encrypted: string; api_secret_encrypted: string } | null };

    if (!credentials) {
      return NextResponse.json(
        { error: "No Alpaca credentials found" },
        { status: 400 }
      );
    }

    const apiKey = await decrypt(credentials.api_key_encrypted);
    const apiSecret = await decrypt(credentials.api_secret_encrypted);
    const alpacaClient = new AlpacaClient({ apiKey, apiSecret, paper: true });

    // Get universe to check from query param, default to mag7
    const url = new URL(request.url);
    const universeParam = url.searchParams.get('universe') || 'mag7';
    const symbols = STOCK_UNIVERSES[universeParam as keyof typeof STOCK_UNIVERSES] || STOCK_UNIVERSES.mag7;

    const results: Array<{
      symbol: string;
      hasData: boolean;
      dataPoints: number;
      error?: string;
      lastClose?: number;
      dateRange?: string;
    }> = [];

    // Check each stock symbol
    for (const symbol of symbols) {
      try {
        const bars = await alpacaClient.getBars(symbol, {
          timeframe: '1Day',
          limit: 60, // Try to get 60 days
        });

        const hasEnoughData = bars.length >= 5;
        const lastBar = bars[bars.length - 1];
        const firstBar = bars[0];
        
        results.push({
          symbol,
          hasData: hasEnoughData,
          dataPoints: bars.length,
          lastClose: lastBar?.c,
          dateRange: bars.length > 0 
            ? `${firstBar.t.split('T')[0]} to ${lastBar.t.split('T')[0]}`
            : undefined,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          symbol,
          hasData: false,
          dataPoints: 0,
          error: errorMsg,
        });
      }
    }

    const available = results.filter(r => r.hasData);
    const unavailable = results.filter(r => !r.hasData);

    return NextResponse.json({
      success: true,
      universe: universeParam,
      summary: {
        total: symbols.length,
        available: available.length,
        unavailable: unavailable.length,
        percentage: Math.round((available.length / symbols.length) * 100),
      },
      symbols: results,
      recommendations: generateRecommendations(universeParam, available, unavailable),
    });
  } catch (error) {
    console.error("Error checking stock data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  universe: string,
  available: Array<{ symbol: string; dataPoints: number }>,
  unavailable: Array<{ symbol: string; error?: string }>
): string[] {
  const recommendations: string[] = [];
  const percentage = (available.length / (available.length + unavailable.length)) * 100;

  if (percentage < 50) {
    recommendations.push(
      "⚠️ Very limited stock data available in your Alpaca paper account."
    );
    recommendations.push(
      "Your account is likely new. Stock data typically populates within 24-48 hours after account creation."
    );
    recommendations.push(
      "Try crypto strategies instead - crypto data is usually available immediately."
    );
  } else if (percentage < 100) {
    recommendations.push(
      `✅ ${available.length}/${available.length + unavailable.length} symbols in ${universe.toUpperCase()} have data.`
    );
    recommendations.push(
      `Create a Custom Universe with these working symbols: ${available.slice(0, 10).map(r => r.symbol).join(', ')}${available.length > 10 ? '...' : ''}`
    );
    recommendations.push(
      `Or adjust "Long Positions" to ${available.length} or less.`
    );
    recommendations.push(
      "Missing symbols may become available over time. Check again in 24 hours."
    );
  } else {
    recommendations.push(
      `✅ All symbols in ${universe.toUpperCase()} have sufficient data!`
    );
    recommendations.push(
      `You can confidently use this universe with up to ${available.length} positions.`
    );
    recommendations.push(
      "Your stock strategies should work as expected."
    );
  }

  if (universe !== 'mag7' && percentage < 100) {
    recommendations.push(
      "💡 Try checking Mag7 (7 symbols) - these mega-cap stocks usually have data first."
    );
  }

  return recommendations;
}
