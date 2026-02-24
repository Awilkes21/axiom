"use client";

import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { useBackendHealth } from "@/hooks/use-backend-health";

export default function DashboardPage() {
  const { status, loading, errorMessage } = useBackendHealth();

  return (
    <PageShell title="Dashboard">
      <p className="mb-4 text-slate-600">
        API integration baseline with loading and error handling.
      </p>

      <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(status)}>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Backend health: {status}
        </div>
      </AsyncState>
    </PageShell>
  );
}
