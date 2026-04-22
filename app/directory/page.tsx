import Link from "next/link";
import type { Metadata } from "next";
import { Lock, Search } from "lucide-react";
import { ServerCard } from "@/components/ServerCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAccessFromCookies } from "@/lib/access";
import { listServers } from "@/lib/database";
import type { ServerSort } from "@/lib/types";

export const metadata: Metadata = {
  title: "Directory",
  description: "Search the MCP Directory catalog with trust, uptime, and install commands."
};

const SORT_OPTIONS: Array<{ label: string; value: ServerSort }> = [
  { label: "Most starred", value: "stars" },
  { label: "Most trusted", value: "trust" },
  { label: "Best uptime", value: "uptime" },
  { label: "Recently updated", value: "updated" }
];

interface DirectoryPageProps {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    error?: string;
    unlocked?: string;
  }>;
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const access = await getAccessFromCookies();
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  if (!access) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
        <Card className="border-cyan-400/20 bg-slate-950/85">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-slate-50">
              <Lock className="h-5 w-5 text-cyan-300" />
              Directory access requires an active seat
            </CardTitle>
            <CardDescription>
              The full MCP server catalog is behind a paywall. Complete checkout, then claim access with your purchase email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <a
              href={paymentLink}
              className="inline-flex items-center rounded-lg border border-cyan-300/40 bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Buy Access with Stripe
            </a>

            <form action="/api/access/claim" method="post" className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                Purchase Email
              </label>
              <Input id="email" name="email" type="email" required placeholder="you@company.com" />
              <label htmlFor="orgSlug" className="text-sm font-medium text-slate-200">
                Org Slug (optional)
              </label>
              <Input id="orgSlug" name="orgSlug" type="text" placeholder="your-team" />
              <Button type="submit" className="w-full">
                Unlock Directory
              </Button>
              {params.error ? <p className="text-sm text-rose-300">No active purchase found for that email yet.</p> : null}
            </form>

            <p className="text-xs text-slate-400">
              Stripe webhook events grant seat access. If you just paid, wait a few seconds and retry unlock.
            </p>

            <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
              Back to landing page
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const query = params.q?.trim() ?? "";
  const selectedSort = SORT_OPTIONS.some((option) => option.value === params.sort) ? (params.sort as ServerSort) : "stars";

  const { servers, total } = await listServers({ search: query, sort: selectedSort, limit: 60, offset: 0 });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-50">MCP Server Directory</h1>
            <p className="mt-1 text-sm text-slate-400">
              {total.toLocaleString()} indexed servers. Org access: <span className="text-cyan-300">{access.orgSlug}</span>
            </p>
          </div>
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            Pricing and FAQs
          </Link>
        </div>

        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" method="get" action="/directory">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search by server, repo, owner, or topic"
              className="pl-9"
              aria-label="Search servers"
            />
          </div>
          <select
            name="sort"
            defaultValue={selectedSort}
            className="h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300"
            aria-label="Sort servers"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="submit">Apply</Button>
        </form>
      </header>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-slate-300">No servers matched your search. Try broader keywords.</CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {servers.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </section>
      )}
    </main>
  );
}
