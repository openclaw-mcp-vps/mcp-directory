import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink, Github, ShieldCheck, Star } from "lucide-react";
import { InstallCommand } from "@/components/InstallCommand";
import { UptimeStatus } from "@/components/UptimeStatus";
import { Badge } from "@/components/ui/badge";
import { hasDirectoryAccessFromServerContext } from "@/lib/paywall";
import { getServerById, listServerChecks } from "@/lib/server-repository";

type ServerDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ServerDetailPage({ params }: ServerDetailProps) {
  const access = await hasDirectoryAccessFromServerContext();
  if (!access.granted) {
    redirect("/directory");
  }

  const routeParams = await params;
  const decodedId = decodeURIComponent(routeParams.id);
  const server = await getServerById(decodedId);

  if (!server) {
    notFound();
  }

  const checks = await listServerChecks(server.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/directory" className="inline-flex items-center text-sm text-sky-300">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to directory
      </Link>

      <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{server.name}</h1>
            <p className="mt-2 text-[var(--muted)]">{server.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Trust {server.trustScore}/100
              </Badge>
              <Badge>
                <Star className="mr-1.5 h-3.5 w-3.5" />
                {server.stars.toLocaleString()} stars
              </Badge>
              <Badge>@{server.authorLogin}</Badge>
              {server.pushedAt ? (
                <Badge>
                  Updated {formatDistanceToNow(new Date(server.pushedAt), { addSuffix: true })}
                </Badge>
              ) : null}
            </div>
          </div>
          <a
            href={server.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-white/5"
          >
            <Github className="mr-2 h-4 w-4" />
            Open repository
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>

        <div className="mt-5">
          <UptimeStatus
            uptimePercent={server.uptimePercent}
            checks={server.checks}
            lastCheckedAt={server.lastCheckedAt}
            lastStatusCode={server.lastStatusCode}
          />
        </div>

        <InstallCommand command={server.installCommand} />

        <div className="mt-4 flex flex-wrap gap-2">
          {server.topics.map((topic) => (
            <Badge key={topic} className="text-[11px] text-[var(--muted)]">
              {topic}
            </Badge>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Recent Uptime Checks</h2>
        {checks.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Uptime checks will appear after running the monitor cron job.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">HTTP</th>
                  <th className="pb-2 font-medium">Latency</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={`${server.id}-${check.checkedAt}`} className="border-b border-[var(--border)]/50">
                    <td className="py-2 text-[var(--muted)]">{new Date(check.checkedAt).toLocaleString()}</td>
                    <td className="py-2">
                      {check.ok ? (
                        <span className="text-emerald-300">Healthy</span>
                      ) : (
                        <span className="text-amber-300">Issue</span>
                      )}
                    </td>
                    <td className="py-2 text-[var(--muted)]">{check.statusCode ?? "-"}</td>
                    <td className="py-2 text-[var(--muted)]">
                      {check.latencyMs !== null ? `${check.latencyMs}ms` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
