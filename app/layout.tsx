import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "MCP Directory | Curated MCP Servers with Uptime and Install Commands",
  description:
    "Browse vetted MCP servers with live uptime, trust scoring, last-updated data, and one-click install commands for Claude Code and Cursor.",
  openGraph: {
    title: "MCP Directory",
    description:
      "Curated MCP servers with uptime tracking, trust score, and one-click install commands.",
    url: "/",
    siteName: "MCP Directory",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Directory",
    description:
      "Find reliable MCP servers faster. Live uptime, trust scores, and install commands in one place."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
