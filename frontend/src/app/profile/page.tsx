"use client";

import { useEffect, useState } from "react";
import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUser } from "@/lib/api/endpoints";
import type { User } from "@/types/domain";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const response = await getCurrentUser();
      if (!mounted) {
        return;
      }

      if (response.error) {
        setErrorMessage(response.error.message);
        setLoading(false);
        return;
      }

      setUser(response.data?.user ?? null);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PageShell title="User Profile">
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(user)}>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Account ID</p>
          <p className="text-lg font-medium text-slate-900">{user?.id}</p>
          <p className="mt-3 text-sm text-slate-500">Email</p>
          <p className="text-slate-900">{user?.email}</p>
          <p className="mt-3 text-sm text-slate-500">Display Name</p>
          <p className="text-slate-900">{user?.displayName ?? "Not set"}</p>
        </div>
      </AsyncState>
    </PageShell>
  );
}
