import Link from "next/link";
import { ArrowRight, CheckCircle2, Radar, Shield, Sparkles, Zap } from "lucide-react";
import { PricingCheckout } from "@/components/PricingCheckout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { directoryStats } from "@/lib/server-repository";
import { hasDirectoryAccessFromServerContext } from "@/lib/paywall";

export default async function HomePage() {
  const stats = await directoryStats();
  const access = await hasDirectoryAccessFromServerContext();

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">mcp-tools</p>
          <h1 className="mt-1 text-xl font-semibold">MCP Directory</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/directory">
            <Button variant="outline">Directory</Button>
          </Link>
          {access.granted ? (
            <Link href="/directory">
              <Button>Open Access</Button>
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid gap-10 py-16 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">Curated MCP intelligence</Badge>
          <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Ship MCP workflows faster with a trusted server catalog.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
            Discover 200+ MCP servers ranked by reliability, maintenance, and author reputation. Every
            listing includes last update, uptime trend, and one-click install commands for Claude Code and
            Cursor.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/directory">
              <Button className="h-11 px-5">
                Explore Directory
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button variant="outline" className="h-11 px-5">
                See Pricing
              </Button>
            </a>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-2xl font-semibold">{stats.totalServers.toLocaleString()}+</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Tracked MCP servers</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-2xl font-semibold">{stats.updatedThisWeek}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Updated this week</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-2xl font-semibold">{stats.avgTrust}/100</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Average trust score</p>
            </div>
          </div>
        </div>

        <div id="pricing" className="rounded-2xl border border-sky-500/30 bg-slate-900/80 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Pro access</p>
          <h3 className="mt-2 text-2xl font-semibold">$9 / seat / month</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Team subscription with org-level access control, webhook billing sync, and searchable directory API.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Unlimited searches and filters
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Uptime checks and trust scoring
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              New-server release alerts
            </li>
          </ul>
          <div className="mt-6">
            <PricingCheckout />
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-y border-[var(--border)] py-12 sm:grid-cols-3">
        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Radar className="h-5 w-5 text-sky-300" />
          <h3 className="mt-3 font-semibold">Problem</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Good MCP servers are scattered across GitHub. Most teams waste hours comparing stale repos and
            broken setup steps.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Sparkles className="h-5 w-5 text-emerald-300" />
          <h3 className="mt-3 font-semibold">Solution</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            MCP Directory continuously crawls GitHub, scores trust by maintainer signal, and verifies uptime so
            your team can install faster with confidence.
          </p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Shield className="h-5 w-5 text-amber-300" />
          <h3 className="mt-3 font-semibold">Outcome</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Fewer incidents, fewer dead integrations, and a clear shortlist of production-worthy MCP servers for
            every stack.
          </p>
        </article>
      </section>

      <section className="py-14">
        <h3 className="text-2xl font-semibold">What You Get</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <Zap className="h-5 w-5 text-sky-300" />
            <h4 className="mt-3 font-semibold">One-click install commands</h4>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Every listing includes copy-ready commands optimized for common MCP runtimes.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <Shield className="h-5 w-5 text-emerald-300" />
            <h4 className="mt-3 font-semibold">Trust + uptime scoring</h4>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Combine GitHub health signals with real uptime checks to prioritize stable options.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <h3 className="text-2xl font-semibold">FAQ</h3>
        <div className="mt-6 space-y-5">
          <div>
            <h4 className="font-medium">Who is this for?</h4>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Claude Code and Cursor power users, plus dev teams standardizing on MCP.
            </p>
          </div>
          <div>
            <h4 className="font-medium">How often is data refreshed?</h4>
            <p className="mt-1 text-sm text-[var(--muted)]">
              GitHub metadata is refreshed by cron, and uptime checks can run every 15 minutes.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Is access tied to an organization?</h4>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Yes. Checkout creates org-scoped access, and session cookies validate active subscription status.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
