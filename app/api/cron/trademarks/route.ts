import { runIngestion } from "@/lib/ingest-runner";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const manualSecret = process.env.MANUAL_TRIGGER_SECRET;
  const manualHeader = request.headers.get("x-manual-secret");
  return Boolean(manualSecret && manualHeader && manualHeader === manualSecret);
}

async function runFromRequest(request: NextRequest, bodyStartFrom?: string, bodyMaxItems?: number) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startFrom = bodyStartFrom ?? request.nextUrl.searchParams.get("startFrom") ?? undefined;
  const maxItemsRaw = bodyMaxItems ?? Number(request.nextUrl.searchParams.get("maxItems"));
  const maxItems = Number.isFinite(maxItemsRaw) && maxItemsRaw > 0 ? maxItemsRaw : undefined;

  try {
    const summary = await runIngestion({ startFrom, maxItems });
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return runFromRequest(request);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as { startFrom?: string; maxItems?: number };
  return runFromRequest(request, payload.startFrom, payload.maxItems);
}
