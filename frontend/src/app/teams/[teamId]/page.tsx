"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { getTeamDetails } from "@/lib/api/endpoints";
import type { TeamDetails } from "@/types/domain";

export default function TeamProfilePage() {
  const params = useParams<{ teamId: string }>();
  const teamId = Number(params.teamId);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<TeamDetails | null>(null);

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
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [teamId]);

  return (
    <PageShell title="Team Profile">
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
