import { NextResponse } from "next/server";
import { runAllUsers } from "@/lib/engine/runner";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

/**
 * POST /api/cron/run-all-users
 * 
 * Endpoint for GitHub Actions to trigger daily trading runs.
 * Protected by CRON_SECRET environment variable.
 * 
 * Query Parameters:
 * - dry_run=true: Test mode - simulates orders without placing them
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Check for dry_run mode
  const url = new URL(request.url);
  const isDryRun = url.searchParams.get('dry_run') === 'true';

  try {
    const startTime = Date.now();
    const result = await runAllUsers(isDryRun);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      mode: isDryRun ? 'dry-run' : 'live',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      usersProcessed: result.usersProcessed,
      totalOrders: result.totalOrders,
      results: result.results.map((r) => ({
        userId: r.userId,
        strategiesRun: r.strategies.length,
        ordersPlaced: r.totalOrdersPlaced,
        errors: r.errors,
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cron job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/run-all-users
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "run-all-users",
    description: "Triggers daily trading runs for all users with active strategies",
    method: "POST",
    authentication: "Bearer token (CRON_SECRET)",
  });
}
