import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Github, Star } from "lucide-react";
import { InstallCommand } from "@/components/InstallCommand";
import { TrustBadge } from "@/components/TrustBadge";
import { UptimeBadge } from "@/components/UptimeBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccessFromCookies } from "@/lib/access";
import { getServerById } from "@/lib/database";
import { formatDate, formatNumber, timeAgo } from "@/lib/utils";

interface ServerDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ServerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const server = await getServerById(id);

  if (!server) {
    return {
      title: "Server Not Found"
    };
  }

  return {
    title: `${server.name} MCP Server`,
    description: server.description,
    openGraph: {
      title: `${server.name} on MCP Directory`,
      description: server.description,
      url: `https://mcp-directory.app/server/${server.id}`
    }
  };
}

export default async function ServerDetailPage({ params }: ServerDetailPageProps): Promise<React.JSX.Element> {
  const access = await getAccessFromCookies();
  if (!access) {
    notFound();
  }

  const { id } = await params;
  const server = await getServerById(id);

  if (!server) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/directory" className="text-sm text-cyan-300 hover:text-cyan-200">
          Back to directory
        </Link>
        <a
          href={server.repositoryUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-slate-200 hover:text-slate-50"
        >
          <Github className="h-4 w-4" />
          Open GitHub
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <UptimeBadge uptime={server.uptime30d} />
            <TrustBadge score={server.trustScore} />
          </div>
          <CardTitle className="text-3xl text-slate-50">{server.name}</CardTitle>
          <p className="text-sm leading-relaxed text-slate-300">{server.description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Repository</p>
              <p className="mt-2 text-sm text-slate-200">{server.repoFullName}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Maintainer</p>
              <p className="mt-2 text-sm text-slate-200">@{server.ownerLogin}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Stars</p>
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-200">
                <Star className="h-4 w-4" />
                {formatNumber(server.stars)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Last Commit</p>
              <p className="mt-2 text-sm text-slate-200">
                {formatDate(server.lastCommitAt)} ({timeAgo(server.lastCommitAt)})
              </p>
            </div>
          </div>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Install Command</h2>
            <InstallCommand command={server.installCommand} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Topics</h2>
            <div className="flex flex-wrap gap-2">
              {server.topics.length > 0 ? (
                server.topics.map((topic) => <Badge key={topic}>{topic}</Badge>)
              ) : (
                <p className="text-sm text-slate-400">No topics detected for this repository.</p>
              )}
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
