"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AsyncState } from "@/components/feedback/async-state";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useBackendHealth } from "@/hooks/use-backend-health";
import { listMyTeamInvitations, respondToTeamInvitation } from "@/lib/api/endpoints";
import type { TeamInvitation } from "@/types/domain";

const actions = [
  { href: "/", label: "Games", metric: "Titles", detail: "Create game-scoped teams" },
  { href: "/teams", label: "Teams", metric: "Rosters", detail: "Manage members and availability" },
  { href: "/scrims", label: "Calendar", metric: "Schedule", detail: "Book and answer scrims" },
  { href: "/scrims/marketplace", label: "Marketplace", metric: "LFS", detail: "Find new opponents" },
];

export default function DashboardPage() {
  const { status, loading, errorMessage } = useBackendHealth();
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [respondingInvitationId, setRespondingInvitationId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function loadInvitations() {
    setInvitationsLoading(true);
    setInvitationsError(null);
    const response = await listMyTeamInvitations();
    setInvitationsLoading(false);

    if (response.error) {
      setInvitationsError(response.error.message);
      return;
    }

    setInvitations(response.data?.invitations ?? []);
  }

  useEffect(() => {
    void loadInvitations();
  }, []);

  async function onRespondToInvitation(invitationId: number, decision: "accepted" | "declined") {
    setRespondingInvitationId(invitationId);
    const response = await respondToTeamInvitation(invitationId, decision);
    setRespondingInvitationId(null);

    if (response.error) {
      setInvitationsError(response.error.message);
      return;
    }

    setToastMessage(decision === "accepted" ? "Invite accepted." : "Invite declined.");
    await loadInvitations();
  }

  return (
    <PageShell title="Dashboard" eyebrow="Overview">
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="app-card px-5 py-5">
          <h2 className="section-title">System Status</h2>
          <div className="mt-4">
            <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(status)}>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-sm font-bold text-emerald-900">Backend</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800">{status}</p>
              </div>
            </AsyncState>
          </div>
        </section>

        <div className="grid gap-5">
          <section className="app-card px-5 py-5">
            <h2 className="section-title">Team Invites</h2>
            <div className="mt-4">
              <AsyncState
                loading={invitationsLoading}
                errorMessage={invitationsError}
                hasData
                emptyMessage={invitations.length === 0 ? "No pending invites." : undefined}
              >
                {invitations.length === 0 ? (
                  <p className="rounded-md border border-[var(--border)] bg-white px-4 py-4 text-sm text-[var(--muted)]">
                    No pending invites.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-3"
                      >
                        <div>
                          <p className="font-bold text-[var(--foreground)]">{invitation.teamName}</p>
                          <p className="text-sm text-[var(--muted)]">{invitation.role}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn-primary px-3 py-2 text-sm"
                            type="button"
                            disabled={respondingInvitationId === invitation.id}
                            onClick={() => void onRespondToInvitation(invitation.id, "accepted")}
                          >
                            Accept
                          </button>
                          <button
                            className="btn-secondary px-3 py-2 text-sm"
                            type="button"
                            disabled={respondingInvitationId === invitation.id}
                            onClick={() => void onRespondToInvitation(invitation.id, "declined")}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AsyncState>
            </div>
          </section>

          <section className="app-card px-5 py-5">
            <h2 className="section-title">Workspace Shortcuts</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {actions.map((item) => (
                <Link
                  key={item.href}
                  className="rounded-md border border-[var(--border)] bg-white px-4 py-4 hover:border-[var(--accent)]"
                  href={item.href}
                >
                  <span className="status-pill">{item.metric}</span>
                  <p className="mt-3 text-lg font-bold text-[var(--foreground)]">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{item.detail}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
