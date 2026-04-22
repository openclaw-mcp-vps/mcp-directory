import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, DatabaseZap, ShieldCheck, TimerReset } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "MCP Directory — Curated MCP Servers With Uptime + Install Commands",
  description:
    "Browse 200+ MCP servers with uptime checks, trust scoring, and one-click install commands. Built for Claude Code + Cursor teams.",
  openGraph: {
    title: "MCP Directory",
    description:
      "Stop hunting for MCP servers in random repos. Use a curated catalog with live uptime and trust signals.",
    url: "https://mcp-directory.app"
  }
};

const problems = [
  "GitHub search is noisy, so teams waste hours validating random MCP repos.",
  "You can’t quickly tell if a server is actively maintained or abandoned.",
  "Install steps vary by stack, and copy-pasting from READMEs slows adoption.",
  "No single place tracks uptime, trust, and newly released MCP servers."
];

const features = [
  {
    icon: DatabaseZap,
    title: "Curated 200+ Server Catalog",
    description:
      "We crawl GitHub and index high-signal MCP servers across tooling, data, browser automation, and internal ops use cases."
  },
  {
    icon: TimerReset,
    title: "Live Uptime + Last Updated",
    description:
      "Each listing shows recent uptime and freshness so you can avoid dead integrations before rollout."
  },
  {
    icon: ShieldCheck,
    title: "Trust Score From Author Reputation",
    description:
      "Trust scoring blends maintainer reputation, stars, recency, issue pressure, and repository hygiene."
  },
  {
    icon: CheckCircle2,
    title: "One-Click Install Commands",
    description:
      "Every server card includes a copy-ready command so engineers can go from discovery to running code in seconds."
  }
];

const faqs = [
  {
    q: "Who is MCP Directory for?",
    a: "It is built for Claude Code and Cursor power users, plus engineering teams standardizing on MCP for internal workflows."
  },
  {
    q: "What does the paid plan unlock?",
    a: "The paid plan unlocks the full searchable catalog, trust-ranked sorting, uptime telemetry, and team-ready install snippets."
  },
  {
    q: "How is trust calculated?",
    a: "Trust scores combine repository maintenance signals, maintainer profile quality, and project adoption metrics into a 0-100 score."
  },
  {
    q: "Can I use it with my team?",
    a: "Yes. Access is mapped to org seats so teams can adopt a common vetted list instead of each developer doing ad-hoc repo reviews."
  }
];

export default function HomePage(): React.JSX.Element {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="min-h-screen pb-24">
      <section className="grid-lines relative overflow-hidden border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">
              MCP tools, vetted for production
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-50 sm:text-6xl">
              MCP Directory
              <span className="mt-2 block text-cyan-300">Curated MCP servers with uptime + install commands</span>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-slate-300 sm:text-lg">
              Stop guessing which MCP servers are safe to adopt. MCP Directory tracks uptime, repository health, and author trust so
              your team can ship MCP workflows faster.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={paymentLink}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Buy Access ($9/seat/mo)
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/directory"
                className="inline-flex items-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Preview Directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Why teams struggle with MCP discovery</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {problems.map((problem) => (
            <Card key={problem}>
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed text-slate-300">{problem}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">What MCP Directory gives you</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="mb-3 h-5 w-5 text-cyan-300" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20" id="pricing">
        <Card className="border-cyan-400/30 bg-slate-950/90">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-50">Simple pricing for serious MCP users</CardTitle>
            <CardDescription>
              $9 per org seat per month. Includes full access to the directory, trust score ranking, and uptime telemetry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={paymentLink}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Start with Stripe Checkout
              <ArrowRight className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">FAQ</h2>
        <div className="mt-8 grid gap-4">
          {faqs.map((item) => (
            <Card key={item.q}>
              <CardHeader>
                <CardTitle className="text-base">{item.q}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{item.a}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
