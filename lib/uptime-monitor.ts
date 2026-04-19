import axios from "axios";
import { DATABASE_ENABLED, ensureDatabase, query } from "@/lib/database";

export type UptimeSummary = {
  serverId: string;
  checks: number;
  passCount: number;
  uptimePercent: number;
  lastCheckedAt: string | null;
  lastStatusCode: number | null;
  lastLatencyMs: number | null;
};

export async function checkSingleUrl(targetUrl: string): Promise<{
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
}> {
  const start = Date.now();

  try {
    const response = await axios.get(targetUrl, {
      timeout: 12_000,
      maxRedirects: 4,
      validateStatus: () => true,
      headers: {
        "user-agent": "mcp-directory-uptime-monitor/1.0"
      }
    });

    const latencyMs = Date.now() - start;

    return {
      ok: response.status >= 200 && response.status < 500,
      statusCode: response.status,
      latencyMs,
      errorMessage: null
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const message = error instanceof Error ? error.message : "unknown_error";
    return {
      ok: false,
      statusCode: null,
      latencyMs,
      errorMessage: message
    };
  }
}

export async function runUptimeSweep(limit = 200): Promise<{
  checked: number;
  healthy: number;
}> {
  if (!DATABASE_ENABLED) {
    return { checked: 0, healthy: 0 };
  }

  await ensureDatabase();

  const servers = await query<{
    id: string;
    repo_url: string;
    homepage_url: string | null;
  }>(
    `
      SELECT id, repo_url, homepage_url
      FROM servers
      ORDER BY trust_score DESC, stars DESC
      LIMIT $1
    `,
    [limit]
  );

  let healthy = 0;

  for (const server of servers) {
    const targetUrl = server.homepage_url || server.repo_url;
    const result = await checkSingleUrl(targetUrl);

    if (result.ok) {
      healthy += 1;
    }

    await query(
      `
        INSERT INTO uptime_checks (
          server_id,
          target_url,
          status_code,
          latency_ms,
          ok,
          error_message,
          checked_at
        ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
      `,
      [
        server.id,
        targetUrl,
        result.statusCode,
        result.latencyMs,
        result.ok,
        result.errorMessage
      ]
    );
  }

  return {
    checked: servers.length,
    healthy
  };
}

export async function getUptimeSummary(serverId: string): Promise<UptimeSummary | null> {
  if (!DATABASE_ENABLED) {
    return null;
  }

  await ensureDatabase();

  const aggregate = await query<{
    checks: string;
    pass_count: string;
    uptime_percent: string;
  }>(
    `
      SELECT
        COUNT(*)::text AS checks,
        COALESCE(SUM(CASE WHEN ok THEN 1 ELSE 0 END), 0)::text AS pass_count,
        COALESCE(ROUND(100.0 * AVG(CASE WHEN ok THEN 1 ELSE 0 END), 2), 0)::text AS uptime_percent
      FROM (
        SELECT ok
        FROM uptime_checks
        WHERE server_id = $1
        ORDER BY checked_at DESC
        LIMIT 120
      ) recent
    `,
    [serverId]
  );

  if (!aggregate[0]) {
    return null;
  }

  const latest = await query<{
    checked_at: string;
    status_code: number | null;
    latency_ms: number | null;
  }>(
    `
      SELECT checked_at, status_code, latency_ms
      FROM uptime_checks
      WHERE server_id = $1
      ORDER BY checked_at DESC
      LIMIT 1
    `,
    [serverId]
  );

  return {
    serverId,
    checks: Number(aggregate[0].checks),
    passCount: Number(aggregate[0].pass_count),
    uptimePercent: Number(aggregate[0].uptime_percent),
    lastCheckedAt: latest[0]?.checked_at ?? null,
    lastStatusCode: latest[0]?.status_code ?? null,
    lastLatencyMs: latest[0]?.latency_ms ?? null
  };
}
