import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { DATABASE_ENABLED, ensureDatabase, query, randomId } from "@/lib/database";

const schema = z.object({
  email: z.string().email(),
  orgName: z.string().min(2),
  accessCode: z.string().min(3)
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "Organization Access",
      credentials: {
        email: { label: "Email", type: "email" },
        orgName: { label: "Organization", type: "text" },
        accessCode: { label: "Access Code", type: "password" }
      },
      async authorize(credentials) {
        const parsed = schema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const expectedCode = process.env.ORG_ACCESS_CODE ?? "mcp-directory";
        if (parsed.data.accessCode !== expectedCode) {
          return null;
        }

        const orgName = parsed.data.orgName.trim();
        let orgId = `org_${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

        if (DATABASE_ENABLED) {
          await ensureDatabase();

          const existing = await query<{ id: string }>(
            `SELECT id FROM organizations WHERE LOWER(name) = LOWER($1) LIMIT 1`,
            [orgName]
          );

          if (existing[0]?.id) {
            orgId = existing[0].id;
          } else {
            orgId = randomId("org");
            await query(
              `
                INSERT INTO organizations (id, name, subscription_status, updated_at)
                VALUES ($1, $2, 'active', NOW())
              `,
              [orgId, orgName]
            );
          }
        }

        return {
          id: `${orgId}:${parsed.data.email.toLowerCase()}`,
          email: parsed.data.email.toLowerCase(),
          name: parsed.data.email.split("@")[0],
          orgId,
          orgName
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.orgId = (user as any).orgId;
        token.orgName = (user as any).orgName;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).orgId = token.orgId;
      (session as any).orgName = token.orgName;
      return session;
    }
  },
  pages: {
    signIn: "/"
  }
};
