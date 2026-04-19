import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE } from "@/lib/access-control";
import { hasDirectoryAccessFromRequestCookie } from "@/lib/paywall";
import { listServers } from "@/lib/server-repository";

const schema = z.object({
  q: z.string().optional(),
  sort: z.enum(["stars", "recent", "uptime", "trust"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24)
});

export async function GET(request: NextRequest) {
  const access = await hasDirectoryAccessFromRequestCookie(request.cookies.get(ACCESS_COOKIE)?.value);
  if (!access.granted) {
    return NextResponse.json(
      {
        error: "Payment required"
      },
      { status: 402 }
    );
  }

  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const offset = (parsed.data.page - 1) * parsed.data.limit;
  const result = await listServers({
    search: parsed.data.q,
    sortBy: parsed.data.sort ?? "stars",
    limit: parsed.data.limit,
    offset
  });

  return NextResponse.json({
    page: parsed.data.page,
    limit: parsed.data.limit,
    total: result.total,
    rows: result.rows
  });
}
