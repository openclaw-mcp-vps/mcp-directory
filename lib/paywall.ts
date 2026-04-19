import { cookies } from "next/headers";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/access-control";
import { orgHasActiveSubscription } from "@/lib/server-repository";

export async function hasDirectoryAccessFromRequestCookie(token: string | undefined): Promise<{
  granted: boolean;
  orgId: string | null;
}> {
  const payload = verifyAccessToken(token);
  if (!payload) {
    return { granted: false, orgId: null };
  }

  const orgActive = await orgHasActiveSubscription(payload.orgId);
  if (!orgActive) {
    return { granted: false, orgId: null };
  }

  return {
    granted: true,
    orgId: payload.orgId
  };
}

export async function hasDirectoryAccessFromServerContext(): Promise<{
  granted: boolean;
  orgId: string | null;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  return hasDirectoryAccessFromRequestCookie(token);
}
