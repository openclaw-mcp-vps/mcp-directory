import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccessFromRequest } from "@/lib/access";
import { listServers } from "@/lib/database";
import type { ServerSort } from "@/lib/types";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(["stars", "trust", "uptime", "updated"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = getAccessFromRequest(request);

  if (!access) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, { status: 400 });
  }

  const { q, sort, limit, offset } = parsed.data;
  const result = await listServers({
    search: q,
    sort: (sort as ServerSort | undefined) ?? "stars",
    limit,
    offset
  });

  return NextResponse.json({
    org: access.orgSlug,
    total: result.total,
    count: result.servers.length,
    servers: result.servers
  });
}
