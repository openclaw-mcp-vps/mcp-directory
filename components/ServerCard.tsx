import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallCommand } from "@/components/InstallCommand";
import { TrustBadge } from "@/components/TrustBadge";
import { UptimeBadge } from "@/components/UptimeBadge";
import type { DirectoryServer } from "@/lib/types";
import { formatNumber, timeAgo } from "@/lib/utils";

interface ServerCardProps {
  server: DirectoryServer;
}

export function ServerCard({ server }: ServerCardProps): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <UptimeBadge uptime={server.uptime30d} />
          <TrustBadge score={server.trustScore} />
        </div>

        <CardTitle className="flex items-start justify-between gap-3">
          <span>{server.name}</span>
          <Link
            href={`/server/${server.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200"
          >
            View
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardTitle>

        <CardDescription>{server.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {formatNumber(server.stars)} stars
          </span>
          <span>Updated {timeAgo(server.lastCommitAt)}</span>
          <span>by @{server.ownerLogin}</span>
        </div>

        <InstallCommand command={server.installCommand} />
      </CardContent>
    </Card>
  );
}
