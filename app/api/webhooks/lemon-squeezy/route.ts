import { NextRequest, NextResponse } from "next/server";
import { upsertPurchase } from "@/lib/database";
import { parseLemonWebhook, verifyLemonSignature } from "@/lib/lemon-squeezy";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Lemon Squeezy signature" }, { status: 400 });
  }

  const payload = parseLemonWebhook(rawBody);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const meta = (payload.meta as Record<string, unknown> | undefined) ?? {};
  const customData = (meta.custom_data as Record<string, unknown> | undefined) ?? {};
  const data = (payload.data as Record<string, unknown> | undefined) ?? {};
  const attributes = (data.attributes as Record<string, unknown> | undefined) ?? {};

  const email = String(
    attributes.user_email ?? customData.email ?? customData.user_email ?? ""
  )
    .trim()
    .toLowerCase();

  if (email) {
    const orgSlug = String(customData.org_slug ?? email.split("@")[1]?.split(".")[0] ?? "default-org").toLowerCase();
    const eventName = String(meta.event_name ?? "");

    const status = eventName.includes("subscription_cancelled")
      ? "cancelled"
      : eventName.includes("subscription_payment_failed")
        ? "past_due"
        : "active";

    await upsertPurchase({
      email,
      orgSlug,
      seatCount: Number(customData.seat_count ?? 1) || 1,
      status: status as "active" | "cancelled" | "past_due",
      source: "lemon-squeezy",
      updatedAt: new Date().toISOString()
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    provider: "lemon-squeezy",
    note: "This endpoint is maintained for compatibility. Primary billing flow uses Stripe Payment Links."
  });
}
