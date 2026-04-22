import { Pool } from "pg";
import { crawlMcpServers } from "@/lib/crawler";
import type { AccessPurchase, DirectoryServer, ServerSort } from "@/lib/types";

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false }
    })
  : null;

let initialized = false;
let hydratePromise: Promise<void> | null = null;

const memoryState: {
  servers: Map<string, DirectoryServer>;
  purchases: Map<string, AccessPurchase>;
  checks: Array<{ serverId: string; success: boolean; responseTimeMs: number; checkedAt: string; statusCode: number }>;
} = {
  servers: new Map<string, DirectoryServer>(),
  purchases: new Map<string, AccessPurchase>(),
  checks: []
};

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function mapRowToServer(row: Record<string, unknown>): DirectoryServer {
  return {
    id: String(row.id),
    repoFullName: String(row.repo_full_name),
    name: String(row.name),
    description: String(row.description),
    ownerLogin: String(row.owner_login),
    ownerType: String(row.owner_type) === "Organization" ? "Organization" : "User",
    ownerFollowers: Number(row.owner_followers ?? 0),
    stars: Number(row.stars ?? 0),
    forks: Number(row.forks ?? 0),
    openIssues: Number(row.open_issues ?? 0),
    topics: parseArray(row.topics),
    language: row.language ? String(row.language) : null,
    repositoryUrl: String(row.repository_url),
    homepageUrl: row.homepage_url ? String(row.homepage_url) : null,
    healthcheckUrl: row.healthcheck_url ? String(row.healthcheck_url) : null,
    installCommand: String(row.install_command),
    trustScore: Number(row.trust_score ?? 0),
    verifiedAuthor: Boolean(row.verified_author),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    lastCommitAt: new Date(String(row.last_commit_at)).toISOString(),
    uptime30d: Number(row.uptime_30d ?? 0),
    averageResponseMs: Number(row.average_response_ms ?? 0)
  };
}

