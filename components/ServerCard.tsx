import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { InstallCommand } from "@/components/InstallCommand";
import { UptimeStatus } from "@/components/UptimeStatus";
import type { ServerRecord } from "@/lib/server-repository";

type ServerCardProps = {
  server: ServerRecord;
};

export function ServerCard({ server }: ServerCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/server/${encodeURIComponent(server.id)}`} className="group inline-block">
            <h3 className="text-lg font-semibold text-[var(--foreground)] transition group-hover:text-sky-300">
              {server.name}
            </h3>
          </Link>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{server.description}</p>
        </div>
        <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
          Trust {server.trustScore}/100
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{server.stars.toLocaleString()} stars</Badge>
        <Badge>{server.forks.toLocaleString()} forks</Badge>
        {server.language ? <Badge>{server.language}</Badge> : null}
        <Badge>@{server.authorLogin}</Badge>
        {server.pushedAt ? (
          <Badge>
            updated {formatDistanceToNow(new Date(server.pushedAt), { addSuffix: true })}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4">
        <UptimeStatus
          uptimePercent={server.uptimePercent}
          checks={server.checks}
          lastCheckedAt={server.lastCheckedAt}
          lastStatusCode={server.lastStatusCode}
        />
      </div>

      <InstallCommand command={server.installCommand} />

      <div className="mt-4 flex flex-wrap gap-2">
        {server.topics.slice(0, 6).map((topic) => (
          <Badge key={topic} className="text-[11px] text-[var(--muted)]">
            {topic}
          </Badge>
        ))}
      </div>
    </article>
  );
}
