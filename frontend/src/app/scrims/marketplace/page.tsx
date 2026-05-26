"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AsyncState } from "@/components/feedback/async-state";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  applyToScrimPost,
  createScrimPost,
  decideScrimApplication,
  getMyTeams,
  listMyScrimApplications,
  listScrimPostApplications,
  listScrimPosts,
} from "@/lib/api/endpoints";
import { getLocalTimezoneLabel, toUtcIsoFromLocalInput } from "@/lib/forms/datetime";
import type { ScrimApplication, ScrimPost, Team } from "@/types/domain";

type ApplicationsByPost = Record<number, ScrimApplication[]>;
type MessageByPost = Record<number, string>;
type RequestStatusByPost = Record<number, ScrimApplication["status"]>;

function isThirtyMinuteLocalInput(value: string) {
  const match = value.match(/T\d{2}:(\d{2})$/);
  return match ? match[1] === "00" || match[1] === "30" : false;
}

export default function ScrimMarketplacePage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTitleId, setSelectedTitleId] = useState<number | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [openPosts, setOpenPosts] = useState<ScrimPost[]>([]);
  const [myHostPosts, setMyHostPosts] = useState<ScrimPost[]>([]);
  const [selectedApplyTeamId, setSelectedApplyTeamId] = useState<number | null>(null);
  const [selectedHostTeamId, setSelectedHostTeamId] = useState<number | null>(null);
  const [applicationMessageByPost, setApplicationMessageByPost] = useState<MessageByPost>({});
  const [applicationsByPost, setApplicationsByPost] = useState<ApplicationsByPost>({});
  const [requestStatusByPost, setRequestStatusByPost] = useState<RequestStatusByPost>({});
  const [createHostTeamId, setCreateHostTeamId] = useState<number | null>(null);
  const [createStartsAt, setCreateStartsAt] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [posting, setPosting] = useState(false);
  const [applyingPostId, setApplyingPostId] = useState<number | null>(null);
  const [decidingApplicationId, setDecidingApplicationId] = useState<number | null>(null);
  const [requestedPostIds, setRequestedPostIds] = useState<Set<number>>(() => new Set());
  const [createFieldErrors, setCreateFieldErrors] = useState<{
    hostTeamId?: string;
    startsAt?: string;
    notes?: string;
  }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  useUnsavedChanges(Boolean(createStartsAt || createNotes) && !posting);

  const loadOpenPosts = useCallback(async (titleId: number | null) => {
    const postsResponse = await listScrimPosts({
      status: "open",
      titleId: titleId ?? undefined,
    });
    if (postsResponse.error) {
      setErrorMessage(postsResponse.error.message);
      return;
    }
    setOpenPosts(postsResponse.data?.posts ?? []);
  }, []);

  const loadMyHostPosts = useCallback(async (hostTeamId: number) => {
    const postsResponse = await listScrimPosts({ hostTeamId, status: "open" });
    if (postsResponse.error) {
      setErrorMessage(postsResponse.error.message);
      return;
    }
    setMyHostPosts(postsResponse.data?.posts ?? []);
  }, []);

  const loadMyApplications = useCallback(async () => {
    const response = await listMyScrimApplications();
    if (response.error) {
      setErrorMessage(response.error.message);
      return;
    }

    const next: RequestStatusByPost = {};
    for (const application of response.data?.applications ?? []) {
      next[application.scrimPostId] = application.status;
    }
    setRequestStatusByPost(next);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const titleIdValue =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("titleId")
          : null;
      const parsedTitleId = titleIdValue ? Number(titleIdValue) : null;
      const gameTitleId =
        parsedTitleId !== null && Number.isInteger(parsedTitleId) ? parsedTitleId : null;
      setSelectedTitleId(gameTitleId);

      const teamsResponse = await getMyTeams();
      if (!mounted) {
        return;
      }

      if (teamsResponse.error) {
        setErrorMessage(teamsResponse.error.message);
        setLoading(false);
        return;
      }

      const allTeams = teamsResponse.data?.teams ?? [];
      const teams =
        gameTitleId === null ? allTeams : allTeams.filter((team) => team.titleId === gameTitleId);
      setMyTeams(teams);
      if (teams.length > 0) {
        setSelectedApplyTeamId(teams[0].id);
        setSelectedHostTeamId(teams[0].id);
        setCreateHostTeamId(teams[0].id);
      }

      await loadOpenPosts(gameTitleId);
      await loadMyApplications();
      if (teams.length > 0) {
        await loadMyHostPosts(teams[0].id);
      }
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [loadMyApplications, loadMyHostPosts, loadOpenPosts]);

  const filteredOpenPosts = useMemo(() => {
    const term = filterText.trim().toLowerCase();
    const myTeamIds = new Set(myTeams.map((team) => team.id));
    const visiblePosts = openPosts.filter((post) => !myTeamIds.has(post.hostTeamId));

    if (!term) {
      return visiblePosts;
    }

    return visiblePosts.filter((post) => {
      const haystack = `${post.hostTeamName} ${post.titleName} ${post.notes ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [filterText, myTeams, openPosts]);

  async function onCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateFieldErrors({});
    setToastMessage(null);
    setToastError(null);

    if (!createHostTeamId || !createStartsAt) {
      setCreateFieldErrors({
        hostTeamId: !createHostTeamId ? "Host team is required." : undefined,
        startsAt: !createStartsAt ? "Start time is required." : undefined,
      });
      return;
    }

    if (createNotes.length > 500) {
      setCreateFieldErrors({ notes: "Notes must be 500 characters or less." });
      return;
    }

    if (!isThirtyMinuteLocalInput(createStartsAt)) {
      setCreateFieldErrors({ startsAt: "Choose a start time on the hour or half-hour." });
      return;
    }

    const startsAtIso = toUtcIsoFromLocalInput(createStartsAt);
    if (!startsAtIso) {
      setCreateFieldErrors({
        startsAt: !startsAtIso ? "Start time is invalid." : undefined,
      });
      return;
    }

    const endsAtIso = new Date(new Date(startsAtIso).getTime() + 2 * 60 * 60 * 1000).toISOString();

    setPosting(true);
    const response = await createScrimPost(createHostTeamId, startsAtIso, endsAtIso, createNotes);
    setPosting(false);
    if (response.error) {
      setToastError(response.error.message);
      return;
    }

    setToastMessage("LFS posted.");
    setCreateNotes("");
    setCreateStartsAt("");
    await loadOpenPosts(selectedTitleId);
    if (selectedHostTeamId) {
      await loadMyHostPosts(selectedHostTeamId);
    }
  }

  async function onApply(postId: number) {
    setToastMessage(null);
    setToastError(null);

    if (!selectedApplyTeamId) {
      setToastError("Select a team to apply with.");
      return;
    }

    setApplyingPostId(postId);
    const response = await applyToScrimPost(
      postId,
      selectedApplyTeamId,
      applicationMessageByPost[postId] ?? "",
    );
    setApplyingPostId(null);
    if (response.error) {
      setToastError(response.error.message);
      return;
    }

    setToastMessage("Scrim request submitted.");
    setRequestedPostIds((prev) => new Set(prev).add(postId));
    setRequestStatusByPost((prev) => ({
      ...prev,
      [postId]: response.data?.application.status ?? "pending",
    }));
    setApplicationMessageByPost((prev) => ({ ...prev, [postId]: "" }));
  }

  async function onLoadApplications(postId: number) {
    setErrorMessage(null);

    const response = await listScrimPostApplications(postId);
    if (response.error) {
      setErrorMessage(response.error.message);
      return;
    }

    setApplicationsByPost((prev) => ({
      ...prev,
      [postId]: response.data?.applications ?? [],
    }));
  }

  async function onDecideApplication(
    postId: number,
    applicationId: number,
    decision: "accepted" | "rejected",
  ) {
    setToastMessage(null);
    setToastError(null);

    setDecidingApplicationId(applicationId);
    const response = await decideScrimApplication(applicationId, decision);
    setDecidingApplicationId(null);
    if (response.error) {
      setToastError(response.error.message);
      return;
    }

    setToastMessage(decision === "accepted" ? "Application accepted." : "Application rejected.");
    await onLoadApplications(postId);
    await loadOpenPosts(selectedTitleId);
    if (selectedHostTeamId) {
      await loadMyHostPosts(selectedHostTeamId);
    }
  }

  return (
    <PageShell
      title="Marketplace"
      eyebrow="Scrims"
      actions={<Link className="btn-secondary" href="/scrims">Calendar</Link>}
    >
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <FormToast message={toastError} tone="error" onClose={() => setToastError(null)} />

      <AsyncState loading={loading} errorMessage={errorMessage} hasData={true}>
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-5">
        <section className="app-card px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Available Requests</h2>
            {selectedTitleId !== null ? <span className="status-pill">Filtered</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              className="app-input max-w-sm"
              placeholder="Filter by team, title, notes"
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
            />
            <select
              className="app-input max-w-sm"
              value={selectedApplyTeamId ?? ""}
              onChange={(event) => setSelectedApplyTeamId(Number(event.target.value))}
            >
              {myTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  Apply as: {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {filteredOpenPosts.map((post) => {
              const requestStatus = requestStatusByPost[post.id];
              const hasSubmittedRequest = Boolean(requestStatus) || requestedPostIds.has(post.id);

              return (
                <div key={post.id} className="rounded-md border border-[var(--border)] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--foreground)]">{post.hostTeamName}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{post.titleName} | {new Date(post.startsAt).toLocaleString()}</p>
                    </div>
                    {hasSubmittedRequest ? <span className="status-pill">Request {requestStatus ?? "submitted"}</span> : null}
                  </div>
                  {post.notes ? <p className="mt-3 text-sm text-slate-700">{post.notes}</p> : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      className="app-input max-w-sm"
                      placeholder="Optional message"
                      value={applicationMessageByPost[post.id] ?? ""}
                      onChange={(event) =>
                        setApplicationMessageByPost((prev) => ({
                          ...prev,
                          [post.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={applyingPostId === post.id || hasSubmittedRequest}
                      onClick={() => void onApply(post.id)}
                    >
                      {hasSubmittedRequest
                        ? "Request sent"
                        : applyingPostId === post.id
                          ? "Requesting..."
                          : "Request"}
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredOpenPosts.length === 0 ? (
              <p className="text-sm text-slate-600">No open scrim requests match this filter.</p>
            ) : null}
          </div>
        </section>

        <section className="app-card px-5 py-5">
          <h2 className="section-title">My Posted Requests</h2>
          <div className="mt-3">
            <select
              className="app-input max-w-sm"
              value={selectedHostTeamId ?? ""}
              onChange={async (event) => {
                const nextId = Number(event.target.value);
                setSelectedHostTeamId(nextId);
                await loadMyHostPosts(nextId);
              }}
            >
              {myTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  Host team: {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {myHostPosts.map((post) => (
              <div key={post.id} className="rounded-md border border-[var(--border)] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">
                    {new Date(post.startsAt).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-sm"
                    onClick={() => void onLoadApplications(post.id)}
                  >
                    Applications
                  </button>
                </div>

                {(applicationsByPost[post.id] ?? []).length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {applicationsByPost[post.id].map((application) => (
                      <li key={application.id} className="rounded-md border border-[var(--border)] bg-[var(--panel-muted)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{application.requestingTeamName}</p>
                          <span className="status-pill">{application.status}</span>
                        </div>
                        {application.message ? (
                          <p className="mt-2 text-sm text-slate-700">{application.message}</p>
                        ) : null}
                        {application.status === "pending" ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="btn-primary px-3 py-2 text-sm"
                              disabled={decidingApplicationId === application.id}
                              onClick={() => {
                                if (window.confirm("Accept this scrim application?")) {
                                  void onDecideApplication(post.id, application.id, "accepted");
                                }
                              }}
                            >
                              {decidingApplicationId === application.id ? "Saving..." : "Accept"}
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              disabled={decidingApplicationId === application.id}
                              onClick={() => {
                                if (window.confirm("Reject this scrim application?")) {
                                  void onDecideApplication(post.id, application.id, "rejected");
                                }
                              }}
                            >
                              {decidingApplicationId === application.id ? "Saving..." : "Reject"}
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            {myHostPosts.length === 0 ? (
              <p className="text-sm text-slate-600">No open posts for this host team.</p>
            ) : null}
          </div>
        </section>
          </div>

        <section className="app-card px-5 py-5">
          <h2 className="section-title">Post Opening</h2>
          <p className="mt-1 text-xs text-slate-500">
            Local time: {getLocalTimezoneLabel()}
          </p>
          <form className="mt-3 grid gap-3" onSubmit={onCreatePost}>
            <label className="text-sm text-slate-700">
              Host Team
              <select
                className="app-input mt-1"
                value={createHostTeamId ?? ""}
                onChange={(event) => setCreateHostTeamId(Number(event.target.value))}
                aria-invalid={Boolean(createFieldErrors.hostTeamId)}
                aria-describedby={createFieldErrors.hostTeamId ? "marketplace-host-team-error" : undefined}
              >
                {myTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {createFieldErrors.hostTeamId ? (
                <p id="marketplace-host-team-error" className="mt-1 text-xs text-red-700">
                  {createFieldErrors.hostTeamId}
                </p>
              ) : null}
            </label>
            <label className="text-sm text-slate-700">
              Starts At
              <input
                className="app-input mt-1"
                type="datetime-local"
                step={1800}
                value={createStartsAt}
                onChange={(event) => setCreateStartsAt(event.target.value)}
                aria-invalid={Boolean(createFieldErrors.startsAt)}
                aria-describedby={createFieldErrors.startsAt ? "marketplace-starts-at-error" : undefined}
              />
              {createFieldErrors.startsAt ? (
                <p id="marketplace-starts-at-error" className="mt-1 text-xs text-red-700">
                  {createFieldErrors.startsAt}
                </p>
              ) : null}
            </label>
            <label className="text-sm text-slate-700">
              Notes
              <input
                className="app-input mt-1"
                value={createNotes}
                onChange={(event) => setCreateNotes(event.target.value)}
                placeholder="Map pool, rules, contact, etc."
                aria-invalid={Boolean(createFieldErrors.notes)}
                aria-describedby={createFieldErrors.notes ? "marketplace-notes-error" : undefined}
              />
              {createFieldErrors.notes ? (
                <p id="marketplace-notes-error" className="mt-1 text-xs text-red-700">
                  {createFieldErrors.notes}
                </p>
              ) : null}
            </label>
            <div>
              <button
                type="submit"
                disabled={posting}
                className="btn-primary"
              >
                {posting ? "Posting..." : "Post LFS"}
              </button>
            </div>
          </form>
        </section>
        </div>
      </AsyncState>
    </PageShell>
  );
}
