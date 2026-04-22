import axios from "axios";
import cron from "node-cron";
import { getUptimeCandidates, recordUptimeCheck } from "@/lib/database";

let monitorStarted = false;

function targetUrl(server: { healthcheckUrl: string | null; homepageUrl: string | null; repositoryUrl: string }): string {
  return server.healthcheckUrl || server.homepageUrl || server.repositoryUrl;
}

async function probeUrl(url: string): Promise<{ success: boolean; statusCode: number; responseTimeMs: number }> {
  const startedAt = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 12_000,
      validateStatus: () => true,
      headers: {
        "User-Agent": "mcp-directory-uptime-monitor"
      }
    });

    const responseTimeMs = Date.now() - startedAt;

    return {
      success: response.status >= 200 && response.status < 500,
      statusCode: response.status,
      responseTimeMs
    };
  } catch {
    return {
      success: false,
      statusCode: 0,
      responseTimeMs: Date.now() - startedAt
    };
  }
}

export async function runUptimeSweep(limit = 60): Promise<{ checked: number }> {
  const candidates = await getUptimeCandidates(limit);

  for (const candidate of candidates) {
    const probe = await probeUrl(targetUrl(candidate));

    await recordUptimeCheck({
      serverId: candidate.id,
      success: probe.success,
      statusCode: probe.statusCode,
      responseTimeMs: probe.responseTimeMs
    });
  }

  return { checked: candidates.length };
}

export function ensureUptimeMonitorStarted(): void {
  if (monitorStarted) {
    return;
  }

  monitorStarted = true;

  cron.schedule("*/30 * * * *", () => {
    void runUptimeSweep().catch((error) => {
      console.error("Uptime sweep failed", error);
    });
  });
}
