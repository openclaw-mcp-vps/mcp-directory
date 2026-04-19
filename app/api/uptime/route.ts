import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUptimeSummary, runUptimeSweep } from "@/lib/uptime-monitor";

const postSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional()
});

export async function GET(request: NextRequest) {
  const serverId = request.nextUrl.searchParams.get("serverId");

  if (!serverId) {
    return NextResponse.json(
      {
        error: "Provide serverId"
      },
      { status: 400 }
    );
  }

  const summary = await getUptimeSummary(serverId);
  if (!summary) {
    return NextResponse.json({ serverId, summary: null });
  }

  return NextResponse.json({ serverId, summary });
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await runUptimeSweep(parsed.data.limit ?? 200);
  return NextResponse.json(result);
}
