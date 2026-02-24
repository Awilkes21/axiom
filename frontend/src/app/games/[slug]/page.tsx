"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AsyncState } from "@/components/feedback/async-state";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { createTeam, getGames, getMyTeams } from "@/lib/api/endpoints";
import type { Game, Team } from "@/types/domain";

export default function GamePage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug ?? "");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ teamName?: string }>({});
  const [games, setGames] = useState<Game[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [creatingTeam, setCreatingTeam] = useState(false);

  useUnsavedChanges(Boolean(teamName) && !creatingTeam);

  useEffect(() => {
    let active = true;

    async function load() {
      const [gamesResponse, teamsResponse] = await Promise.all([getGames(), getMyTeams()]);
      if (!active) {
        return;
      }

      if (gamesResponse.error) {
        setErrorMessage(gamesResponse.error.message);
        setLoading(false);
        return;
      }

      if (teamsResponse.error) {
        setErrorMessage(teamsResponse.error.message);
        setLoading(false);
        return;
      }

      setGames(gamesResponse.data?.games ?? []);
      setMyTeams(teamsResponse.data?.teams ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const selectedGame = useMemo(
    () => games.find((game) => game.slug === slug) ?? null,
    [games, slug],
  );

  const myTeamsForSelectedGame = useMemo(() => {
    if (!selectedGame) {
      return [];
    }
    return myTeams.filter((team) => team.titleId === selectedGame.id);
  }, [myTeams, selectedGame]);

  async function onCreateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setErrorMessage(null);

    if (!selectedGame) {
      setErrorMessage("Selected game not found.");
      return;
    }

    if (!teamName.trim()) {
      setFieldErrors({ teamName: "Team name is required." });
      return;
    }

    setCreatingTeam(true);
    const response = await createTeam(teamName.trim(), selectedGame.id, visibility);
    setCreatingTeam(false);

    if (response.error) {
      setErrorMessage(response.error.message);
      return;
    }

    setToastMessage(`Created team "${response.data?.team.name}" for ${selectedGame.name}.`);
    setTeamName("");
    const teamsResponse = await getMyTeams();
    if (!teamsResponse.error) {
      setMyTeams(teamsResponse.data?.teams ?? []);
    }
  }

  return (
    <PageShell title={selectedGame ? selectedGame.name : "Game"}>
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={true}>
        {!selectedGame ? (
          <p className="text-sm text-slate-600">
            Game not found. Go back to <Link href="/" className="underline">Home</Link>.
          </p>
        ) : (
          <>
            <p className="text-slate-600">
              All options below are scoped to {selectedGame.name}.
            </p>
            <section className="mt-6 rounded-md border border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Team ({selectedGame.name})</h2>
              <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreateTeam}>
                <label className="text-sm text-slate-700">
                  Team Name
                  <input
                    className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Enter team name"
                    aria-invalid={Boolean(fieldErrors.teamName)}
                    aria-describedby={fieldErrors.teamName ? "create-team-name-error" : undefined}
                  />
                  {fieldErrors.teamName ? (
                    <p id="create-team-name-error" className="mt-1 text-xs text-red-700">
                      {fieldErrors.teamName}
                    </p>
                  ) : null}
                </label>
                <label className="text-sm text-slate-700">
                  Visibility
                  <select
                    className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as "public" | "private")}
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </label>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={creatingTeam}
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingTeam ? "Creating..." : "Create Team"}
                  </button>
                </div>
              </form>
            </section>

            <section className="mt-6 rounded-md border border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">Game Options</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Link
                  className="rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                  href={`/teams?titleId=${selectedGame.id}`}
                >
                  Teams ({selectedGame.name})
                </Link>
                <Link
                  className="rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                  href={`/scrims?titleId=${selectedGame.id}`}
                >
                  Scrims Calendar
                </Link>
                <Link
                  className="rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                  href={`/scrims/marketplace?titleId=${selectedGame.id}`}
                >
                  Scrim Marketplace
                </Link>
              </div>
            </section>

            <section className="mt-6 rounded-md border border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">My Teams in {selectedGame.name}</h2>
              {myTeamsForSelectedGame.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No teams yet in this game.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {myTeamsForSelectedGame.map((team) => (
                    <li key={team.id}>
                      <Link className="underline" href={`/teams/${team.id}`}>
                        {team.name} (#{team.id})
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </AsyncState>
    </PageShell>
  );
}
