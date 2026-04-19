import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { markCheckoutPaid } from "@/lib/server-repository";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(digest, "utf8");

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

function readCustomData(payload: any): Record<string, unknown> {
  if (payload?.meta?.custom_data && typeof payload.meta.custom_data === "object") {
    return payload.meta.custom_data as Record<string, unknown>;
  }

  if (payload?.data?.attributes?.custom_data && typeof payload.data.attributes.custom_data === "object") {
    return payload.data.attributes.custom_data as Record<string, unknown>;
  }

  return {};
}

export async function POST(request: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("x-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload?.meta?.event_name as string | undefined;
  const customData = readCustomData(payload);

  if (
    eventName === "order_created" ||
    eventName === "subscription_created" ||
    eventName === "subscription_payment_success"
  ) {
    const sessionId = String(customData.session_id ?? "").trim();
    if (sessionId) {
      await markCheckoutPaid({
        sessionId,
        orderId: payload?.data?.id ? String(payload.data.id) : null,
        email: payload?.data?.attributes?.user_email ? String(payload.data.attributes.user_email) : null,
        lemonCustomerId:
          payload?.data?.attributes?.customer_id !== undefined
            ? String(payload.data.attributes.customer_id)
            : null
      });
    }
  }

  return NextResponse.json({ ok: true });
}
