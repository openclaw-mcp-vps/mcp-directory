import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { upsertPurchase } from "@/lib/database";

export const runtime = "nodejs";

function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const values = signatureHeader.split(",");
  const timestampPart = values.find((part) => part.startsWith("t="));
  const signatureParts = values.filter((part) => part.startsWith("v1="));

  if (!timestampPart || signatureParts.length === 0) {
    return false;
  }

  const timestamp = timestampPart.replace("t=", "");
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  return signatureParts.some((part) => {
    const candidate = part.replace("v1=", "");
    const expectedBuffer = Buffer.from(expected);
    const candidateBuffer = Buffer.from(candidate);

    if (expectedBuffer.length !== candidateBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, candidateBuffer);
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    type: string;
    data?: {
      object?: Record<string, unknown>;
    };
  };

  const object = event.data?.object ?? {};

  if (event.type === "checkout.session.completed") {
    const customerDetails = (object.customer_details as Record<string, unknown> | undefined) ?? {};
    const metadata = (object.metadata as Record<string, unknown> | undefined) ?? {};
    const email = String(customerDetails.email ?? metadata.email ?? "").toLowerCase();

    if (email) {
      const orgSlug = String(metadata.org_slug ?? email.split("@")[1]?.split(".")[0] ?? "default-org").toLowerCase();
      const seatCount = Number(metadata.seat_count ?? 1);

      await upsertPurchase({
        email,
        orgSlug,
        seatCount: Number.isFinite(seatCount) && seatCount > 0 ? seatCount : 1,
        status: "active",
        source: "stripe",
        updatedAt: new Date().toISOString()
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const customerEmail = String(object.customer_email ?? "").toLowerCase();
    if (customerEmail) {
      await upsertPurchase({
        email: customerEmail,
        orgSlug: String(customerEmail.split("@")[1]?.split(".")[0] ?? "default-org"),
        seatCount: 1,
        status: "cancelled",
        source: "stripe",
        updatedAt: new Date().toISOString()
      });
    }
  }

  if (event.type === "invoice.payment_failed") {
    const customerEmail = String(object.customer_email ?? "").toLowerCase();
    if (customerEmail) {
      await upsertPurchase({
        email: customerEmail,
        orgSlug: String(customerEmail.split("@")[1]?.split(".")[0] ?? "default-org"),
        seatCount: 1,
        status: "past_due",
        source: "stripe",
        updatedAt: new Date().toISOString()
      });
    }
  }

  return NextResponse.json({ received: true });
}
