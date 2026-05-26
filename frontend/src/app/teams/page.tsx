"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { getMyTeams, searchPublicTeams } from "@/lib/api/endpoints";
import type { Team } from "@/types/domain";

const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 250;

export default function TeamsPage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTitleId, setSelectedTitleId] = useState<number | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const titleIdValue = new URLSearchParams(window.location.search).get("titleId");
    const parsed = titleIdValue ? Number(titleIdValue) : null;
    setSelectedTitleId(parsed !== null && Number.isInteger(parsed) ? parsed : null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const teamsResponse = await getMyTeams();
      if (!mounted) {
        return;
      }

      if (teamsResponse.error) {
        setErrorMessage(teamsResponse.error.message);
        setLoading(false);
        return;
      }

      setMyTeams(teamsResponse.data?.teams ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();

    if (term.length < AUTOCOMPLETE_MIN_CHARS) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let active = true;
    const timeoutId = setTimeout(async () => {
      setSearchError(null);
      setSearchLoading(true);

      const response = await searchPublicTeams(term);
      if (!active) {
        return;
      }

      if (response.error) {
        setSearchError(response.error.message);
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      const results = response.data?.teams ?? [];
      setSearchResults(
        selectedTitleId === null
          ? results
          : results.filter((team) => team.titleId === selectedTitleId),
      );
      setSearchLoading(false);
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [searchTerm, selectedTitleId]);

  const visibleMyTeams = useMemo(
    () =>
      selectedTitleId === null
        ? myTeams
        : myTeams.filter((team) => team.titleId === selectedTitleId),
    [myTeams, selectedTitleId],
  );

  return (
    <PageShell
      title="Teams"
      eyebrow="Roster operations"
      actions={<Link className="btn-secondary" href="/">Create from game</Link>}
    >
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={true}>
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <section className="app-card px-5 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">My Teams</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {selectedTitleId !== null ? `Filtered to game #${selectedTitleId}` : "All memberships"}
                </p>
              </div>
              <span className="status-pill">{visibleMyTeams.length} teams</span>
            </div>

            {visibleMyTeams.length === 0 ? (
              <div className="app-card-muted px-4 py-4 text-sm text-[var(--muted)]">
                You are not on a team yet.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {visibleMyTeams.map((team) => (
                  <Link
                    key={team.id}
                    className="rounded-md border border-[var(--border)] bg-white px-4 py-4 hover:border-[var(--accent)]"
                    href={`/teams/${team.id}`}
                  >
                    <span className="status-pill">{team.visibility}</span>
                    <p className="mt-3 text-lg font-bold text-[var(--foreground)]">{team.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Open roster and availability</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="app-card px-5 py-5">
            <h2 className="section-title">Find Public Teams</h2>
            <div className="mt-4">
              <label className="app-label" htmlFor="team-search">
                Search
              </label>
              <input
                id="team-search"
                className="app-input"
                placeholder={`Type at least ${AUTOCOMPLETE_MIN_CHARS} characters`}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {searchError ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {searchError}
              </p>
            ) : null}

            <div className="mt-4 space-y-2">
              {searchLoading ? <p className="text-sm text-[var(--muted)]">Searching...</p> : null}
              {!searchLoading && searchTerm.trim().length >= AUTOCOMPLETE_MIN_CHARS && searchResults.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No matching public teams.</p>
              ) : null}
              {searchResults.map((team) => (
                <Link
                  key={team.id}
                  className="block rounded-md border border-[var(--border)] bg-white px-3 py-3 hover:border-[var(--accent)]"
                  href={`/teams/${team.id}`}
                >
                  <p className="font-bold text-[var(--foreground)]">{team.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Public roster</p>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </AsyncState>
    </PageShell>
  );
}
