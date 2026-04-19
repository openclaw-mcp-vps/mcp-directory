# Build Task: mcp-directory

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: mcp-directory
HEADLINE: MCP Directory — curated catalog of MCP servers with uptime + install commands
WHAT: Browse 200+ MCP servers with live uptime, last-updated, star count, one-click install commands, and trust score based on author reputation.
WHY: Finding good MCP servers is painful — scattered across GitHub. Hosted directory + alerts when new ones ship = value to MCP power users.
WHO PAYS: Claude Code + Cursor power users, dev teams adopting MCP
NICHE: mcp-tools
PRICE: $$9/mo org seat/mo

ARCHITECTURE SPEC:
Next.js app with PostgreSQL backend that crawls GitHub for MCP servers, monitors uptime via cron jobs, and provides a searchable directory with install commands. Uses Lemon Squeezy for subscription billing and implements org-based access control.

PLANNED FILES:
- app/page.tsx
- app/directory/page.tsx
- app/server/[id]/page.tsx
- app/api/servers/route.ts
- app/api/uptime/route.ts
- app/api/webhooks/lemon-squeezy/route.ts
- app/api/auth/[...nextauth]/route.ts
- lib/database.ts
- lib/github-crawler.ts
- lib/uptime-monitor.ts
- lib/trust-score.ts
- components/ServerCard.tsx
- components/InstallCommand.tsx
- components/UptimeStatus.tsx
- prisma/schema.prisma
- cron/update-servers.js
- cron/check-uptime.js

DEPENDENCIES: next, react, typescript, tailwindcss, prisma, @prisma/client, next-auth, @auth/prisma-adapter, lemonsqueezy.js, @octokit/rest, axios, date-fns, lucide-react, clsx, zod, node-cron

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.
