import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE_NAME = "mcp_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

interface AccessTokenPayload {
  email: string;
  orgSlug: string;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSigningSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || process.env.NEXTAUTH_SECRET || "local-dev-secret-change-me";
}

function sign(content: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(content).digest("base64url");
}

export function createAccessToken(email: string, orgSlug: string): string {
  const payload: AccessTokenPayload = {
    email,
    orgSlug,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseAccessToken(token: string | null | undefined): AccessTokenPayload | null {
  if (!token) return null;

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = sign(encodedPayload);

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AccessTokenPayload;
    if (!payload.email || !payload.orgSlug || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getAccessFromCookies(): Promise<AccessTokenPayload | null> {
  const store = await cookies();
  return parseAccessToken(store.get(ACCESS_COOKIE_NAME)?.value);
}

export function getAccessFromRequest(request: NextRequest): AccessTokenPayload | null {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  return parseAccessToken(token);
}

export function grantAccess(response: NextResponse, email: string, orgSlug: string): void {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessToken(email, orgSlug),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS
  });
}

export function clearAccess(response: NextResponse): void {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0
  });
}
