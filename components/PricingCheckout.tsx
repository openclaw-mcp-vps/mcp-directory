"use client";

import { useMemo, useState } from "react";
import Script from "next/script";
import { Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PricingCheckoutProps = {
  compact?: boolean;
};

type CheckoutResponse = {
  checkoutUrl: string;
  sessionId: string;
  mode: "lemon" | "demo";
};

export function PricingCheckout({ compact = false }: PricingCheckoutProps) {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const disabled = useMemo(
    () => loading || orgName.trim().length < 2 || !email.includes("@"),
    [email, loading, orgName]
  );

  async function pollStatus(sessionId: string) {
    const started = Date.now();

    while (Date.now() - started < 8 * 60 * 1000) {
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const res = await fetch(`/api/checkout/status?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "GET",
        cache: "no-store"
      });

      if (!res.ok) {
        continue;
      }

      const payload = (await res.json()) as { paid: boolean };
      if (payload.paid) {
        window.location.href = "/directory";
        return;
      }
    }

    setHint("Checkout opened, but payment confirmation has not arrived yet. Finish payment and retry.");
  }

  async function startCheckout() {
    try {
      setLoading(true);
      setError(null);
      setHint("Creating secure checkout...");

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          orgName,
          email
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Unable to initialize checkout.");
      }

      const payload = (await response.json()) as CheckoutResponse;

      const maybeWindow = window as Window & {
        LemonSqueezy?: {
          Url?: {
            Open: (url: string) => void;
          };
        };
        createLemonSqueezy?: () => void;
      };

      maybeWindow.createLemonSqueezy?.();
      if (payload.mode === "lemon" && maybeWindow.LemonSqueezy?.Url?.Open) {
        maybeWindow.LemonSqueezy.Url.Open(payload.checkoutUrl);
      } else {
        window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
      }

      setHint("Waiting for payment confirmation...");
      void pollStatus(payload.sessionId);
    } catch (checkoutError) {
      const message = checkoutError instanceof Error ? checkoutError.message : "Checkout failed.";
      setError(message);
      setHint(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
      <Input
        placeholder="Organization name"
        value={orgName}
        onChange={(event) => setOrgName(event.target.value)}
      />
      <Input
        type="email"
        placeholder="Work email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button disabled={disabled} className="h-11 w-full" onClick={startCheckout}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        Start 14-day trial then $9/seat
      </Button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {hint ? <p className="text-sm text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}
