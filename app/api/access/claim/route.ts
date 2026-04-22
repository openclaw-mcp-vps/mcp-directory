import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { grantAccess } from "@/lib/access";
import { findActivePurchaseByEmail } from "@/lib/database";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  orgSlug: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-zA-Z0-9-]*$/)
    .optional()
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();

  const parsed = schema.safeParse({
    email: formData.get("email"),
    orgSlug: formData.get("orgSlug")
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/directory?error=1", request.url));
  }

  const purchase = await findActivePurchaseByEmail(parsed.data.email);

  if (!purchase) {
    return NextResponse.redirect(new URL("/directory?error=1", request.url));
  }

  const orgSlug = parsed.data.orgSlug || purchase.orgSlug;
  const response = NextResponse.redirect(new URL("/directory?unlocked=1", request.url));
  grantAccess(response, purchase.email, orgSlug);
  return response;
}
