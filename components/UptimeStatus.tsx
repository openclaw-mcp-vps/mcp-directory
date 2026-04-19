import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type UptimeStatusProps = {
  uptimePercent: number | null;
  lastCheckedAt: string | null;
  lastStatusCode: number | null;
  checks: number;
};

export function UptimeStatus({
  uptimePercent,
  lastCheckedAt,
  lastStatusCode,
  checks
}: UptimeStatusProps) {
  const healthy = (uptimePercent ?? 0) >= 97;
  const needsAttention = uptimePercent !== null && uptimePercent < 90;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-1",
          healthy
            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
            : needsAttention
              ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
              : "border-[var(--border)] bg-white/5 text-[var(--muted)]"
        )}
      >
        <Activity className="mr-1.5 h-3 w-3" />
        {uptimePercent === null ? "No checks yet" : `${uptimePercent.toFixed(2)}% uptime`}
      </span>
      <span className="text-[var(--muted)]">
        {checks > 0 && lastCheckedAt
          ? `${checks} checks, last ${formatDistanceToNow(new Date(lastCheckedAt), {
              addSuffix: true
            })}`
          : "Waiting for uptime monitor"}
      </span>
      {lastStatusCode ? <span className="text-[var(--muted)]">HTTP {lastStatusCode}</span> : null}
    </div>
  );
}
