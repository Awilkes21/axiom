"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { FormToast } from "@/components/feedback/form-toast";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useRealtimeTeamSubscriptions } from "@/hooks/use-realtime-team-subscriptions";

type PageShellProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}>;

const navigation = [
  { href: "/", label: "Games" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/teams", label: "Teams" },
  { href: "/messages", label: "Messages" },
  { href: "/scrims", label: "Calendar" },
  { href: "/scrims/marketplace", label: "Marketplace" },
  { href: "/profile", label: "Profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/scrims") {
    return pathname === "/scrims";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PageShell({ title, eyebrow, actions, children }: PageShellProps) {
  const pathname = usePathname();
  const realtimeNotification = useRealtimeNotifications();
  useRealtimeTeamSubscriptions();

  return (
    <div className="min-h-screen">
      <FormToast
        message={realtimeNotification.message}
        tone={realtimeNotification.tone}
        onClose={realtimeNotification.clear}
      />

      <div className="mx-auto flex w-full max-w-[1440px] gap-6 px-4 py-4 md:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col app-card md:flex">
          <div className="border-b border-[var(--border)] px-5 py-5">
            <Link href="/" className="text-xl font-bold tracking-normal text-[var(--foreground)]">
              Axiom
            </Link>
            <p className="mt-1 text-xs font-medium text-[var(--muted)]">Competitive operations</p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {navigation.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "text-[#3b4944] hover:bg-[var(--panel-muted)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[var(--border)] px-4 py-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs font-bold text-emerald-900">Realtime enabled</p>
              <p className="mt-1 text-xs text-emerald-800">Team updates stream while you work.</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-4 app-card md:hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <Link href="/" className="text-lg font-bold text-[var(--foreground)]">
                Axiom
              </Link>
              <span className="status-pill">Live</span>
            </div>
            <nav className="flex gap-2 overflow-x-auto px-3 py-3">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
                    isActive(pathname, item.href)
                      ? "bg-[var(--accent)] text-white"
                      : "bg-white text-[#3b4944]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <div className="mb-5 flex flex-col gap-3 app-card px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              {eyebrow ? (
                <p className="mb-1 text-xs font-bold uppercase text-[var(--accent)]">{eyebrow}</p>
              ) : null}
              <h1 className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">{title}</h1>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>

          <div className="pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
