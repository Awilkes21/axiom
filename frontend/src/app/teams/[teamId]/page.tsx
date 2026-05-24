"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AsyncState } from "@/components/feedback/async-state";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  addTeamMember,
  getTeamAvailability,
  getTeamDetails,
  leaveTeam,
  removeTeamMember,
  updateTeamAvailability,
  updateTeam,
  updateTeamMemberRole,
} from "@/lib/api/endpoints";
import type { AvailabilitySlot, TeamAvailability, TeamDetails } from "@/types/domain";

const AVAILABILITY_DAYS = 7;
const AVAILABILITY_HOURS = [10, 12, 14, 16, 18, 20];

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
      slots: AVAILABILITY_HOURS.map((hour) => {
        const slot = new Date(day);
        slot.setHours(hour, 0, 0, 0);
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
  const teamId = Number(params.teamId);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<TeamDetails | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("private");
  const [teamFieldErrors, setTeamFieldErrors] = useState<{ name?: string }>({});
  const [newMemberAccountId, setNewMemberAccountId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"player" | "sub" | "coach" | "manager" | "admin">(
    "player",
  );
  const [addingMember, setAddingMember] = useState(false);
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

  useUnsavedChanges(
    Boolean(
      editName !== (data?.team.name ?? "") ||
        editVisibility !== (data?.team.visibility ?? "private") ||
        newMemberAccountId ||
        availabilityDirty,
    ) &&
      !updatingTeam &&
      !addingMember &&
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

  function toggleAvailabilitySlot(slot: string) {
    setSelectedAvailabilitySlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
      } else {
        next.add(slot);
      }
      return next;
    });
    setAvailabilityDirty(true);
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

  async function onAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemberError(null);
    setErrorMessage(null);

    if (!data?.team.id) {
      setMemberError("Team not loaded.");
      return;
    }

    const accountId = Number(newMemberAccountId);
    if (!Number.isInteger(accountId)) {
      setMemberError("Account ID must be an integer.");
      return;
    }

    setAddingMember(true);
    const response = await addTeamMember(data.team.id, accountId, newMemberRole);
    setAddingMember(false);

    if (response.error) {
      setMemberError(response.error.message);
      return;
    }

    setToastMessage("Member added.");
    setNewMemberAccountId("");
    await refreshTeam();
  }

  async function onUpdateMemberRole(accountId: number, role: "player" | "sub" | "coach" | "manager" | "admin") {
    if (!data?.team.id) {
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

    setLeavingTeam(true);
    setMemberError(null);
    const response = await leaveTeam(data.team.id);
    setLeavingTeam(false);
    if (response.error) {
      setMemberError(response.error.message);
      return;
    }

    setToastMessage("You left the team.");
    await refreshTeam();
  }

  return (
    <PageShell title="Team Profile">
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(data)}>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Name</p>
          <p className="text-lg font-medium text-slate-900">{data?.team.name}</p>
          <p className="mt-3 text-sm text-slate-500">Team ID</p>
          <p className="text-slate-900">{data?.team.id}</p>
          <p className="mt-3 text-sm text-slate-500">Visibility</p>
          <p className="text-slate-900">{data?.team.visibility}</p>
          <p className="mt-3 text-sm text-slate-500">Title ID</p>
          <p className="text-slate-900">{data?.team.titleId}</p>
          {data?.team.id ? (
            <Link
              className="mt-4 inline-block rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              href={`/scrims?teamId=${data.team.id}`}
            >
              View Scrim Calendar
            </Link>
          ) : null}
        </div>

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Team Availability</h2>
              <p className="mt-1 text-sm text-slate-600">
                Mark the slots you can play. Darker slots have more overlap.
              </p>
            </div>
            {data?.team.id ? (
              <Link
                className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                href={`/scrims?teamId=${data.team.id}`}
              >
                Schedule Scrim
              </Link>
            ) : null}
          </div>

          {availabilityError ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {availabilityError}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-7 gap-2">
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
                          onClick={() => toggleAvailabilitySlot(slot)}
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
          <h2 className="text-lg font-semibold text-slate-900">Update Team</h2>
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
          <h3 className="text-base font-semibold text-slate-900">Add Member</h3>
          <form className="mt-2 grid gap-3 md:grid-cols-3" onSubmit={onAddMember}>
            <label className="text-sm text-slate-700">
              Account ID
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={newMemberAccountId}
                onChange={(event) => setNewMemberAccountId(event.target.value)}
                placeholder="e.g. 12"
              />
            </label>
            <label className="text-sm text-slate-700">
              Role
              <select
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={newMemberRole}
                onChange={(event) =>
                  setNewMemberRole(
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
                disabled={addingMember}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingMember ? "Adding..." : "Add Member"}
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
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.members.map((member) => (
                <tr key={`${member.accountId}-${member.teamId}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-900">{member.accountId}</td>
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
