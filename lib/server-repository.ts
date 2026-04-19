import { subDays } from "date-fns";
import { DATABASE_ENABLED, ensureDatabase, query } from "@/lib/database";
import { crawlGithubMcpServers, type CrawledServer } from "@/lib/github-crawler";

export type ServerRecord = {
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
  pushedAt: string | null;
  createdAtGithub: string | null;
  uptimePercent: number | null;
  lastCheckedAt: string | null;
  lastStatusCode: number | null;
  checks: number;
};

export type DirectoryQuery = {
  search?: string;
  sortBy?: "stars" | "recent" | "uptime" | "trust";
  limit?: number;
  offset?: number;
};

type CachedFallback = {
  expiresAt: number;
  rows: ServerRecord[];
};

let fallbackCache: CachedFallback | null = null;
const memorySessions = new Map<
  string,
  { id: string; orgId: string; orgName: string; status: "pending" | "paid" }
>();

function generatedFallbackServers(count = 220): ServerRecord[] {
  const domains = [
    "github",
    "notion",
    "slack",
    "jira",
    "postgres",
    "redis",
    "figma",
    "linear",
    "gmail",
    "calendar",
    "docs",
    "s3",
    "snowflake",
    "bigquery",
    "stripe",
    "shopify",
    "kubernetes",
    "terraform",
    "datadog",
    "sentry"
  ];
  const verbs = [
    "sync",
    "query",
    "index",
    "notify",
    "ingest",
    "diff",
    "inspect",
    "search",
    "bridge",
    "stream",
    "guard"
  ];
  const langs = ["TypeScript", "Python", "Go", "Rust", "JavaScript"];

  const rows: ServerRecord[] = [];

  for (let i = 0; i < count; i += 1) {
    const domain = domains[i % domains.length];
    const verb = verbs[i % verbs.length];
    const author = `mcp-${domain}-labs`;
    const name = `${author}/${verb}-server-${Math.floor(i / domains.length) + 1}`;
    const id = name;
    const stars = 600 - i * 2 + (i % 15) * 8;
    const trustScore = Math.max(25, 90 - (i % 60));
    const daysAgo = i % 30;
    const pushedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const uptimePercent = Number((98.8 - (i % 17) * 0.23).toFixed(2));

    rows.push({
      id,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: `MCP server for ${domain} workflows focused on ${verb} operations, secure auth handoff, and production observability.`,
      repoUrl: `https://github.com/${name}`,
      homepageUrl: null,
      authorLogin: author,
      stars: Math.max(40, stars),
      forks: Math.max(8, Math.floor(stars / 6)),
      openIssues: Math.max(0, (i % 12) - 2),
      language: langs[i % langs.length],
      topics: ["mcp", "server", domain, verb, "tools"],
      installCommand: `npx -y @${author}/${verb}-server-${Math.floor(i / domains.length) + 1}`,
      trustScore,
      pushedAt,
      createdAtGithub: new Date(Date.now() - (45 + i) * 24 * 60 * 60 * 1000).toISOString(),
      uptimePercent,
      lastCheckedAt: new Date(Date.now() - (i % 4) * 60 * 60 * 1000).toISOString(),
      lastStatusCode: 200,
      checks: 120
    });
  }

  return rows;
}

function fromCrawled(server: CrawledServer): ServerRecord {
  return {
    id: server.id,
    name: server.name,
    slug: server.slug,
    description: server.description,
    repoUrl: server.repoUrl,
    homepageUrl: server.homepageUrl,
    authorLogin: server.authorLogin,
    stars: server.stars,
    forks: server.forks,
    openIssues: server.openIssues,
    language: server.language,
    topics: server.topics,
    installCommand: server.installCommand,
    trustScore: server.trustScore,
    pushedAt: server.pushedAt,
    createdAtGithub: server.createdAtGithub,
    uptimePercent: null,
    lastCheckedAt: null,
    lastStatusCode: null,
    checks: 0
  };
}

