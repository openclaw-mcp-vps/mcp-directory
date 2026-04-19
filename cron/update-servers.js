#!/usr/bin/env node

const { Octokit } = require("@octokit/rest");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required for cron/update-servers.js");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false }
});

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined });

function inferInstallCommand(owner, repo, language) {
  const packageNameGuess = `@${owner}/${repo}`;
  if (language === "Python") return `uvx ${packageNameGuess}`;
  if (language === "Go") return `go install github.com/${owner}/${repo}@latest`;
  if (language === "Rust") return `cargo install --git https://github.com/${owner}/${repo}`;
  return `npx -y ${packageNameGuess}`;
}

function trustScore(repo) {
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  const issues = repo.open_issues_count || 0;
  const freshnessDays = Math.max(0, (Date.now() - new Date(repo.pushed_at || repo.updated_at).getTime()) / 86400000);
  const score =
    Math.min(35, Math.log10(stars + 1) * 13) +
    Math.min(15, Math.log10(forks + 1) * 8) +
    Math.max(0, 22 - freshnessDays / 6) +
    (repo.owner?.type === "Organization" ? 8 : 4) +
    (repo.homepage ? 6 : 0) +
    (repo.license ? 6 : 0) -
    Math.min(12, issues * 0.35);

  return Math.max(1, Math.min(100, Math.round(score)));
}

async function ensureTables() {
  await pool.query(`
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
}

async function run() {
  await ensureTables();

  let total = 0;

  for (let page = 1; page <= 3; page += 1) {
    const res = await octokit.search.repos({
      q: "mcp (server OR protocol) in:name,description,readme archived:false",
      sort: "stars",
      order: "desc",
      per_page: 100,
      page
    });

    for (const repo of res.data.items) {
      if (repo.fork) continue;

      const owner = repo.owner?.login || "unknown";
      const id = `${owner}/${repo.name}`;
      const slug = (repo.full_name || id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

      await pool.query(
        `
          INSERT INTO servers (
            id, name, slug, description, repo_url, homepage_url, author_login,
            stars, forks, open_issues, language, topics, install_command, trust_score,
            pushed_at, created_at_github, last_crawled_at, updated_at
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
          id,
          repo.full_name || id,
          slug,
          repo.description || "Production-grade MCP server",
          repo.html_url,
          repo.homepage || null,
          owner,
          repo.stargazers_count || 0,
          repo.forks_count || 0,
          repo.open_issues_count || 0,
          repo.language || null,
          repo.topics || [],
          inferInstallCommand(owner, repo.name, repo.language),
          trustScore(repo),
          repo.pushed_at || repo.updated_at,
          repo.created_at
        ]
      );

      total += 1;
    }
  }

  await pool.end();
  console.log(`Updated ${total} MCP repositories`);
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
