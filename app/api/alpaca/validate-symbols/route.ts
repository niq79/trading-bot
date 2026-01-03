import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { decrypt } from "@/lib/utils/crypto";

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
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: "Symbols array is required" },
        { status: 400 }
      );
    }

    // Get user's Alpaca credentials
    const { data: credentials } = (await supabase
      .from("alpaca_credentials")
      .select("*")
      .eq("user_id", user.id)
      .single()) as {
      data: {
        api_key_encrypted: string;
        api_secret_encrypted: string;
        is_paper: boolean;
      } | null;
    };

    if (!credentials) {
      return NextResponse.json(
        { error: "Alpaca credentials not found. Please connect your Alpaca account first." },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const apiKey = await decrypt(credentials.api_key_encrypted);
    const apiSecret = await decrypt(credentials.api_secret_encrypted);

    // Create Alpaca client
    const alpacaClient = new AlpacaClient({
      apiKey,
      apiSecret,
      paper: credentials.is_paper,
    });

    // Validate symbols
    const validSymbols = await alpacaClient.validateSymbols(symbols);
    const invalidSymbols = symbols.filter(
      (symbol) => !validSymbols.includes(symbol)
    );

    return NextResponse.json({
      validSymbols,
      invalidSymbols,
      total: symbols.length,
      valid: validSymbols.length,
      invalid: invalidSymbols.length,
    });
  } catch (error) {
    console.error("Error in POST /api/alpaca/validate-symbols:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
