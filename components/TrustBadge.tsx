import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trustLabel } from "@/lib/trust-score";

interface TrustBadgeProps {
  score: number;
}

export function TrustBadge({ score }: TrustBadgeProps): React.JSX.Element {
  const highTrust = score >= 70;

  return (
    <Badge className={highTrust ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}>
      {highTrust ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <ShieldAlert className="mr-1 h-3.5 w-3.5" />}
      {trustLabel(score)} ({score})
    </Badge>
  );
}
