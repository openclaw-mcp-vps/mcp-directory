import { NextRequest, NextResponse } from "next/server";
import { getAccessFromRequest } from "@/lib/access";
import { listServers } from "@/lib/database";
import { ensureUptimeMonitorStarted, runUptimeSweep } from "@/lib/uptime-monitor";

export const runtime = "nodejs";

ensureUptimeMonitorStarted();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = getAccessFromRequest(request);
  if (!access) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 25);
  const { servers } = await listServers({ sort: "uptime", limit: Number.isFinite(limit) ? limit : 25, offset: 0 });

  return NextResponse.json({
    checkedServers: servers.length,
    data: servers.map((server) => ({
      id: server.id,
      name: server.name,
      repoFullName: server.repoFullName,
      uptime30d: server.uptime30d,
      averageResponseMs: server.averageResponseMs,
      lastCommitAt: server.lastCommitAt
    }))
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = getAccessFromRequest(request);
  const cronSecret = request.headers.get("x-cron-secret");

  if (!access && cronSecret !== process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 60;
  const result = await runUptimeSweep(Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 60);

  return NextResponse.json({ ok: true, ...result });
}
