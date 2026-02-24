"use client";

import { useEffect, useMemo, useState } from "react";
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
  listScrimPostApplications,
  listScrimPosts,
} from "@/lib/api/endpoints";
import { getLocalTimezoneLabel, toUtcIsoFromLocalInput } from "@/lib/forms/datetime";
import type { ScrimApplication, ScrimPost, Team } from "@/types/domain";

type ApplicationsByPost = Record<number, ScrimApplication[]>;
type MessageByPost = Record<number, string>;

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
  const [createHostTeamId, setCreateHostTeamId] = useState<number | null>(null);
  const [createStartsAt, setCreateStartsAt] = useState("");
  const [createEndsAt, setCreateEndsAt] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [posting, setPosting] = useState(false);
  const [applyingPostId, setApplyingPostId] = useState<number | null>(null);
  const [decidingApplicationId, setDecidingApplicationId] = useState<number | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<{
    hostTeamId?: string;
    startsAt?: string;
    endsAt?: string;
    notes?: string;
  }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  useUnsavedChanges(Boolean(createStartsAt || createEndsAt || createNotes) && !posting);

  async function loadOpenPosts(titleId: number | null = selectedTitleId) {
    const postsResponse = await listScrimPosts({
      status: "open",
      titleId: titleId ?? undefined,
    });
    if (postsResponse.error) {
      setErrorMessage(postsResponse.error.message);
      return;
    }
    setOpenPosts(postsResponse.data?.posts ?? []);
  }

  async function loadMyHostPosts(hostTeamId: number) {
    const postsResponse = await listScrimPosts({ hostTeamId, status: "open" });
    if (postsResponse.error) {
      setErrorMessage(postsResponse.error.message);
      return;
    }
    setMyHostPosts(postsResponse.data?.posts ?? []);
  }

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
      if (teams.length > 0) {
        await loadMyHostPosts(teams[0].id);
      }
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOpenPosts = useMemo(() => {
    const term = filterText.trim().toLowerCase();
    if (!term) {
      return openPosts;
    }

    return openPosts.filter((post) => {
      const haystack = `${post.hostTeamName} ${post.titleName} ${post.notes ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [filterText, openPosts]);

  async function onCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateFieldErrors({});
    setToastMessage(null);
    setToastError(null);

    if (!createHostTeamId || !createStartsAt || !createEndsAt) {
      setCreateFieldErrors({
        hostTeamId: !createHostTeamId ? "Host team is required." : undefined,
        startsAt: !createStartsAt ? "Start time is required." : undefined,
        endsAt: !createEndsAt ? "End time is required." : undefined,
      });
      return;
    }

    if (createNotes.length > 500) {
      setCreateFieldErrors({ notes: "Notes must be 500 characters or less." });
      return;
    }

    const startsAtIso = toUtcIsoFromLocalInput(createStartsAt);
    const endsAtIso = toUtcIsoFromLocalInput(createEndsAt);
    if (!startsAtIso || !endsAtIso) {
      setCreateFieldErrors({
        startsAt: !startsAtIso ? "Start time is invalid." : undefined,
        endsAt: !endsAtIso ? "End time is invalid." : undefined,
      });
      return;
    }

    if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      setCreateFieldErrors({ endsAt: "End time must be after start time." });
      return;
    }

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
    setCreateEndsAt("");
    await loadOpenPosts();
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
    await loadOpenPosts();
    if (selectedHostTeamId) {
      await loadMyHostPosts(selectedHostTeamId);
    }
  }

  return (
    <PageShell title="Scrim Marketplace">
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <FormToast message={toastError} tone="error" onClose={() => setToastError(null)} />
      <p className="text-slate-600">
        Post open scrim requests, browse available requests, and review incoming applications.
      </p>
      {selectedTitleId !== null ? (
        <p className="mt-2 text-sm text-slate-600">Filtered to game ID: {selectedTitleId}</p>
      ) : null}
      <p className="mt-2 text-sm text-slate-600">
        Scheduled scrims calendar: <Link href="/scrims" className="underline">/scrims</Link>
      </p>

      <AsyncState loading={loading} errorMessage={errorMessage} hasData={true}>
        <section className="mt-6 rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Post Scrim Request</h2>
          <p className="mt-1 text-xs text-slate-500">
            Time is entered in your local timezone ({getLocalTimezoneLabel()}) and stored as UTC.
          </p>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreatePost}>
            <label className="text-sm text-slate-700">
              Host Team
              <select
                className="mt-1 block w-full rounded border border-slate-300 px-2 py-2"
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
                className="mt-1 block w-full rounded border border-slate-300 px-2 py-2"
                type="datetime-local"
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
              Ends At
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-2 py-2"
                type="datetime-local"
                value={createEndsAt}
                onChange={(event) => setCreateEndsAt(event.target.value)}
                aria-invalid={Boolean(createFieldErrors.endsAt)}
                aria-describedby={createFieldErrors.endsAt ? "marketplace-ends-at-error" : undefined}
              />
              {createFieldErrors.endsAt ? (
                <p id="marketplace-ends-at-error" className="mt-1 text-xs text-red-700">
                  {createFieldErrors.endsAt}
                </p>
              ) : null}
            </label>
            <label className="text-sm text-slate-700">
              Notes
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-2 py-2"
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
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={posting}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                {posting ? "Posting..." : "Post LFS"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Available Scrim Requests</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              className="rounded border border-slate-300 px-2 py-2 text-sm"
              placeholder="Filter by team, title, notes"
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
            />
            <select
              className="rounded border border-slate-300 px-2 py-2 text-sm"
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
            {filteredOpenPosts.map((post) => (
              <div key={post.id} className="rounded border border-slate-200 p-3">
                <p className="text-sm text-slate-600">
                  {post.titleName} | Host: {post.hostTeamName}
                </p>
                <p className="text-sm text-slate-900">
                  {new Date(post.startsAt).toLocaleString()} to {new Date(post.endsAt).toLocaleString()}
                </p>
                {post.notes ? <p className="mt-1 text-sm text-slate-700">{post.notes}</p> : null}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    className="w-full max-w-sm rounded border border-slate-300 px-2 py-1 text-sm"
                    placeholder="Optional application message"
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
                    className="rounded bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={applyingPostId === post.id}
                    onClick={() => void onApply(post.id)}
                  >
                    {applyingPostId === post.id ? "Requesting..." : "Request Scrim"}
                  </button>
                </div>
              </div>
            ))}
            {filteredOpenPosts.length === 0 ? (
              <p className="text-sm text-slate-600">No open scrim requests match this filter.</p>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-md border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">My Posted Requests</h2>
          <div className="mt-3">
            <select
              className="rounded border border-slate-300 px-2 py-2 text-sm"
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
              <div key={post.id} className="rounded border border-slate-200 p-3">
                <p className="text-sm text-slate-900">
                  Post #{post.id} | {new Date(post.startsAt).toLocaleString()}
                </p>
                <button
                  type="button"
                  className="mt-2 rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
                  onClick={() => void onLoadApplications(post.id)}
                >
                  Load Applications
                </button>

                {(applicationsByPost[post.id] ?? []).length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {applicationsByPost[post.id].map((application) => (
                      <li key={application.id} className="rounded border border-slate-200 p-2">
                        <p className="text-sm text-slate-900">
                          {application.requestingTeamName} ({application.status})
                        </p>
                        {application.message ? (
                          <p className="text-sm text-slate-700">{application.message}</p>
                        ) : null}
                        {application.status === "pending" ? (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              className="rounded bg-emerald-700 px-2 py-1 text-sm text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={decidingApplicationId === application.id}
                              onClick={() => void onDecideApplication(post.id, application.id, "accepted")}
                            >
                              {decidingApplicationId === application.id ? "Saving..." : "Accept"}
                            </button>
                            <button
                              type="button"
                              className="rounded bg-rose-700 px-2 py-1 text-sm text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={decidingApplicationId === application.id}
                              onClick={() => void onDecideApplication(post.id, application.id, "rejected")}
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
      </AsyncState>
    </PageShell>
  );
}
