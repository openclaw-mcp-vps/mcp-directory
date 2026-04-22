import crypto from "crypto";
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

export function initLemonSqueezyClient(): void {
  if (!process.env.LEMON_SQUEEZY_API_KEY) {
    return;
  }

  lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY, onError: (error) => console.error(error) });
}

export function verifyLemonSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const received = Buffer.from(signatureHeader);
  const computed = Buffer.from(expected);

  if (received.length !== computed.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, computed);
}

export function parseLemonWebhook(rawBody: string): Record<string, unknown> | null {
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
}
