import Link from "next/link";
import type { PropsWithChildren } from "react";

type PageShellProps = PropsWithChildren<{
  title: string;
}>;

export function PageShell({ title, children }: PageShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-2 text-sm">
        <Link className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100" href="/">
          Home
        </Link>
        <Link
          className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          href="/dashboard"
        >
          Dashboard
        </Link>
        <Link
          className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          href="/profile"
        >
          User Profile
        </Link>
        <Link
          className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          href="/signup"
        >
          Sign Up
        </Link>
        <Link
          className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          href="/login"
        >
          Login
        </Link>
        <Link
          className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          href="/teams"
        >
          Team Profile
        </Link>
        <Link
          className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          href="/"
        >
          Games
        </Link>
        <Link
          className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          href="/scrims"
        >
          Scrims Calendar
        </Link>
        <Link
          className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          href="/scrims/marketplace"
        >
          Scrim Marketplace
        </Link>
      </nav>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <section className="mt-4">{children}</section>
    </main>
  );
}
