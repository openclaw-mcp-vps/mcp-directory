import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { percent } from "@/lib/utils";

interface UptimeBadgeProps {
  uptime: number;
}

export function UptimeBadge({ uptime }: UptimeBadgeProps): React.JSX.Element {
  const isHealthy = uptime >= 99;
  const className = isHealthy
    ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300"
    : uptime >= 97
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      : "border-rose-500/30 bg-rose-500/10 text-rose-300";

  return (
    <Badge className={className}>
      <Activity className="mr-1 h-3.5 w-3.5" />
      {percent(uptime, 2)} uptime
    </Badge>
  );
}
