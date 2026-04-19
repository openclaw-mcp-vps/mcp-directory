import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, createAccessToken } from "@/lib/access-control";
import { getCheckoutSession } from "@/lib/server-repository";

const schema = z.object({
  sessionId: z.string().min(8)
});

export async function GET(request: NextRequest) {
  const parsed = schema.safeParse({
    sessionId: request.nextUrl.searchParams.get("sessionId")
  });

  if (!parsed.success) {
    return NextResponse.json({ paid: false, error: "Invalid session" }, { status: 400 });
  }

  const session = await getCheckoutSession(parsed.data.sessionId);
  if (!session || session.status !== "paid") {
    return NextResponse.json({ paid: false });
  }

  const token = createAccessToken(session.orgId, session.id);
  const response = NextResponse.json({
    paid: true,
    orgName: session.orgName
  });

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: token,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
