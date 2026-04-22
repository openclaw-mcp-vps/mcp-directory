import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { findActivePurchaseByEmail } from "@/lib/database";

const credentialSchema = z.object({
  email: z.string().email()
});

const { handlers } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@company.com" }
      },
      async authorize(credentials) {
        const parsed = credentialSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const purchase = await findActivePurchaseByEmail(parsed.data.email);
        if (!purchase) {
          return null;
        }

        return {
          id: parsed.data.email,
          email: parsed.data.email,
          name: purchase.orgSlug
        };
      }
    })
  ]
});

export const { GET, POST } = handlers;
