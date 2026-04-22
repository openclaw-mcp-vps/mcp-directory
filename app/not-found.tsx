import Link from "next/link";

export default function NotFound(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-semibold text-slate-50">Not Found</h1>
      <p className="mt-3 text-sm text-slate-400">The requested MCP server page could not be found.</p>
      <Link href="/directory" className="mt-6 text-cyan-300 hover:text-cyan-200">
        Return to directory
      </Link>
    </main>
  );
}
