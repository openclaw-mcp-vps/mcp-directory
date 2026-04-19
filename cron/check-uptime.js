#!/usr/bin/env node

const axios = require("axios");
const cron = require("node-cron");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required for cron/check-uptime.js");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false }
});

async function ensureTable() {
  await pool.query(`
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
}

async function checkTarget(url) {
  const started = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: 12000,
      maxRedirects: 4,
      validateStatus: () => true,
      headers: { "user-agent": "mcp-directory-uptime-cron/1.0" }
    });

    return {
      ok: response.status >= 200 && response.status < 500,
      statusCode: response.status,
      latencyMs: Date.now() - started,
      errorMessage: null
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      latencyMs: Date.now() - started,
      errorMessage: error instanceof Error ? error.message : "unknown_error"
    };
  }
}

async function runSweep(limit = 200) {
  await ensureTable();

  const { rows: servers } = await pool.query(
    `
      SELECT id, COALESCE(homepage_url, repo_url) AS target_url
      FROM servers
      ORDER BY trust_score DESC, stars DESC
      LIMIT $1
    `,
    [limit]
  );

  let healthy = 0;

  for (const server of servers) {
    const result = await checkTarget(server.target_url);
    if (result.ok) healthy += 1;

    await pool.query(
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
      [server.id, server.target_url, result.statusCode, result.latencyMs, result.ok, result.errorMessage]
    );
  }

  console.log(`Checked ${servers.length} servers; healthy=${healthy}`);
}

async function main() {
  const watch = process.argv.includes("--watch");
  await runSweep();

  if (!watch) {
    await pool.end();
    return;
  }

  console.log("Watching every 15 minutes (cron expression: */15 * * * *)");
  cron.schedule("*/15 * * * *", async () => {
    try {
      await runSweep();
    } catch (error) {
      console.error("Sweep failed", error);
    }
  });
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
