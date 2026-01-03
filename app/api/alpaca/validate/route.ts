import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AlpacaClient } from "@/lib/alpaca/client";
import { encrypt } from "@/lib/utils/crypto";

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
    const { apiKey, apiSecret } = body;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "API key and secret are required" },
        { status: 400 }
      );
    }

    // Validate the credentials by connecting to Alpaca
    const client = new AlpacaClient({
      apiKey,
      apiSecret,
      paper: true, // Always paper trading for MVP
    });

    const isValid = await client.validateConnection();

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Alpaca credentials. Please check your API key and secret." },
        { status: 400 }
      );
    }

    // Get account info for response
    const account = await client.getAccount();

    // Encrypt credentials
    const encryptedApiKey = encrypt(apiKey);
    const encryptedApiSecret = encrypt(apiSecret);

    // Check if user already has credentials
    const { data: existingCreds } = await supabase
      .from("alpaca_credentials" as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingCreds) {
      // Update existing credentials
      const { error } = await supabase
        .from("alpaca_credentials")
        // @ts-expect-error - TODO: Update database types
        .update({
          api_key_encrypted: encryptedApiKey,
          api_secret_encrypted: encryptedApiSecret,
          is_paper: true,
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating credentials:", error);
        return NextResponse.json(
          { error: "Failed to update credentials" },
          { status: 500 }
        );
      }
    } else {
      // Insert new credentials
      const { error } = await supabase
        .from("alpaca_credentials")
        // @ts-expect-error - TODO: Update database types
        .insert({
          user_id: user.id,
          api_key_encrypted: encryptedApiKey,
          api_secret_encrypted: encryptedApiSecret,
          is_paper: true,
        });

      if (error) {
        console.error("Error inserting credentials:", error);
        return NextResponse.json(
          { error: "Failed to save credentials" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        account_number: account.account_number,
        status: account.status,
        buying_power: account.buying_power,
        equity: account.equity,
        cash: account.cash,
      },
    });
  } catch (error) {
    console.error("Error validating Alpaca credentials:", error);
    return NextResponse.json(
      { error: "Failed to validate credentials" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: credentials } = (await supabase
      .from("alpaca_credentials")
      .select("id, is_paper, created_at")
      .eq("user_id", user.id)
      .single()) as { data: { id: string; is_paper: boolean; created_at: string } | null };

    if (!credentials) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      is_paper: credentials.is_paper,
      created_at: credentials.created_at,
    });
  } catch (error) {
    console.error("Error checking Alpaca connection:", error);
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("alpaca_credentials" as any)
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting credentials:", error);
      return NextResponse.json(
        { error: "Failed to delete credentials" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Alpaca credentials:", error);
    return NextResponse.json(
      { error: "Failed to delete credentials" },
      { status: 500 }
    );
  }
}
