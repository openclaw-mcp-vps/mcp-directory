import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as LemonSqueezy from "@lemonsqueezy/lemonsqueezy.js";
import { z } from "zod";
import { randomId } from "@/lib/database";
import { markCheckoutPaid, saveCheckoutSession } from "@/lib/server-repository";

const schema = z.object({
  orgName: z.string().min(2).max(60),
  email: z.string().email().max(120)
});

async function createLemonCheckoutUrl(input: {
  sessionId: string;
  orgId: string;
  orgName: string;
  email: string;
  origin: string;
}): Promise<string | null> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
  const variantId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  if (!apiKey || !storeId || !variantId) {
    return null;
  }

  if ((LemonSqueezy as any).lemonSqueezySetup) {
    (LemonSqueezy as any).lemonSqueezySetup({ apiKey, onError: () => {} });
  }

  const response = await axios.post(
    "https://api.lemonsqueezy.com/v1/checkouts",
    {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: input.email,
            custom: {
              session_id: input.sessionId,
              org_id: input.orgId,
              org_name: input.orgName
            }
          },
          checkout_options: {
            embed: true,
            media: true,
            logo: true
          },
          product_options: {
            enabled_variants: [Number(variantId)],
            redirect_url: `${input.origin}/directory?checkout=success&sessionId=${encodeURIComponent(input.sessionId)}`
          }
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: String(storeId)
            }
          },
          variant: {
            data: {
              type: "variants",
              id: String(variantId)
            }
          }
        }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json"
      }
    }
  );

  const url = response.data?.data?.attributes?.url;
  if (typeof url !== "string") {
    return null;
  }

  return url;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid organization and work email." }, { status: 400 });
  }

  const sessionId = randomId("session");
  const orgId = randomId("org");
  const origin = request.nextUrl.origin;

  let checkoutUrl: string | null = null;
  let mode: "lemon" | "demo" = "lemon";

  try {
    checkoutUrl = await createLemonCheckoutUrl({
      sessionId,
      orgId,
      orgName: parsed.data.orgName.trim(),
      email: parsed.data.email.toLowerCase(),
      origin
    });
  } catch {
    checkoutUrl = null;
  }

  if (!checkoutUrl) {
    mode = "demo";
    checkoutUrl = `${origin}/directory?checkout=demo&sessionId=${encodeURIComponent(sessionId)}`;
  }

  await saveCheckoutSession({
    sessionId,
    orgId,
    orgName: parsed.data.orgName.trim(),
    email: parsed.data.email.toLowerCase(),
    checkoutUrl
  });

  if (mode === "demo") {
    await markCheckoutPaid({
      sessionId,
      orderId: `demo_${sessionId}`,
      email: parsed.data.email.toLowerCase(),
      lemonCustomerId: null
    });
  }

  return NextResponse.json({
    checkoutUrl,
    sessionId,
    mode
  });
}
