"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallCommandProps {
  command: string;
}

export function InstallCommand({ command }: InstallCommandProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  async function onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
      <div className="flex items-center gap-2">
        <code className="block flex-1 overflow-x-auto whitespace-nowrap text-xs text-cyan-200">{command}</code>
        <Button variant="outline" onClick={onCopy} className="h-8 px-2" aria-label="Copy install command">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
