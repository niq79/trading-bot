import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";

const CRYPTO_SYMBOLS = [
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'XRP/USD',
  'AVAX/USD', 'DOT/USD', 'LINK/USD', 'UNI/USD', 'LTC/USD',
];

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

    const results: Array<{
      symbol: string;
      hasData: boolean;
      dataPoints: number;
      error?: string;
      lastClose?: number;
      dateRange?: string;
    }> = [];

    // Check each crypto symbol
    for (const symbol of CRYPTO_SYMBOLS) {
      try {
        const bars = await alpacaClient.getBars(symbol, {
          timeframe: '1Day',
          limit: 30,
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
      summary: {
        total: CRYPTO_SYMBOLS.length,
        available: available.length,
        unavailable: unavailable.length,
        percentage: Math.round((available.length / CRYPTO_SYMBOLS.length) * 100),
      },
      symbols: results,
      recommendations: generateRecommendations(available, unavailable),
    });
  } catch (error) {
    console.error("Error checking crypto data:", error);
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
  available: Array<{ symbol: string; dataPoints: number }>,
  unavailable: Array<{ symbol: string; error?: string }>
): string[] {
  const recommendations: string[] = [];

  if (available.length < 3) {
    recommendations.push(
      "⚠️ Very limited crypto data available. Consider using stock universes (Mag7, Dow30) which have reliable data."
    );
    recommendations.push(
      "Your Alpaca paper account may be new. Crypto data may populate over the next 24-48 hours."
    );
    recommendations.push(
      "Contact Alpaca support to verify crypto trading access for your account region."
    );
  } else if (available.length < 10) {
    recommendations.push(
      `✅ ${available.length} crypto symbols have data. Create a Custom Universe with: ${available.map(r => r.symbol).join(', ')}`
    );
    recommendations.push(
      `Set "Long Positions" to ${available.length} or less in your strategy configuration.`
    );
    recommendations.push(
      "Some symbols may become available over time. Check again in 24 hours."
    );
  } else {
    recommendations.push(
      "✅ All crypto symbols have sufficient data! Your crypto strategies should work as expected."
    );
    recommendations.push(
      `You can confidently set "Long Positions" up to ${available.length} in crypto strategies.`
    );
  }

  return recommendations;
}
