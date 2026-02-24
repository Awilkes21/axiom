"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

      const teams = teamsResponse.data?.teams ?? [];
      setMyTeams(teams);
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
      setSearchLoading(false);
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

  const visibleMyTeams =
    selectedTitleId === null
      ? myTeams
      : myTeams.filter((team) => team.titleId === selectedTitleId);

  return (
    <PageShell title="Teams">
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={true}>
        <section className="rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">
            My Teams{selectedTitleId !== null ? ` (Game #${selectedTitleId})` : ""}
          </h2>
          {visibleMyTeams.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">You are not on a team yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {visibleMyTeams.map((team) => (
                <li key={team.id}>
                  <Link className="text-slate-900 underline" href={`/teams/${team.id}`}>
                    {team.name} (#{team.id})
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-slate-600">
            Create a new team from the selected game page on <Link href="/" className="underline">Home</Link>.
          </p>
        </section>

        <section className="mt-6 rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Search Public Teams</h2>
          <div className="mt-3">
            <div className="relative w-full max-w-sm">
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder={`Type at least ${AUTOCOMPLETE_MIN_CHARS} characters`}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-expanded={searchTerm.trim().length >= AUTOCOMPLETE_MIN_CHARS}
                aria-controls="teams-search-listbox"
              />
              {searchTerm.trim().length >= AUTOCOMPLETE_MIN_CHARS && !searchError ? (
                <div
                  id="teams-search-listbox"
                  role="listbox"
                  className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-sm"
                >
                  {searchLoading ? (
                    <p className="px-3 py-2 text-sm text-slate-500">Searching...</p>
                  ) : null}

                  {!searchLoading && searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((team) => (
                        <li key={team.id} role="option" aria-selected="false">
                          <Link
                            className="block px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                            href={`/teams/${team.id}`}
                          >
                            {team.name} (#{team.id})
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {!searchLoading && searchResults.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-600">No matching public teams.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {searchError ? (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {searchError}
            </p>
          ) : null}
        </section>
      </AsyncState>
    </PageShell>
  );
}
