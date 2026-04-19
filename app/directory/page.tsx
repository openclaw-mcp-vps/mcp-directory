import Link from "next/link";
import { Lock, Search } from "lucide-react";
import { ServerCard } from "@/components/ServerCard";
import { PricingCheckout } from "@/components/PricingCheckout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasDirectoryAccessFromServerContext } from "@/lib/paywall";
import { listServers } from "@/lib/server-repository";

type DirectoryPageProps = {
  searchParams: Promise<{
    q?: string;
    sort?: "stars" | "recent" | "uptime" | "trust";
    page?: string;
  }>;
};

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const access = await hasDirectoryAccessFromServerContext();
  const params = await searchParams;

  if (!access.granted) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <div className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Directory access is paywalled
          </div>
          <h1 className="mt-4 text-3xl font-semibold">Unlock MCP Directory for your team</h1>
          <p className="mt-3 text-[var(--muted)]">
            Purchase a seat-based subscription to access uptime data, trust scores, and one-click install commands
            for the full MCP catalog.
          </p>
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-black/20 p-4">
            <PricingCheckout compact />
          </div>
          <Link href="/" className="mt-4 inline-block text-sm text-sky-300">
            Back to product details
          </Link>
        </div>
      </main>
    );
  }

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const limit = 24;
  const sort = params.sort ?? "stars";
  const query = params.q?.trim() ?? "";

  const result = await listServers({
    search: query,
    sortBy: sort,
    limit,
    offset: (page - 1) * limit
  });

  const pageCount = Math.max(1, Math.ceil(result.total / limit));

  function pageHref(targetPage: number) {
    const search = new URLSearchParams();
    if (query) {
      search.set("q", query);
    }
    if (sort) {
      search.set("sort", sort);
    }
    search.set("page", String(targetPage));
    return `/directory?${search.toString()}`;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Members area</p>
          <h1 className="mt-1 text-3xl font-semibold">MCP Server Directory</h1>
        </div>
        <Link href="/">
          <Button variant="outline">Overview</Button>
        </Link>
      </div>

      <form className="mt-8 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1fr_180px_140px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
          <Input name="q" defaultValue={query} placeholder="Search by name, topic, author, or description" className="pl-9" />
        </div>
        <select
          name="sort"
          defaultValue={sort}
          className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="stars">Sort by stars</option>
          <option value="recent">Sort by recent updates</option>
          <option value="uptime">Sort by uptime</option>
          <option value="trust">Sort by trust score</option>
        </select>
        <Button className="h-11" type="submit">
          Apply
        </Button>
      </form>

      <div className="mt-4 text-sm text-[var(--muted)]">
        Showing {result.rows.length} of {result.total.toLocaleString()} servers
      </div>

      <div className="mt-6 grid gap-4">
        {result.rows.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        {page <= 1 ? (
          <Button variant="outline" className="h-10" disabled>
            Previous
          </Button>
        ) : (
          <Link href={pageHref(page - 1)} prefetch={false}>
            <Button variant="outline" className="h-10">
              Previous
            </Button>
          </Link>
        )}

        <p className="text-sm text-[var(--muted)]">
          Page {page} / {pageCount}
        </p>

        {page >= pageCount ? (
          <Button variant="outline" className="h-10" disabled>
            Next
          </Button>
        ) : (
          <Link href={pageHref(page + 1)} prefetch={false}>
            <Button variant="outline" className="h-10">
              Next
            </Button>
          </Link>
        )}
      </div>
    </main>
  );
}
