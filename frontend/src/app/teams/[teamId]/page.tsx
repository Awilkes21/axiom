"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { getTeamDetails, updateTeam } from "@/lib/api/endpoints";
import type { TeamDetails } from "@/types/domain";

export default function TeamProfilePage() {
  const params = useParams<{ teamId: string }>();
  const teamId = Number(params.teamId);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<TeamDetails | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">("private");

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
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [teamId]);

  async function onUpdateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionMessage(null);
    setErrorMessage(null);

    if (!data?.team.id) {
      setErrorMessage("Team not loaded.");
      return;
    }

    if (!editName.trim()) {
      setErrorMessage("Team name is required.");
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
    setActionMessage("Team settings updated.");
  }

  return (
    <PageShell title="Team Profile">
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(data)}>
        {actionMessage ? (
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {actionMessage}
          </p>
        ) : null}

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
          <h2 className="text-lg font-semibold text-slate-900">Update Team</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onUpdateTeam}>
            <label className="text-sm text-slate-700">
              Team Name
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
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
        <div className="mt-2 overflow-hidden rounded-md border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {data?.members.map((member) => (
                <tr key={`${member.accountId}-${member.teamId}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-900">{member.accountId}</td>
                  <td className="px-3 py-2 text-slate-700">{member.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </PageShell>
  );
}