async function initDatabase(): Promise<void> {
  if (!pool || initialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      repo_full_name TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      owner_login TEXT NOT NULL,
      owner_type TEXT NOT NULL,
      owner_followers INTEGER NOT NULL DEFAULT 0,
      stars INTEGER NOT NULL DEFAULT 0,
      forks INTEGER NOT NULL DEFAULT 0,
      open_issues INTEGER NOT NULL DEFAULT 0,
      topics TEXT[] NOT NULL DEFAULT '{}',
      language TEXT,
      repository_url TEXT NOT NULL,
      homepage_url TEXT,
      healthcheck_url TEXT,
      install_command TEXT NOT NULL,
      trust_score INTEGER NOT NULL DEFAULT 0,
      verified_author BOOLEAN NOT NULL DEFAULT FALSE,
      last_commit_at TIMESTAMPTZ NOT NULL,
      uptime_30d DOUBLE PRECISION NOT NULL DEFAULT 99,
      average_response_ms INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS uptime_checks (
      id BIGSERIAL PRIMARY KEY,
      server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status_code INTEGER NOT NULL,
      response_time_ms INTEGER NOT NULL,
      success BOOLEAN NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchases (
      email TEXT PRIMARY KEY,
      org_slug TEXT NOT NULL,
      seat_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS servers_stars_idx ON servers (stars DESC);");
  await pool.query("CREATE INDEX IF NOT EXISTS servers_trust_idx ON servers (trust_score DESC);");
  await pool.query("CREATE INDEX IF NOT EXISTS servers_last_commit_idx ON servers (last_commit_at DESC);");

  initialized = true;
}

async function writeServers(servers: DirectoryServer[]): Promise<void> {
  if (!pool) {
    for (const server of servers) {
      memoryState.servers.set(server.id, server);
    }
    return;
  }

  await initDatabase();

  const sql = `
    INSERT INTO servers (
      id, repo_full_name, name, description, owner_login, owner_type, owner_followers,
      stars, forks, open_issues, topics, language, repository_url, homepage_url,
      healthcheck_url, install_command, trust_score, verified_author, last_commit_at,
      uptime_30d, average_response_ms, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19,
      $20, $21, $22, $23
    )
    ON CONFLICT (id) DO UPDATE SET
      repo_full_name = EXCLUDED.repo_full_name,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      owner_login = EXCLUDED.owner_login,
      owner_type = EXCLUDED.owner_type,
      owner_followers = EXCLUDED.owner_followers,
      stars = EXCLUDED.stars,
      forks = EXCLUDED.forks,
      open_issues = EXCLUDED.open_issues,
      topics = EXCLUDED.topics,
      language = EXCLUDED.language,
      repository_url = EXCLUDED.repository_url,
      homepage_url = EXCLUDED.homepage_url,
      healthcheck_url = EXCLUDED.healthcheck_url,
      install_command = EXCLUDED.install_command,
      trust_score = EXCLUDED.trust_score,
      verified_author = EXCLUDED.verified_author,
      last_commit_at = EXCLUDED.last_commit_at,
      uptime_30d = EXCLUDED.uptime_30d,
      average_response_ms = EXCLUDED.average_response_ms,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at;
  `;

  for (const server of servers) {
    await pool.query(sql, [
      server.id,
      server.repoFullName,
      server.name,
      server.description,
      server.ownerLogin,
      server.ownerType,
      server.ownerFollowers,
      server.stars,
      server.forks,
      server.openIssues,
      server.topics,
      server.language,
      server.repositoryUrl,
      server.homepageUrl,
      server.healthcheckUrl,
      server.installCommand,
      server.trustScore,
      server.verifiedAuthor,
      server.lastCommitAt,
      server.uptime30d,
      server.averageResponseMs,
      server.createdAt,
      server.updatedAt
    ]);
  }
}

export async function ensureServerCatalog(minimumCount = 200): Promise<void> {
  if (hydratePromise) {
    await hydratePromise;
    return;
  }

  hydratePromise = (async () => {
    let currentCount = 0;

    if (pool) {
      await initDatabase();
      const result = await pool.query<{ total: string }>("SELECT COUNT(*)::text AS total FROM servers;");
      currentCount = Number(result.rows[0]?.total ?? 0);
    } else {
      currentCount = memoryState.servers.size;
    }

    if (currentCount >= minimumCount) {
      return;
    }

    const crawled = await crawlMcpServers(Math.max(minimumCount, 220));
    await writeServers(crawled);
  })()
    .catch((error) => {
      console.error("Catalog hydration failed", error);
    })
    .finally(() => {
      hydratePromise = null;
    });

  await hydratePromise;
}

function applySearchAndSort(servers: DirectoryServer[], search: string, sort: ServerSort): DirectoryServer[] {
  const lowered = search.trim().toLowerCase();

  const filtered = lowered
    ? servers.filter((server) => {
        return (
          server.name.toLowerCase().includes(lowered) ||
          server.description.toLowerCase().includes(lowered) ||
          server.ownerLogin.toLowerCase().includes(lowered) ||
          server.repoFullName.toLowerCase().includes(lowered) ||
          server.topics.some((topic) => topic.toLowerCase().includes(lowered))
        );
      })
    : servers;

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (sort === "stars") return b.stars - a.stars;
    if (sort === "trust") return b.trustScore - a.trustScore;
    if (sort === "uptime") return b.uptime30d - a.uptime30d;
    return new Date(b.lastCommitAt).getTime() - new Date(a.lastCommitAt).getTime();
  });

  return sorted;
}

export async function listServers(options: {
  search?: string;
  sort?: ServerSort;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; servers: DirectoryServer[] }> {
  const search = options.search ?? "";
  const sort = options.sort ?? "stars";
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  await ensureServerCatalog();

  if (!pool) {
    const sorted = applySearchAndSort(Array.from(memoryState.servers.values()), search, sort);
    return {
      total: sorted.length,
      servers: sorted.slice(offset, offset + limit)
    };
  }

  await initDatabase();

  const orderClause =
    sort === "stars"
      ? "stars DESC, trust_score DESC"
      : sort === "trust"
        ? "trust_score DESC, stars DESC"
        : sort === "uptime"
          ? "uptime_30d DESC, trust_score DESC"
          : "last_commit_at DESC, stars DESC";

  const like = `%${search}%`;
  const whereClause =
    search.trim().length > 0
      ? "WHERE name ILIKE $1 OR description ILIKE $1 OR owner_login ILIKE $1 OR repo_full_name ILIKE $1 OR EXISTS (SELECT 1 FROM unnest(topics) AS topic WHERE topic ILIKE $1)"
      : "";

  const params: Array<string | number> = [];

  if (whereClause) {
    params.push(like);
  }

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM servers ${whereClause};`,
    params
  );

  const listParams = [...params, limit, offset];
  const rowsResult = await pool.query(
    `
      SELECT *
      FROM servers
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2};
    `,
    listParams
  );

  return {
    total: Number(countResult.rows[0]?.total ?? 0),
    servers: rowsResult.rows.map((row) => mapRowToServer(row))
  };
}

export async function getServerById(id: string): Promise<DirectoryServer | null> {
  await ensureServerCatalog();

  if (!pool) {
    return memoryState.servers.get(id) ?? null;
  }

  await initDatabase();
  const result = await pool.query("SELECT * FROM servers WHERE id = $1 LIMIT 1;", [id]);
  if (result.rowCount === 0) return null;
  return mapRowToServer(result.rows[0]);
}

export async function getUptimeCandidates(limit = 60): Promise<DirectoryServer[]> {
  await ensureServerCatalog();

  if (!pool) {
    return Array.from(memoryState.servers.values())
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, limit);
  }

  await initDatabase();
  const result = await pool.query(
    `
      SELECT *
      FROM servers
      ORDER BY trust_score DESC, stars DESC
      LIMIT $1;
    `,
    [limit]
  );

  return result.rows.map((row) => mapRowToServer(row));
}

export async function recordUptimeCheck(input: {
  serverId: string;
  success: boolean;
  statusCode: number;
  responseTimeMs: number;
  checkedAt?: Date;
}): Promise<void> {
  const checkedAt = (input.checkedAt ?? new Date()).toISOString();

  if (!pool) {
    memoryState.checks.push({
      serverId: input.serverId,
      success: input.success,
      statusCode: input.statusCode,
      responseTimeMs: input.responseTimeMs,
      checkedAt
    });

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const related = memoryState.checks.filter(
      (check) => check.serverId === input.serverId && new Date(check.checkedAt).getTime() >= thirtyDaysAgo
    );

    const successCount = related.filter((check) => check.success).length;
    const uptime = related.length > 0 ? (successCount / related.length) * 100 : 0;
    const avgMs = related.length > 0 ? Math.round(related.reduce((sum, check) => sum + check.responseTimeMs, 0) / related.length) : 0;

    const server = memoryState.servers.get(input.serverId);
    if (server) {
      memoryState.servers.set(input.serverId, {
        ...server,
        uptime30d: Number(uptime.toFixed(2)),
        averageResponseMs: avgMs,
        updatedAt: new Date().toISOString()
      });
    }

    return;
  }

  await initDatabase();

  await pool.query(
    `
      INSERT INTO uptime_checks (server_id, checked_at, status_code, response_time_ms, success)
      VALUES ($1, $2, $3, $4, $5);
    `,
    [input.serverId, checkedAt, input.statusCode, input.responseTimeMs, input.success]
  );

  await pool.query(
    `
      WITH stats AS (
        SELECT
          (SUM(CASE WHEN success THEN 1 ELSE 0 END)::double precision / NULLIF(COUNT(*), 0)) * 100 AS uptime,
          AVG(response_time_ms)::integer AS avg_response
        FROM uptime_checks
        WHERE server_id = $1
          AND checked_at >= NOW() - INTERVAL '30 days'
      )
      UPDATE servers
      SET
        uptime_30d = COALESCE((SELECT uptime FROM stats), uptime_30d),
        average_response_ms = COALESCE((SELECT avg_response FROM stats), average_response_ms),
        updated_at = NOW()
      WHERE id = $1;
    `,
    [input.serverId]
  );
}

export async function upsertPurchase(input: AccessPurchase): Promise<void> {
  if (!pool) {
    memoryState.purchases.set(input.email.toLowerCase(), input);
    return;
  }

  await initDatabase();

  await pool.query(
    `
      INSERT INTO purchases (email, org_slug, seat_count, status, source, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (email) DO UPDATE SET
        org_slug = EXCLUDED.org_slug,
        seat_count = EXCLUDED.seat_count,
        status = EXCLUDED.status,
        source = EXCLUDED.source,
        updated_at = NOW();
    `,
    [input.email.toLowerCase(), input.orgSlug, input.seatCount, input.status, input.source]
  );
}

export async function findActivePurchaseByEmail(email: string): Promise<AccessPurchase | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  if (!pool) {
    const value = memoryState.purchases.get(normalized);
    if (!value) return null;
    return value.status === "active" ? value : null;
  }

  await initDatabase();

  const result = await pool.query(
    `
      SELECT email, org_slug, seat_count, status, source, updated_at
      FROM purchases
      WHERE email = $1
        AND status = 'active'
      LIMIT 1;
    `,
    [normalized]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];
  return {
    email: String(row.email),
    orgSlug: String(row.org_slug),
    seatCount: Number(row.seat_count),
    status: "active",
    source: String(row.source) === "lemon-squeezy" ? "lemon-squeezy" : "stripe",
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}
