"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { getMyTeams, getUpcomingScrims, searchPublicTeams } from "@/lib/api/endpoints";
import type { CalendarScrim, Team } from "@/types/domain";

const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 250;

function buildCalendarMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function ScrimsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamIdValue = searchParams.get("teamId") ?? "";
  const titleIdValue = searchParams.get("titleId");
  const parsedTeamId = Number(teamIdValue);
  const parsedTitleId = titleIdValue ? Number(titleIdValue) : null;
  const selectedTitleId =
    parsedTitleId !== null && Number.isInteger(parsedTitleId) ? parsedTitleId : null;

  const [teamQuery, setTeamQuery] = useState("");
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrims, setScrims] = useState<CalendarScrim[]>([]);

  useEffect(() => {
    let active = true;

    async function loadMyTeams() {
      const response = await getMyTeams();
      if (!active || response.error) {
        return;
      }
      const teams = response.data?.teams ?? [];
      setMyTeams(
        selectedTitleId === null
          ? teams
          : teams.filter((team) => team.titleId === selectedTitleId),
      );
    }

    void loadMyTeams();

    return () => {
      active = false;
    };
  }, [selectedTitleId]);

  useEffect(() => {
    if (!teamIdValue) {
      setTeamQuery("");
      return;
    }

    const matchedTeam = myTeams.find((team) => team.id === parsedTeamId);
    if (matchedTeam) {
      setTeamQuery(matchedTeam.name);
    } else {
      setTeamQuery(teamIdValue);
    }
  }, [myTeams, parsedTeamId, teamIdValue]);

  useEffect(() => {
    const term = teamQuery.trim();
    if (term.length < AUTOCOMPLETE_MIN_CHARS) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    let active = true;
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

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

      const teams = response.data?.teams ?? [];
      setSearchResults(
        selectedTitleId === null
          ? teams
          : teams.filter((team) => team.titleId === selectedTitleId),
      );
      setSearchLoading(false);
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [selectedTitleId, teamQuery]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!teamIdValue) {
        const myTeamsResponse = await getMyTeams();
        if (!mounted) {
          return;
        }

        if (myTeamsResponse.error) {
          setErrorMessage(myTeamsResponse.error.message);
          setLoading(false);
          return;
        }

        const myTeams = myTeamsResponse.data?.teams ?? [];
        const filteredMyTeams =
          selectedTitleId === null
            ? myTeams
            : myTeams.filter((team) => team.titleId === selectedTitleId);
        setMyTeams(filteredMyTeams);
        if (filteredMyTeams.length === 0) {
          setErrorMessage("No team memberships found. Join or create a team first.");
          setLoading(false);
          return;
        }

        const query = selectedTitleId === null ? "" : `&titleId=${selectedTitleId}`;
        router.replace(`/scrims?teamId=${filteredMyTeams[0].id}${query}`);
        return;
      }

      if (!Number.isInteger(parsedTeamId)) {
        setErrorMessage("Provide an integer teamId query parameter.");
        setLoading(false);
        return;
      }

      const response = await getUpcomingScrims(parsedTeamId);
      if (!mounted) {
        return;
      }

      if (response.error) {
        setErrorMessage(response.error.message);
        setLoading(false);
        return;
      }

      setScrims(response.data?.scrims ?? []);
      setLoading(false);
    }

    setLoading(true);
    setErrorMessage(null);
    void load();

    return () => {
      mounted = false;
    };
  }, [parsedTeamId, selectedTitleId, teamIdValue, router]);

  const calendarMonth = useMemo(() => {
    const firstScrim = scrims[0] ? new Date(scrims[0].scheduledAt) : new Date();
    return buildCalendarMonth(firstScrim);
  }, [scrims]);

  const scrimsByDay = useMemo(() => {
    const map = new Map<number, CalendarScrim[]>();
    for (const scrim of scrims) {
      const day = new Date(scrim.scheduledAt).getDate();
      const list = map.get(day) ?? [];
      list.push(scrim);
      map.set(day, list);
    }
    return map;
  }, [scrims]);

  return (
    <PageShell title="Scrims Calendar">
      <div className="mb-4 w-full max-w-sm">
        <div className="relative">
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={teamQuery}
            onChange={(event) => setTeamQuery(event.target.value)}
            placeholder={`Search teams (${AUTOCOMPLETE_MIN_CHARS}+ chars)`}
          />

          {teamQuery.trim().length >= AUTOCOMPLETE_MIN_CHARS && !searchError ? (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
              {searchLoading ? (
                <p className="px-3 py-2 text-sm text-slate-500">Searching...</p>
              ) : null}

              {!searchLoading && searchResults.length > 0 ? (
                <ul className="py-1">
                  {searchResults.map((team) => (
                    <li key={team.id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-50"
                        onClick={() => {
                          setTeamQuery(team.name);
                          const query = selectedTitleId === null ? "" : `&titleId=${selectedTitleId}`;
                          router.push(`/scrims?teamId=${team.id}${query}`);
                        }}
                      >
                        {team.name} (#{team.id})
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {!searchLoading && searchResults.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-600">No matching teams.</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {searchError ? (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {searchError}
          </p>
        ) : null}
      </div>

      <AsyncState loading={loading} errorMessage={errorMessage} hasData={scrims.length > 0}>
        <div className="overflow-hidden rounded-md border border-slate-200">
          <div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-medium uppercase text-slate-500">
            <div className="py-2">Sun</div>
            <div className="py-2">Mon</div>
            <div className="py-2">Tue</div>
            <div className="py-2">Wed</div>
            <div className="py-2">Thu</div>
            <div className="py-2">Fri</div>
            <div className="py-2">Sat</div>
          </div>
          <div className="grid grid-cols-7">
            {calendarMonth.map((day, index) => (
              <div key={`${day ?? "blank"}-${index}`} className="min-h-20 border p-2">
                {day ? (
                  <>
                    <p className="text-xs font-medium text-slate-600">{day}</p>
                    {(scrimsByDay.get(day) ?? []).map((scrim) => (
                      <p
                        key={scrim.id}
                        className="mt-1 rounded bg-blue-50 px-1 py-0.5 text-xs text-blue-700"
                      >
                        vs {scrim.opponent.name}
                      </p>
                    ))}
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </AsyncState>
    </PageShell>
  );
}

export default function ScrimsPage() {
  return (
    <Suspense fallback={<PageShell title="Scrims Calendar">Loading page...</PageShell>}>
      <ScrimsPageContent />
    </Suspense>
  );
}