async function fallbackServers(): Promise<ServerRecord[]> {
  if (fallbackCache && fallbackCache.expiresAt > Date.now()) {
    return fallbackCache.rows;
  }

  let rows: ServerRecord[] = [];
  if (!process.env.GITHUB_TOKEN) {
    rows = generatedFallbackServers();
  } else {
    try {
      const crawled = await crawlGithubMcpServers({ maxPages: 3, persist: false });
      rows = crawled.servers.map((server) => fromCrawled(server));
    } catch {
      rows = generatedFallbackServers();
    }
  }

  fallbackCache = {
    expiresAt: Date.now() + 10 * 60 * 1000,
    rows
  };

  return rows;
}

function applySearch(rows: ServerRecord[], search?: string): ServerRecord[] {
  if (!search) {
    return rows;
  }

  const term = search.toLowerCase().trim();
  if (!term) {
    return rows;
  }

  return rows.filter((row) => {
    return (
      row.name.toLowerCase().includes(term) ||
      row.description.toLowerCase().includes(term) ||
      row.authorLogin.toLowerCase().includes(term) ||
      row.topics.some((topic) => topic.toLowerCase().includes(term))
    );
  });
}

function applySort(rows: ServerRecord[], sortBy: DirectoryQuery["sortBy"]): ServerRecord[] {
  const list = [...rows];
  if (sortBy === "recent") {
    return list.sort((a, b) => {
      const aTime = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
      const bTime = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  if (sortBy === "uptime") {
    return list.sort((a, b) => (b.uptimePercent ?? 0) - (a.uptimePercent ?? 0));
  }

  if (sortBy === "trust") {
    return list.sort((a, b) => b.trustScore - a.trustScore);
  }

  return list.sort((a, b) => b.stars - a.stars);
}

export async function listServers(params: DirectoryQuery): Promise<{ total: number; rows: ServerRecord[] }> {
  const search = params.search?.trim();
  const sortBy = params.sortBy ?? "stars";
  const limit = Math.min(100, Math.max(1, params.limit ?? 24));
  const offset = Math.max(0, params.offset ?? 0);

  if (!DATABASE_ENABLED) {
    const rows = await fallbackServers();
    const searched = applySearch(rows, search);
    const sorted = applySort(searched, sortBy);
    return {
      total: sorted.length,
      rows: sorted.slice(offset, offset + limit)
    };
  }

  try {
    await ensureDatabase();

    const countRow = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM servers`);
    const count = Number(countRow[0]?.count ?? "0");

    if (count < 150) {
      try {
        await crawlGithubMcpServers({ maxPages: 3, persist: true });
      } catch {
        // Keep serving existing records if crawl fails.
      }
    }

    const sortSql =
      sortBy === "recent"
        ? "s.pushed_at DESC NULLS LAST"
        : sortBy === "uptime"
          ? "COALESCE(agg.uptime_percent, 0) DESC"
          : sortBy === "trust"
            ? "s.trust_score DESC"
            : "s.stars DESC";

    const term = search ? `%${search.toLowerCase()}%` : null;

    const rows = await query<{
      id: string;
      name: string;
      slug: string;
      description: string;
      repo_url: string;
      homepage_url: string | null;
      author_login: string;
      stars: number;
      forks: number;
      open_issues: number;
      language: string | null;
      topics: string[];
      install_command: string;
      trust_score: number;
      pushed_at: string | null;
      created_at_github: string | null;
      uptime_percent: string | null;
      checks: string;
      last_checked_at: string | null;
      last_status_code: number | null;
    }>(
      `
      WITH agg AS (
        SELECT
          server_id,
          ROUND(100.0 * AVG(CASE WHEN ok THEN 1 ELSE 0 END), 2) AS uptime_percent,
          COUNT(*) AS checks,
          MAX(checked_at) AS last_checked_at
        FROM (
          SELECT
            server_id,
            ok,
            checked_at,
            ROW_NUMBER() OVER (PARTITION BY server_id ORDER BY checked_at DESC) AS rn
          FROM uptime_checks
        ) ranked
        WHERE rn <= 120
        GROUP BY server_id
      ),
      latest AS (
        SELECT DISTINCT ON (server_id)
          server_id,
          status_code
        FROM uptime_checks
        ORDER BY server_id, checked_at DESC
      )
      SELECT
        s.id,
        s.name,
        s.slug,
        s.description,
        s.repo_url,
        s.homepage_url,
        s.author_login,
        s.stars,
        s.forks,
        s.open_issues,
        s.language,
        s.topics,
        s.install_command,
        s.trust_score,
        s.pushed_at,
        s.created_at_github,
        agg.uptime_percent::text,
        COALESCE(agg.checks, 0)::text AS checks,
        agg.last_checked_at,
        latest.status_code AS last_status_code
      FROM servers s
      LEFT JOIN agg ON agg.server_id = s.id
      LEFT JOIN latest ON latest.server_id = s.id
      WHERE (
        $1::text IS NULL OR
        LOWER(s.name) LIKE $1 OR
        LOWER(COALESCE(s.description, '')) LIKE $1 OR
        LOWER(s.author_login) LIKE $1 OR
        EXISTS (
          SELECT 1
          FROM UNNEST(s.topics) AS t(topic)
          WHERE LOWER(topic) LIKE $1
        )
      )
      ORDER BY ${sortSql}, s.stars DESC
      LIMIT $2 OFFSET $3
    `,
      [term, limit, offset]
    );

    const totalResult = await query<{ count: string }>(
      `
      SELECT COUNT(*)::text AS count
      FROM servers s
      WHERE (
        $1::text IS NULL OR
        LOWER(s.name) LIKE $1 OR
        LOWER(COALESCE(s.description, '')) LIKE $1 OR
        LOWER(s.author_login) LIKE $1 OR
        EXISTS (
          SELECT 1
          FROM UNNEST(s.topics) AS t(topic)
          WHERE LOWER(topic) LIKE $1
        )
      )
    `,
      [term]
    );

    return {
      total: Number(totalResult[0]?.count ?? "0"),
      rows: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        repoUrl: row.repo_url,
        homepageUrl: row.homepage_url,
        authorLogin: row.author_login,
        stars: row.stars,
        forks: row.forks,
        openIssues: row.open_issues,
        language: row.language,
        topics: row.topics,
        installCommand: row.install_command,
        trustScore: row.trust_score,
        pushedAt: row.pushed_at,
        createdAtGithub: row.created_at_github,
        uptimePercent: row.uptime_percent ? Number(row.uptime_percent) : null,
        lastCheckedAt: row.last_checked_at,
        lastStatusCode: row.last_status_code,
        checks: Number(row.checks)
      }))
    };
  } catch {
    const rows = await fallbackServers();
    const searched = applySearch(rows, search);
    const sorted = applySort(searched, sortBy);
    return {
      total: sorted.length,
      rows: sorted.slice(offset, offset + limit)
    };
  }
}

export async function getServerById(serverId: string): Promise<ServerRecord | null> {
  if (!DATABASE_ENABLED) {
    const rows = await fallbackServers();
    const match = rows.find((row) => row.id.toLowerCase() === serverId.toLowerCase());
    return match ?? null;
  }

  try {
    await ensureDatabase();

    const row = await query<{
      id: string;
      name: string;
      slug: string;
      description: string;
      repo_url: string;
      homepage_url: string | null;
      author_login: string;
      stars: number;
      forks: number;
      open_issues: number;
      language: string | null;
      topics: string[];
      install_command: string;
      trust_score: number;
      pushed_at: string | null;
      created_at_github: string | null;
    }>(
      `
      SELECT
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
        created_at_github
      FROM servers
      WHERE id = $1
      LIMIT 1
    `,
      [serverId]
    );

    if (!row[0]) {
      return null;
    }

    const uptime = await query<{
      uptime_percent: string;
      checks: string;
      last_checked_at: string | null;
      last_status_code: number | null;
    }>(
      `
      WITH recent AS (
        SELECT *
        FROM uptime_checks
        WHERE server_id = $1
        ORDER BY checked_at DESC
        LIMIT 120
      )
      SELECT
        COALESCE(ROUND(100.0 * AVG(CASE WHEN ok THEN 1 ELSE 0 END), 2), 0)::text AS uptime_percent,
        COUNT(*)::text AS checks,
        MAX(checked_at) AS last_checked_at,
        (
          SELECT status_code
          FROM uptime_checks
          WHERE server_id = $1
          ORDER BY checked_at DESC
          LIMIT 1
        ) AS last_status_code
      FROM recent
    `,
      [serverId]
    );

    return {
      id: row[0].id,
      name: row[0].name,
      slug: row[0].slug,
      description: row[0].description,
      repoUrl: row[0].repo_url,
      homepageUrl: row[0].homepage_url,
      authorLogin: row[0].author_login,
      stars: row[0].stars,
      forks: row[0].forks,
      openIssues: row[0].open_issues,
      language: row[0].language,
      topics: row[0].topics,
      installCommand: row[0].install_command,
      trustScore: row[0].trust_score,
      pushedAt: row[0].pushed_at,
      createdAtGithub: row[0].created_at_github,
      uptimePercent: uptime[0] ? Number(uptime[0].uptime_percent) : null,
      checks: uptime[0] ? Number(uptime[0].checks) : 0,
      lastCheckedAt: uptime[0]?.last_checked_at ?? null,
      lastStatusCode: uptime[0]?.last_status_code ?? null
    };
  } catch {
    const rows = await fallbackServers();
    const match = rows.find((row) => row.id.toLowerCase() === serverId.toLowerCase());
    return match ?? null;
  }
}

export async function directoryStats(): Promise<{
  totalServers: number;
  avgTrust: number;
  updatedThisWeek: number;
  healthyShare: number;
}> {
  const fromFallback = async () => {
    const rows = await fallbackServers();
    const recentCutoff = subDays(new Date(), 7).getTime();

    const updatedThisWeek = rows.filter((row) => {
      if (!row.pushedAt) {
        return false;
      }
      return new Date(row.pushedAt).getTime() >= recentCutoff;
    }).length;

    const avgTrust =
      rows.length === 0
        ? 0
        : Math.round(rows.reduce((acc, row) => acc + row.trustScore, 0) / rows.length);

    return {
      totalServers: rows.length,
      avgTrust,
      updatedThisWeek,
      healthyShare: 0
    };
  };

  if (!DATABASE_ENABLED) {
    return fromFallback();
  }

  try {
    await ensureDatabase();

    const stats = await query<{
      total_servers: string;
      avg_trust: string;
      updated_this_week: string;
      healthy_share: string;
    }>(
      `
      WITH recent_uptime AS (
        SELECT DISTINCT ON (server_id)
          server_id,
          ok
        FROM uptime_checks
        ORDER BY server_id, checked_at DESC
      )
      SELECT
        COUNT(*)::text AS total_servers,
        COALESCE(ROUND(AVG(trust_score), 0), 0)::text AS avg_trust,
        COALESCE(SUM(CASE WHEN pushed_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0)::text AS updated_this_week,
        COALESCE(ROUND(100.0 * AVG(CASE WHEN recent_uptime.ok THEN 1 ELSE 0 END), 2), 0)::text AS healthy_share
      FROM servers
      LEFT JOIN recent_uptime ON recent_uptime.server_id = servers.id
    `
    );

    return {
      totalServers: Number(stats[0]?.total_servers ?? "0"),
      avgTrust: Number(stats[0]?.avg_trust ?? "0"),
      updatedThisWeek: Number(stats[0]?.updated_this_week ?? "0"),
      healthyShare: Number(stats[0]?.healthy_share ?? "0")
    };
  } catch {
    return fromFallback();
  }
}

export async function listServerChecks(serverId: string): Promise<
  Array<{
    checkedAt: string;
    ok: boolean;
    statusCode: number | null;
    latencyMs: number | null;
  }>
> {
  if (!DATABASE_ENABLED) {
    return [];
  }

  try {
    await ensureDatabase();

    const rows = await query<{
      checked_at: string;
      ok: boolean;
      status_code: number | null;
      latency_ms: number | null;
    }>(
      `
      SELECT checked_at, ok, status_code, latency_ms
      FROM uptime_checks
      WHERE server_id = $1
      ORDER BY checked_at DESC
      LIMIT 40
    `,
      [serverId]
    );

    return rows.map((row) => ({
      checkedAt: row.checked_at,
      ok: row.ok,
      statusCode: row.status_code,
      latencyMs: row.latency_ms
    }));
  } catch {
    return [];
  }
}

export async function saveCheckoutSession(input: {
  sessionId: string;
  orgId: string;
  orgName: string;
  email: string | null;
  checkoutUrl: string;
}): Promise<void> {
  if (!DATABASE_ENABLED) {
    memorySessions.set(input.sessionId, {
      id: input.sessionId,
      orgId: input.orgId,
      orgName: input.orgName,
      status: "pending"
    });
    return;
  }

  await ensureDatabase();

  await query(
    `
      INSERT INTO organizations (id, name, subscription_status, updated_at)
      VALUES ($1, $2, 'pending', NOW())
      ON CONFLICT (id) DO NOTHING
    `,
    [input.orgId, input.orgName]
  );

  await query(
    `
      INSERT INTO paywall_sessions (
        id,
        org_id,
        org_name,
        email,
        checkout_url,
        status,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,'pending',NOW(),NOW())
      ON CONFLICT (id) DO UPDATE SET
        org_id = EXCLUDED.org_id,
        org_name = EXCLUDED.org_name,
        email = EXCLUDED.email,
        checkout_url = EXCLUDED.checkout_url,
        status = 'pending',
        updated_at = NOW()
    `,
    [input.sessionId, input.orgId, input.orgName, input.email, input.checkoutUrl]
  );
}

export async function markCheckoutPaid(input: {
  sessionId: string;
  orderId: string | null;
  email: string | null;
  lemonCustomerId: string | null;
}): Promise<void> {
  if (!DATABASE_ENABLED) {
    const existing = memorySessions.get(input.sessionId);
    if (existing) {
      memorySessions.set(input.sessionId, { ...existing, status: "paid" });
    }
    return;
  }

  await ensureDatabase();

  const session = await query<{ org_id: string }>(
    `SELECT org_id FROM paywall_sessions WHERE id = $1 LIMIT 1`,
    [input.sessionId]
  );

  if (!session[0]?.org_id) {
    return;
  }

  await query(
    `
      UPDATE paywall_sessions
      SET
        status = 'paid',
        order_id = COALESCE($2, order_id),
        email = COALESCE($3, email),
        updated_at = NOW()
      WHERE id = $1
    `,
    [input.sessionId, input.orderId, input.email]
  );

  await query(
    `
      UPDATE organizations
      SET
        subscription_status = 'active',
        lemon_customer_id = COALESCE($2, lemon_customer_id),
        updated_at = NOW()
      WHERE id = $1
    `,
    [session[0].org_id, input.lemonCustomerId]
  );
}

export async function getCheckoutSession(sessionId: string): Promise<
  | {
      id: string;
      orgId: string;
      orgName: string;
      status: string;
    }
  | null
> {
  if (!DATABASE_ENABLED) {
    const session = memorySessions.get(sessionId);
    return session ?? null;
  }

  await ensureDatabase();

  const rows = await query<{
    id: string;
    org_id: string;
    org_name: string;
    status: string;
  }>(
    `
      SELECT id, org_id, org_name, status
      FROM paywall_sessions
      WHERE id = $1
      LIMIT 1
    `,
    [sessionId]
  );

  if (!rows[0]) {
    return null;
  }

  return {
    id: rows[0].id,
    orgId: rows[0].org_id,
    orgName: rows[0].org_name,
    status: rows[0].status
  };
}

export async function orgHasActiveSubscription(orgId: string): Promise<boolean> {
  if (!DATABASE_ENABLED) {
    return true;
  }

  await ensureDatabase();

  const rows = await query<{ subscription_status: string }>(
    `
      SELECT subscription_status
      FROM organizations
      WHERE id = $1
      LIMIT 1
    `,
    [orgId]
  );

  return rows[0]?.subscription_status === "active";
}
