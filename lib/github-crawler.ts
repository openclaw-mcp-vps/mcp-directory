import { Octokit } from "@octokit/rest";
import { calculateTrustScore } from "@/lib/trust-score";
import { DATABASE_ENABLED, ensureDatabase, query } from "@/lib/database";

export type CrawledServer = {
  id: string;
  name: string;
  slug: string;
  description: string;
  repoUrl: string;
  homepageUrl: string | null;
  authorLogin: string;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  topics: string[];
  installCommand: string;
  trustScore: number;
  pushedAt: string;
  createdAtGithub: string;
};

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || undefined
});

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function inferInstallCommand(owner: string, repo: string, language: string | null): string {
  const packageNameGuess = `@${owner}/${repo}`;

  if (language === "Python") {
    return `uvx ${packageNameGuess}`;
  }

  if (language === "Go") {
    return `go install github.com/${owner}/${repo}@latest`;
  }

  if (language === "Rust") {
    return `cargo install --git https://github.com/${owner}/${repo}`;
  }

  return `npx -y ${packageNameGuess}`;
}

function mapRepoToServer(
  repo: Awaited<ReturnType<typeof octokit.search.repos>>["data"]["items"][number]
): CrawledServer {
  const owner = repo.owner?.login ?? "unknown";
  const repoName = repo.name;

  return {
    id: `${owner}/${repoName}`,
    name: repo.full_name ?? `${owner}/${repoName}`,
    slug: toSlug(repo.full_name ?? `${owner}-${repoName}`),
    description:
      repo.description ??
      "Production-grade MCP server with documented tools and transport compatibility.",
    repoUrl: repo.html_url,
    homepageUrl: repo.homepage || null,
    authorLogin: owner,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    language: repo.language,
    topics: repo.topics ?? [],
    installCommand: inferInstallCommand(owner, repoName, repo.language),
    trustScore: calculateTrustScore({
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      openIssues: repo.open_issues_count ?? 0,
      hasHomepage: Boolean(repo.homepage),
      hasLicense: Boolean(repo.license?.key),
      archived: Boolean(repo.archived),
      ownerType: repo.owner?.type ?? "User",
      pushedAt: repo.pushed_at ?? repo.updated_at,
      createdAt: repo.created_at
    }),
    pushedAt: repo.pushed_at ?? repo.updated_at,
    createdAtGithub: repo.created_at
  };
}

export async function searchGithubMcpServers(maxPages = 3): Promise<CrawledServer[]> {
  const pages = Math.max(1, Math.min(4, maxPages));
  const results: CrawledServer[] = [];

  for (let page = 1; page <= pages; page += 1) {
    const response = await octokit.search.repos({
      q: "mcp (server OR protocol) in:name,description,readme archived:false",
      sort: "stars",
      order: "desc",
      per_page: 100,
      page
    });

    const mapped = response.data.items
      .filter((repo) => !repo.fork)
      .map((repo) => mapRepoToServer(repo));

    results.push(...mapped);
  }

  const deduped = new Map<string, CrawledServer>();
  for (const server of results) {
    deduped.set(server.id, server);
  }

  return [...deduped.values()];
}

export async function crawlGithubMcpServers(options?: {
  maxPages?: number;
  persist?: boolean;
}): Promise<{ count: number; servers: CrawledServer[] }> {
  const maxPages = options?.maxPages ?? 3;
  const persist = options?.persist ?? true;
  const servers = await searchGithubMcpServers(maxPages);

  if (persist && DATABASE_ENABLED) {
    await ensureDatabase();

    for (const server of servers) {
      await query(
        `
          INSERT INTO servers (
            id,
            name,
            slug,
            description,
            repo_url,
            homepage_url,
            author_login,
            stars,
            forks,
            open_issues,
            language,
            topics,
            install_command,
            trust_score,
            pushed_at,
            created_at_github,
            last_crawled_at,
            updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            description = EXCLUDED.description,
            repo_url = EXCLUDED.repo_url,
            homepage_url = EXCLUDED.homepage_url,
            author_login = EXCLUDED.author_login,
            stars = EXCLUDED.stars,
            forks = EXCLUDED.forks,
            open_issues = EXCLUDED.open_issues,
            language = EXCLUDED.language,
            topics = EXCLUDED.topics,
            install_command = EXCLUDED.install_command,
            trust_score = EXCLUDED.trust_score,
            pushed_at = EXCLUDED.pushed_at,
            created_at_github = EXCLUDED.created_at_github,
            last_crawled_at = NOW(),
            updated_at = NOW()
        `,
        [
          server.id,
          server.name,
          server.slug,
          server.description,
          server.repoUrl,
          server.homepageUrl,
          server.authorLogin,
          server.stars,
          server.forks,
          server.openIssues,
          server.language,
          server.topics,
          server.installCommand,
          server.trustScore,
          server.pushedAt,
          server.createdAtGithub
        ]
      );
    }
  }

  return {
    count: servers.length,
    servers
  };
}
