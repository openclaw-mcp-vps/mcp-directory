"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallCommandProps = {
  command: string;
};

export function InstallCommand({ command }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/35 p-3">
      <div className="mb-2 text-xs text-[var(--muted)]">Install command</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <code className="overflow-auto rounded-md bg-black/60 px-2 py-1 text-xs text-sky-300">
          {command}
        </code>
        <Button variant="outline" className="h-9 min-w-24" onClick={copyCommand}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
