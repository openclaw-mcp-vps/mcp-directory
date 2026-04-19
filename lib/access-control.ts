import { createHmac, timingSafeEqual } from "crypto";

export const ACCESS_COOKIE = "mcp_access";

type AccessPayload = {
  orgId: string;
  sessionId: string;
  exp: number;
};

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64");
}

function signingSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  return secret || "dev-insecure-access-secret";
}

export function createAccessToken(orgId: string, sessionId: string, days = 30): string {
  const payload: AccessPayload = {
    orgId,
    sessionId,
    exp: Math.floor(Date.now() / 1000) + days * 24 * 60 * 60
  };

  const payloadBase = base64Url(JSON.stringify(payload));
  const signature = base64Url(createHmac("sha256", signingSecret()).update(payloadBase).digest());
  return `${payloadBase}.${signature}`;
}

export function verifyAccessToken(token: string | undefined | null): AccessPayload | null {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payloadBase, signature] = token.split(".");

  const expectedSig = base64Url(createHmac("sha256", signingSecret()).update(payloadBase).digest());
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  const payloadRaw = fromBase64Url(payloadBase).toString("utf8");
  const payload = JSON.parse(payloadRaw) as AccessPayload;

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}
