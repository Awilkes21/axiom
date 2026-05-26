"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AsyncState } from "@/components/feedback/async-state";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  createTeamInvitation,
  getTeamAvailability,
  getTeamDetails,
  leaveTeam,
  removeTeamMember,
  searchAccounts,
  updateTeamAvailability,
  updateTeam,
  updateTeamMemberRole,
} from "@/lib/api/endpoints";
import type { AccountSearchResult, AvailabilitySlot, TeamAvailability, TeamDetails } from "@/types/domain";

const AVAILABILITY_DAYS = 7;
const AVAILABILITY_HOURS = Array.from({ length: 32 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
});
const ACCOUNT_SEARCH_MIN_CHARS = 2;
const ACCOUNT_SEARCH_DEBOUNCE_MS = 250;

function getAvailabilityWindowStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildAvailabilityGrid(windowStart: Date) {
  return Array.from({ length: AVAILABILITY_DAYS }, (_, dayIndex) => {
    const day = addDays(windowStart, dayIndex);
    return {
      date: day,
      slots: AVAILABILITY_HOURS.map(({ hour, minute }) => {
        const slot = new Date(day);
        slot.setHours(hour, minute, 0, 0);
        return slot.toISOString();
      }),
    };
  });
}

function formatSlotHour(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatSlotDay(date: Date) {
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function TeamProfilePage() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const teamId = Number(params.teamId);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<TeamDetails | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("private");
  const [teamFieldErrors, setTeamFieldErrors] = useState<{ name?: string }>({});
  const [inviteAccountId, setInviteAccountId] = useState("");
  const [inviteAccountQuery, setInviteAccountQuery] = useState("");
  const [inviteAccountResults, setInviteAccountResults] = useState<AccountSearchResult[]>([]);
  const [inviteAccountSearchLoading, setInviteAccountSearchLoading] = useState(false);
  const [inviteAccountSearchError, setInviteAccountSearchError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<"player" | "sub" | "coach" | "manager" | "admin">(
    "player",
  );
  const [sendingInvite, setSendingInvite] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberRoleSubmittingId, setMemberRoleSubmittingId] = useState<number | null>(null);
  const [memberRemoveSubmittingId, setMemberRemoveSubmittingId] = useState<number | null>(null);
  const [leavingTeam, setLeavingTeam] = useState(false);
  const [availability, setAvailability] = useState<TeamAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedAvailabilitySlots, setSelectedAvailabilitySlots] = useState<Set<string>>(
    () => new Set(),
  );
  const [availabilityDirty, setAvailabilityDirty] = useState(false);
  const [availabilityPaintMode, setAvailabilityPaintMode] = useState<"add" | "remove" | null>(
    null,
  );

  useUnsavedChanges(
    Boolean(
        editName !== (data?.team.name ?? "") ||
        editVisibility !== (data?.team.visibility ?? "private") ||
        inviteAccountQuery ||
        availabilityDirty,
    ) &&
      !updatingTeam &&
      !sendingInvite &&
      !availabilitySaving,
  );

  const availabilityWindowStart = useMemo(() => getAvailabilityWindowStart(), []);
  const availabilityWindowEnd = useMemo(
    () => addDays(availabilityWindowStart, AVAILABILITY_DAYS),
    [availabilityWindowStart],
  );
  const availabilityGrid = useMemo(
    () => buildAvailabilityGrid(availabilityWindowStart),
    [availabilityWindowStart],
  );
  const availabilityBySlot = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    for (const slot of availability?.slots ?? []) {
      map.set(slot.startsAt, slot);
    }
    return map;
  }, [availability]);

  useEffect(() => {
    const query = inviteAccountQuery.trim();
    if (query.length < ACCOUNT_SEARCH_MIN_CHARS || inviteAccountId) {
      setInviteAccountResults([]);
      setInviteAccountSearchLoading(false);
      setInviteAccountSearchError(null);
      return;
    }

    let active = true;
    const timeoutId = setTimeout(async () => {
      setInviteAccountSearchLoading(true);
      setInviteAccountSearchError(null);
      const response = await searchAccounts(query);
      if (!active) {
        return;
      }

      setInviteAccountSearchLoading(false);
      if (response.error) {
        setInviteAccountSearchError(response.error.message);
        setInviteAccountResults([]);
        return;
      }

      setInviteAccountResults(response.data?.accounts ?? []);
    }, ACCOUNT_SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [inviteAccountId, inviteAccountQuery]);

  async function refreshTeam() {
    if (!Number.isInteger(teamId)) {
      return;
    }

    const response = await getTeamDetails(teamId);
    if (!response.error && response.data) {
      setData(response.data);
      setEditName(response.data.team.name);
      setEditVisibility(response.data.team.visibility);
    }
  }

  const loadAvailability = useCallback(async () => {
    if (!Number.isInteger(teamId)) {
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError(null);
    const response = await getTeamAvailability(
      teamId,
      availabilityWindowStart.toISOString(),
      AVAILABILITY_DAYS,
    );
    setAvailabilityLoading(false);

    if (response.error) {
      setAvailabilityError(response.error.message);
      return;
    }

    if (response.data) {
      setAvailability(response.data);
      setSelectedAvailabilitySlots(new Set(response.data.mine));
      setAvailabilityDirty(false);
    }
  }, [availabilityWindowStart, teamId]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!Number.isInteger(teamId)) {
        setErrorMessage("Invalid team ID.");
        setLoading(false);
        return;
      }

      const response = await getTeamDetails(teamId);
      if (!mounted) {
        return;
      }

      if (response.error) {
        setErrorMessage(response.error.message);
        setLoading(false);
        return;
      }

      setData(response.data);
      setEditName(response.data?.team.name ?? "");
      setEditVisibility(response.data?.team.visibility ?? "private");
      setLoading(false);
      void loadAvailability();
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [loadAvailability, teamId]);

  function setAvailabilitySlot(slot: string, shouldSelect: boolean) {
    setSelectedAvailabilitySlots((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(slot);
      if (shouldSelect && !isSelected) {
        next.add(slot);
      } else if (!shouldSelect && isSelected) {
        next.delete(slot);
      }
      return next;
    });
    setAvailabilityDirty(true);
  }

  function toggleAvailabilitySlot(slot: string) {
    setAvailabilitySlot(slot, !selectedAvailabilitySlots.has(slot));
  }

  function beginAvailabilityPaint(slot: string) {
    const nextMode = selectedAvailabilitySlots.has(slot) ? "remove" : "add";
    setAvailabilityPaintMode(nextMode);
    setAvailabilitySlot(slot, nextMode === "add");
  }

  function paintAvailabilitySlot(slot: string) {
    if (!availabilityPaintMode) {
      return;
    }

    setAvailabilitySlot(slot, availabilityPaintMode === "add");
  }

  async function onSaveAvailability() {
    if (!Number.isInteger(teamId)) {
      return;
    }

    setAvailabilitySaving(true);
    setAvailabilityError(null);
    const response = await updateTeamAvailability(teamId, {
      windowStart: availabilityWindowStart.toISOString(),
      windowEnd: availabilityWindowEnd.toISOString(),
      slots: [...selectedAvailabilitySlots],
    });
    setAvailabilitySaving(false);

    if (response.error) {
      setAvailabilityError(response.error.message);
      return;
    }

    setToastMessage("Availability saved.");
    await loadAvailability();
  }

  async function onUpdateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeamFieldErrors({});
    setErrorMessage(null);
    setMemberError(null);

    if (!data?.team.id) {
      setErrorMessage("Team not loaded.");
      return;
    }

    if (!editName.trim()) {
      setTeamFieldErrors({ name: "Team name is required." });
      return;
    }

    setUpdatingTeam(true);
    const response = await updateTeam(data.team.id, {
      name: editName.trim(),
      visibility: editVisibility,
    });
    setUpdatingTeam(false);

    if (response.error) {
      setErrorMessage(response.error.message);
      return;
    }

    setData((prev) =>
      prev
        ? {
            ...prev,
            team: response.data?.team ?? prev.team,
          }
        : prev,
    );
    setToastMessage("Team settings updated.");
  }

  async function onInviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemberError(null);
    setErrorMessage(null);

    if (!data?.team.id) {
      setMemberError("Team not loaded.");
      return;
    }

    const accountId = Number(inviteAccountId);
    if (!Number.isInteger(accountId)) {
      setMemberError("Select a player from the search results.");
      return;
    }

    setSendingInvite(true);
    const response = await createTeamInvitation(data.team.id, accountId, inviteRole);
    setSendingInvite(false);

    if (response.error) {
      setMemberError(response.error.message);
      return;
    }

    setToastMessage("Invite sent.");
    setInviteAccountId("");
    setInviteAccountQuery("");
  }

  async function onUpdateMemberRole(accountId: number, role: "player" | "sub" | "coach" | "manager" | "admin") {
    if (!data?.team.id) {
      return;
    }

    const member = data.members.find((item) => item.accountId === accountId);
    const touchesAdmin = member?.role === "admin" || role === "admin" || member?.role === "manager" || role === "manager";
    if (touchesAdmin && !window.confirm("Change this member's team permissions?")) {
      return;
    }

    setMemberRoleSubmittingId(accountId);
    setMemberError(null);
    const response = await updateTeamMemberRole(data.team.id, accountId, role);
    setMemberRoleSubmittingId(null);

    if (response.error) {
      setMemberError(response.error.message);
      return;
    }

    setToastMessage("Member role updated.");
    await refreshTeam();
  }

  async function onRemoveMember(accountId: number) {
    if (!data?.team.id) {
      return;
    }

    if (!window.confirm("Remove this member from the team?")) {
      return;
    }

    setMemberRemoveSubmittingId(accountId);
    setMemberError(null);
    const response = await removeTeamMember(data.team.id, accountId);
    setMemberRemoveSubmittingId(null);

    if (response.error) {
      setMemberError(response.error.message);
      return;
    }

    setToastMessage("Member removed.");
    await refreshTeam();
  }

  async function onLeaveTeam() {
    if (!data?.team.id) {
      return;
    }

    if (!window.confirm("Leave this team?")) {
      return;
    }

    setLeavingTeam(true);
    setMemberError(null);
    const response = await leaveTeam(data.team.id);
    setLeavingTeam(false);
    if (response.error) {
      setMemberError(response.error.message);
      return;
    }

    setToastMessage("You left the team.");
    router.push("/teams");
  }

  return (
    <PageShell
      title={data?.team.name ?? "Team"}
      eyebrow="Team operations"
      actions={
        data?.team.id ? (
          <Link className="btn-primary" href={`/scrims?teamId=${data.team.id}`}>
            Calendar
          </Link>
        ) : null
      }
    >
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(data)}>
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Team Availability</h2>
              <p className="mt-1 text-sm text-slate-600">Drag across slots to mark when you can play.</p>
            </div>
            {data?.team.id ? (
              <Link
                className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                href={`/scrims?teamId=${data.team.id}`}
              >
                View Calendar
              </Link>
            ) : null}
          </div>

          {availabilityError ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {availabilityError}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <div
              className="grid min-w-[720px] grid-cols-7 gap-2"
              onPointerLeave={() => setAvailabilityPaintMode(null)}
              onPointerUp={() => setAvailabilityPaintMode(null)}
            >
              {availabilityGrid.map((day) => (
                <div key={day.date.toISOString()}>
                  <p className="mb-2 text-center text-xs font-medium text-slate-600">
                    {formatSlotDay(day.date)}
                  </p>
                  <div className="space-y-2">
                    {day.slots.map((slot) => {
                      const aggregate = availabilityBySlot.get(slot);
                      const isMine = selectedAvailabilitySlots.has(slot);
                      const availableCount = aggregate?.availableCount ?? 0;
                      const memberCount = aggregate?.memberCount ?? data?.members.length ?? 0;
                      const isAllAvailable = aggregate?.allAvailable ?? false;
                      const className = isAllAvailable
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : availableCount > 0
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700";

                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`w-full rounded border px-2 py-2 text-left text-xs ${className} ${
                            isMine ? "ring-2 ring-slate-900 ring-offset-1" : ""
                          }`}
                          disabled={availabilityLoading || availabilitySaving}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            beginAvailabilityPaint(slot);
                          }}
                          onPointerEnter={() => paintAvailabilitySlot(slot)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleAvailabilitySlot(slot);
                            }
                          }}
                        >
                          <span className="block font-medium">{formatSlotHour(slot)}</span>
                          <span className="block">
                            {availableCount}/{memberCount} available
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!availabilityDirty || availabilitySaving || availabilityLoading}
              onClick={() => void onSaveAvailability()}
            >
              {availabilitySaving ? "Saving..." : "Save Availability"}
            </button>
            {availabilityLoading ? <p className="text-sm text-slate-600">Loading availability...</p> : null}
          </div>
        </section>

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Team Settings</h2>
            <div className="flex flex-wrap gap-2">
              <span className="status-pill">{data?.team.visibility}</span>
            </div>
          </div>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onUpdateTeam}>
            <label className="text-sm text-slate-700">
              Team Name
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                aria-invalid={Boolean(teamFieldErrors.name)}
                aria-describedby={teamFieldErrors.name ? "team-name-error" : undefined}
              />
              {teamFieldErrors.name ? (
                <p id="team-name-error" className="mt-1 text-xs text-red-700">
                  {teamFieldErrors.name}
                </p>
              ) : null}
            </label>
            <label className="text-sm text-slate-700">
              Visibility
              <select
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={editVisibility}
                onChange={(event) =>
                  setEditVisibility(event.target.value as "public" | "private")
                }
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={updatingTeam}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingTeam ? "Saving..." : "Save Team"}
              </button>
            </div>
          </form>
        </section>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Members</h2>
        <section className="mt-2 rounded-md border border-slate-200 bg-white p-4">
          <h3 className="text-base font-semibold text-slate-900">Invite Member</h3>
          <form className="mt-2 grid gap-3 md:grid-cols-3" onSubmit={onInviteMember}>
            <label className="text-sm text-slate-700">
              Player
              <div className="relative mt-1">
                <input
                  className="block w-full rounded border border-slate-300 px-3 py-2"
                  value={inviteAccountQuery}
                  onChange={(event) => {
                    setInviteAccountQuery(event.target.value);
                    setInviteAccountId("");
                  }}
                  placeholder="Search by name or email"
                />
                {inviteAccountResults.length > 0 ? (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
                    {inviteAccountResults.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setInviteAccountId(String(account.id));
                          setInviteAccountQuery(account.displayName || account.email);
                          setInviteAccountResults([]);
                        }}
                      >
                        <span className="block font-medium text-slate-900">{account.displayName || account.email}</span>
                        <span className="block text-xs text-slate-500">{account.email}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {inviteAccountSearchLoading ? <p className="mt-1 text-xs text-slate-500">Searching...</p> : null}
              {inviteAccountSearchError ? <p className="mt-1 text-xs text-red-700">{inviteAccountSearchError}</p> : null}
            </label>
            <label className="text-sm text-slate-700">
              Role
              <select
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(
                    event.target.value as "player" | "sub" | "coach" | "manager" | "admin",
                  )
                }
              >
                <option value="player">player</option>
                <option value="sub">sub</option>
                <option value="coach">coach</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <div className="self-end">
              <button
                type="submit"
                disabled={sendingInvite}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingInvite ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
          {memberError ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {memberError}
            </p>
          ) : null}
        </section>

        <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Player</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.members.map((member) => (
                <tr key={`${member.accountId}-${member.teamId}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-900">
                    <span className="block font-medium">{member.displayName || member.email || "Unknown player"}</span>
                    {member.email ? <span className="block text-xs text-slate-500">{member.email}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <select
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                      value={member.role}
                      disabled={memberRoleSubmittingId === member.accountId}
                      onChange={(event) =>
                        void onUpdateMemberRole(
                          member.accountId,
                          event.target.value as
                            | "player"
                            | "sub"
                            | "coach"
                            | "manager"
                            | "admin",
                        )
                      }
                    >
                      <option value="player">player</option>
                      <option value="sub">sub</option>
                      <option value="coach">coach</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <button
                      type="button"
                      className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      disabled={memberRemoveSubmittingId === member.accountId}
                      onClick={() => void onRemoveMember(member.accountId)}
                    >
                      {memberRemoveSubmittingId === member.accountId ? "Removing..." : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            disabled={leavingTeam}
            onClick={() => void onLeaveTeam()}
          >
            {leavingTeam ? "Leaving..." : "Leave Team"}
          </button>
        </div>
      </AsyncState>
    </PageShell>
  );
}
