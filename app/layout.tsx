import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mcp-directory.app"),
  title: {
    default: "MCP Directory",
    template: "%s | MCP Directory"
  },
  description:
    "Curated catalog of 200+ MCP servers with uptime, trust scores, and copy-ready install commands for Claude Code and Cursor power users.",
  applicationName: "MCP Directory",
  keywords: [
    "MCP",
    "Model Context Protocol",
    "MCP server directory",
    "Claude Code",
    "Cursor",
    "developer tools"
  ],
  openGraph: {
    title: "MCP Directory",
    description:
      "Browse MCP servers with trust scores, uptime tracking, and instant install commands. Built for Claude Code and Cursor power users.",
    url: "https://mcp-directory.app",
    siteName: "MCP Directory",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Directory",
    description:
      "The fastest way to find and validate production-ready MCP servers with uptime and trust signals."
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
