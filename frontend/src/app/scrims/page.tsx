"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AvailabilityCalendar, type CalendarEvent } from "@/components/calendar/availability-calendar";
import { AsyncState } from "@/components/feedback/async-state";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import {
  cancelScrim,
  getMyTeams,
  getTeamAvailability,
  getUpcomingScrims,
  respondToScrimInvite,
  searchPublicTeams,
  updateTeamAvailability,
} from "@/lib/api/endpoints";
import type { AvailabilitySlot, CalendarScrim, Team } from "@/types/domain";

const AUTOCOMPLETE_MIN_CHARS = 2;
const AUTOCOMPLETE_DEBOUNCE_MS = 250;
const SCRIM_EVENT_TYPES = new Set([
  "scrim:invite",
  "scrim:invite:accepted",
  "scrim:invite:rejected",
  "scrim:created",
  "scrim:updated",
  "scrim:confirmed",
  "scrim:canceled",
]);

function buildCalendarMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function isSameLocalDay(iso: string, date: Date) {
  const value = new Date(iso);
  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  );
}

function formatDay(date: Date) {
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getDayWindow(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
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
  const [selectedTeamQuery, setSelectedTeamQuery] = useState("");
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "day">("month");
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDayMineSlots, setSelectedDayMineSlots] = useState<Set<string>>(() => new Set());
  const [dayAvailabilityDirty, setDayAvailabilityDirty] = useState(false);
  const [dayAvailabilitySaving, setDayAvailabilitySaving] = useState(false);
  const [respondingScrimId, setRespondingScrimId] = useState<number | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrims, setScrims] = useState<CalendarScrim[]>([]);

  const loadScrimsForTeam = useCallback(async (teamId: number) => {
    setLoading(true);
    setErrorMessage(null);

    const response = await getUpcomingScrims(teamId);
    if (response.error) {
      setErrorMessage(response.error.message);
      setLoading(false);
      return;
    }

    setScrims(response.data?.scrims ?? []);
    setLoading(false);
  }, []);

  const loadAvailabilityForTeam = useCallback(async (teamId: number, day: Date) => {
    const { start } = getDayWindow(day);
    const response = await getTeamAvailability(teamId, start.toISOString(), 1);
    if (!response.error) {
      setAvailabilitySlots(response.data?.slots ?? []);
      setSelectedDayMineSlots(new Set(response.data?.mine ?? []));
      setDayAvailabilityDirty(false);
    }
  }, []);

  useRealtimeEvents((event) => {
    if (!SCRIM_EVENT_TYPES.has(event.type) || !Number.isInteger(parsedTeamId)) {
      return;
    }

    const affectedTeamIds = new Set<number>();
    for (const teamId of event.teamIds ?? []) {
      if (Number.isInteger(teamId)) {
        affectedTeamIds.add(teamId);
      }
    }
    const team1Id = event.scrim?.team1Id;
    const team2Id = event.scrim?.team2Id;
    if (typeof team1Id === "number" && Number.isInteger(team1Id)) {
      affectedTeamIds.add(team1Id);
    }
    if (typeof team2Id === "number" && Number.isInteger(team2Id)) {
      affectedTeamIds.add(team2Id);
    }

    if (affectedTeamIds.size === 0 || affectedTeamIds.has(parsedTeamId)) {
      void loadScrimsForTeam(parsedTeamId);
      void loadAvailabilityForTeam(parsedTeamId, selectedDay);
    }
  });

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
    const nextQuery = matchedTeam ? matchedTeam.name : teamIdValue;
    setTeamQuery(nextQuery);
    setSelectedTeamQuery(nextQuery);
  }, [myTeams, parsedTeamId, teamIdValue]);

  useEffect(() => {
    const term = teamQuery.trim();
    if (term.length < AUTOCOMPLETE_MIN_CHARS || term === selectedTeamQuery) {
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
  }, [selectedTeamQuery, selectedTitleId, teamQuery]);

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

        const teams = myTeamsResponse.data?.teams ?? [];
        const filtered = selectedTitleId === null ? teams : teams.filter((team) => team.titleId === selectedTitleId);
        setMyTeams(filtered);
        if (filtered.length === 0) {
          setErrorMessage("No team memberships found. Join or create a team first.");
          setLoading(false);
          return;
        }

        const query = selectedTitleId === null ? "" : `&titleId=${selectedTitleId}`;
        router.replace(`/scrims?teamId=${filtered[0].id}${query}`);
        return;
      }

      if (!Number.isInteger(parsedTeamId)) {
        setErrorMessage("Provide an integer teamId query parameter.");
        setLoading(false);
        return;
      }

      await loadScrimsForTeam(parsedTeamId);
      await loadAvailabilityForTeam(parsedTeamId, selectedDay);
    }

    setLoading(true);
    setErrorMessage(null);
    void load();

    return () => {
      mounted = false;
    };
  }, [loadAvailabilityForTeam, loadScrimsForTeam, parsedTeamId, router, selectedDay, selectedTitleId, teamIdValue]);

  const calendarMonth = useMemo(() => {
    const firstScrim = scrims[0] ? new Date(scrims[0].scheduledAt) : selectedDay;
    return buildCalendarMonth(firstScrim);
  }, [scrims, selectedDay]);

  const scrimsByDay = useMemo(() => {
    const map = new Map<string, CalendarScrim[]>();
    for (const scrim of scrims) {
      const date = new Date(scrim.scheduledAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(scrim);
      map.set(key, list);
    }
    return map;
  }, [scrims]);

  const selectedDayScrims = useMemo(
    () => scrims.filter((scrim) => isSameLocalDay(scrim.scheduledAt, selectedDay)),
    [scrims, selectedDay],
  );

  const selectedDayEvents = useMemo<CalendarEvent[]>(
    () =>
      selectedDayScrims.map((scrim) => ({
        id: scrim.id,
        startsAt: scrim.scheduledAt,
        title: `vs ${scrim.opponent.name}`,
        subtitle: formatTime(scrim.scheduledAt),
        status: scrim.status,
      })),
    [selectedDayScrims],
  );

  function setDayAvailabilitySlot(slot: string, shouldSelect: boolean) {
    setSelectedDayMineSlots((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(slot);
      if (shouldSelect && !isSelected) {
        next.add(slot);
      } else if (!shouldSelect && isSelected) {
        next.delete(slot);
      }
      return next;
    });
    setDayAvailabilityDirty(true);
  }

  async function onSaveDayAvailability() {
    if (!Number.isInteger(parsedTeamId)) {
      return;
    }

    const { start, end } = getDayWindow(selectedDay);
    setToastError(null);
    setToastSuccess(null);
    setDayAvailabilitySaving(true);
    const response = await updateTeamAvailability(parsedTeamId, {
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      slots: [...selectedDayMineSlots],
    });
    setDayAvailabilitySaving(false);

    if (response.error) {
      setToastError(response.error.message);
      return;
    }

    setToastSuccess("Availability saved.");
    await loadAvailabilityForTeam(parsedTeamId, selectedDay);
  }

  async function onRespondToInvite(scrimId: number, decision: "accepted" | "rejected") {
    if (!Number.isInteger(parsedTeamId)) {
      return;
    }

    setToastError(null);
    setToastSuccess(null);
    setRespondingScrimId(scrimId);
    const response = await respondToScrimInvite(scrimId, decision);
    setRespondingScrimId(null);

    if (response.error) {
      setToastError(response.error.message);
      return;
    }

    setToastSuccess(decision === "accepted" ? "Scrim invite accepted." : "Scrim invite rejected.");
    await loadScrimsForTeam(parsedTeamId);
  }

  async function onCancelScrim(scrimId: number) {
    if (!Number.isInteger(parsedTeamId)) {
      return;
    }

    setToastError(null);
    setToastSuccess(null);
    setRespondingScrimId(scrimId);
    const response = await cancelScrim(scrimId);
    setRespondingScrimId(null);

    if (response.error) {
      setToastError(response.error.message);
      return;
    }

    setToastSuccess("Scrim canceled.");
    await loadScrimsForTeam(parsedTeamId);
  }

  return (
    <PageShell
      title="Calendar"
      eyebrow="Scrims"
      actions={<Link className="btn-primary" href="/scrims/marketplace">Request scrim</Link>}
    >
      <FormToast message={toastSuccess} tone="success" onClose={() => setToastSuccess(null)} />
      <FormToast message={toastError} tone="error" onClose={() => setToastError(null)} />

      <div className="mb-5 app-card px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-sm">
            <label className="app-label" htmlFor="calendar-team-search">
              Team calendar
            </label>
            <div className="relative">
              <input
                id="calendar-team-search"
                className="app-input"
                value={teamQuery}
                onChange={(event) => {
                  setTeamQuery(event.target.value);
                  setSelectedTeamQuery("");
                }}
                placeholder={`Search teams (${AUTOCOMPLETE_MIN_CHARS}+ chars)`}
              />
              {teamQuery.trim().length >= AUTOCOMPLETE_MIN_CHARS && searchResults.length > 0 ? (
                <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-[var(--border)] bg-white shadow-sm">
                  {searchResults.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--panel-muted)]"
                      onClick={() => {
                        setTeamQuery(team.name);
                        setSelectedTeamQuery(team.name);
                        setSearchResults([]);
                        const query = selectedTitleId === null ? "" : `&titleId=${selectedTitleId}`;
                        router.push(`/scrims?teamId=${team.id}${query}`);
                      }}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {searchLoading ? <p className="mt-2 text-sm text-[var(--muted)]">Searching...</p> : null}
            {searchError ? <p className="mt-2 text-sm text-red-700">{searchError}</p> : null}
          </div>

          <div className="flex rounded-md border border-[var(--border)] bg-white p-1">
            {(["month", "day"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded px-3 py-2 text-sm font-bold capitalize ${
                  viewMode === mode ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                }`}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AsyncState loading={loading} errorMessage={errorMessage} hasData={true}>
        {viewMode === "month" ? (
          <div className="overflow-hidden app-card">
            <div className="grid grid-cols-7 bg-[var(--panel-muted)] text-center text-xs font-bold uppercase text-[var(--muted)]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-3">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarMonth.map((day, index) => {
                const key = day ? `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` : `blank-${index}`;
                const dayScrims = scrimsByDay.get(key) ?? [];
                const selected = day && isSameLocalDay(day.toISOString(), selectedDay);

                return (
                  <button
                    key={key}
                    type="button"
                    className={`min-h-28 border-t border-r border-[var(--border)] p-2 text-left ${
                      selected ? "bg-emerald-50" : "bg-white"
                    }`}
                    disabled={!day}
                    onClick={() => {
                      if (day) {
                        setSelectedDay(day);
                        setViewMode("day");
                      }
                    }}
                  >
                    {day ? (
                      <>
                        <span className="text-xs font-bold text-[var(--muted)]">{day.getDate()}</span>
                        <div className="mt-2 space-y-1">
                          {dayScrims.map((scrim) => (
                            <div key={scrim.id} className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-900">
                              vs {scrim.opponent.name}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <section className="app-card px-5 py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">{formatDay(selectedDay)}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Availability overlap and scheduled scrims</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  type="button"
                  disabled={!dayAvailabilityDirty || dayAvailabilitySaving}
                  onClick={() => void onSaveDayAvailability()}
                >
                  {dayAvailabilitySaving ? "Saving..." : "Save availability"}
                </button>
                <button className="btn-secondary" type="button" onClick={() => setViewMode("month")}>
                  Month view
                </button>
              </div>
            </div>

            <AvailabilityCalendar
              date={selectedDay}
              availabilitySlots={availabilitySlots}
              selectedSlots={selectedDayMineSlots}
              events={selectedDayEvents}
              disabled={dayAvailabilitySaving}
              onSlotChange={setDayAvailabilitySlot}
              renderEventActions={(event) => {
                const scrim = selectedDayScrims.find((item) => item.id === event.id);
                if (!scrim) {
                  return null;
                }

                return (
                  <>
                    {scrim.status === "pending" && scrim.requestedByTeamId === parsedTeamId ? (
                      <span className="status-pill">Awaiting response</span>
                    ) : null}
                    {scrim.status === "pending" && scrim.requestedByTeamId !== parsedTeamId ? (
                      <>
                        <button
                          className="btn-primary px-3 py-1 text-xs"
                          type="button"
                          disabled={respondingScrimId === scrim.id}
                          onClick={() => {
                            if (window.confirm("Accept this scrim invite?")) {
                              void onRespondToInvite(scrim.id, "accepted");
                            }
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-danger"
                          type="button"
                          disabled={respondingScrimId === scrim.id}
                          onClick={() => {
                            if (window.confirm("Reject this scrim invite?")) {
                              void onRespondToInvite(scrim.id, "rejected");
                            }
                          }}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {scrim.status === "confirmed" ? (
                      <button
                        className="btn-danger"
                        type="button"
                        disabled={respondingScrimId === scrim.id}
                        onClick={() => {
                          if (window.confirm("Cancel this accepted scrim?")) {
                            void onCancelScrim(scrim.id);
                          }
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </>
                );
              }}
            />
          </section>
        )}
      </AsyncState>
    </PageShell>
  );
}

export default function ScrimsPage() {
  return (
    <Suspense fallback={<PageShell title="Calendar">Loading page...</PageShell>}>
      <ScrimsPageContent />
    </Suspense>
  );
}
