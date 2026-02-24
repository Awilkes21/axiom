"use client";

import Link from "next/link";
import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { useBackendHealth } from "@/hooks/use-backend-health";

export default function DashboardPage() {
  const { status, loading, errorMessage } = useBackendHealth();

  return (
    <PageShell title="Dashboard">
      <p className="mb-4 text-slate-600">
        API integration status and entry points for the current app routes.
      </p>

      <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(status)}>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Backend health: {status}
        </div>
      </AsyncState>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Link className="rounded-md border border-slate-200 p-3 hover:bg-slate-50" href="/profile">
          Open User Profile
        </Link>
        <Link className="rounded-md border border-slate-200 p-3 hover:bg-slate-50" href="/teams">
          Open Team Profile
        </Link>
        <Link className="rounded-md border border-slate-200 p-3 hover:bg-slate-50" href="/scrims">
          Open Scrims
        </Link>
        <Link
          className="rounded-md border border-slate-200 p-3 hover:bg-slate-50"
          href="/scrims/marketplace"
        >
          Open Marketplace
        </Link>
      </div>
    </PageShell>
  );
}
