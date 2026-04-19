import { Pool, type QueryResultRow } from "pg";
import { randomUUID } from "crypto";

export const DATABASE_ENABLED = Boolean(process.env.DATABASE_URL);

declare global {
  // eslint-disable-next-line no-var
  var __mcpDirectoryPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __mcpDirectoryInitialized: boolean | undefined;
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!global.__mcpDirectoryPool) {
    global.__mcpDirectoryPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl:
        process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1")
          ? false
          : { rejectUnauthorized: false }
    });
  }

  return global.__mcpDirectoryPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function ensureDatabase(): Promise<void> {
  if (!DATABASE_ENABLED) {
    return;
  }

  if (global.__mcpDirectoryInitialized) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      seat_count INTEGER NOT NULL DEFAULT 1,
      subscription_status TEXT NOT NULL DEFAULT 'inactive',
      lemon_customer_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS paywall_sessions (
      id TEXT PRIMARY KEY,
      org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
      org_name TEXT NOT NULL,
      email TEXT,
      order_id TEXT,
      checkout_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      repo_url TEXT NOT NULL,
      homepage_url TEXT,
      author_login TEXT NOT NULL,
      stars INTEGER NOT NULL DEFAULT 0,
      forks INTEGER NOT NULL DEFAULT 0,
      open_issues INTEGER NOT NULL DEFAULT 0,
      language TEXT,
      topics TEXT[] NOT NULL DEFAULT '{}',
      install_command TEXT NOT NULL,
      trust_score INTEGER NOT NULL DEFAULT 0,
      pushed_at TIMESTAMPTZ,
      created_at_github TIMESTAMPTZ,
      last_crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS uptime_checks (
      id BIGSERIAL PRIMARY KEY,
      server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      target_url TEXT NOT NULL,
      status_code INTEGER,
      latency_ms INTEGER,
      ok BOOLEAN NOT NULL,
      error_message TEXT,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(
    `CREATE INDEX IF NOT EXISTS idx_servers_stars ON servers (stars DESC);`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_servers_trust ON servers (trust_score DESC);`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_uptime_server_checked ON uptime_checks (server_id, checked_at DESC);`
  );

  global.__mcpDirectoryInitialized = true;
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}
