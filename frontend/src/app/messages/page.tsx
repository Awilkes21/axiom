"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AsyncState } from "@/components/feedback/async-state";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import {
  createConversation,
  getMyTeams,
  listConversationMessages,
  listConversations,
  searchPublicTeams,
  sendConversationMessage,
} from "@/lib/api/endpoints";
import type { Conversation, ConversationMessage, Team } from "@/types/domain";

function messageTypeLabel(type: ConversationMessage["messageType"]) {
  if (type === "scrim_request") {
    return "Scrim request";
  }
  if (type === "scrim_response") {
    return "Scrim response";
  }
  if (type === "system") {
    return "System";
  }
  return "Message";
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [senderTeamId, setSenderTeamId] = useState<number | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [startFromTeamId, setStartFromTeamId] = useState<number | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamSearchResults, setTeamSearchResults] = useState<Team[]>([]);
  const [selectedRecipientTeam, setSelectedRecipientTeam] = useState<Team | null>(null);
  const [startingConversation, setStartingConversation] = useState(false);

  const myTeamIds = useMemo(() => new Set(myTeams.map((team) => team.id)), [myTeams]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const senderOptions = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }
    return [selectedConversation.team1, selectedConversation.team2].filter((team) =>
      myTeamIds.has(team.id),
    );
  }, [myTeamIds, selectedConversation]);

  const loadConversations = useCallback(
    async (preferredConversationId?: number) => {
      const response = await listConversations();
      if (response.error) {
        setErrorMessage(response.error.message);
        return;
      }

      const nextConversations = response.data?.conversations ?? [];
      setConversations(nextConversations);

      const nextSelectedId =
        preferredConversationId ??
        selectedConversationId ??
        nextConversations[0]?.id ??
        null;
      setSelectedConversationId(nextSelectedId);
    },
    [selectedConversationId],
  );

  const loadMessages = useCallback(async (conversationId: number) => {
    setMessagesLoading(true);
    const response = await listConversationMessages(conversationId);
    setMessagesLoading(false);
    if (response.error) {
      setToastError(response.error.message);
      return;
    }
    setMessages(response.data?.messages ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [teamsResponse, conversationsResponse] = await Promise.all([
        getMyTeams(),
        listConversations(),
      ]);

      if (!mounted) {
        return;
      }

      if (teamsResponse.error) {
        setErrorMessage(teamsResponse.error.message);
        setLoading(false);
        return;
      }
      if (conversationsResponse.error) {
        setErrorMessage(conversationsResponse.error.message);
        setLoading(false);
        return;
      }

      const teams = teamsResponse.data?.teams ?? [];
      const nextConversations = conversationsResponse.data?.conversations ?? [];
      setMyTeams(teams);
      setConversations(nextConversations);
      setStartFromTeamId(teams[0]?.id ?? null);
      setSelectedConversationId(nextConversations[0]?.id ?? null);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      void loadMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    if (senderOptions.length > 0 && !senderOptions.some((team) => team.id === senderTeamId)) {
      setSenderTeamId(senderOptions[0].id);
    }
  }, [senderOptions, senderTeamId]);

  useEffect(() => {
    const query = teamSearch.trim();
    if (query.length < 2 || selectedRecipientTeam) {
      setTeamSearchResults([]);
      return;
    }

    let canceled = false;
    const timeout = window.setTimeout(async () => {
      const response = await searchPublicTeams(query);
      if (canceled) {
        return;
      }
      if (response.error) {
        setToastError(response.error.message);
        return;
      }
      setTeamSearchResults(
        (response.data?.teams ?? []).filter((team) => !myTeamIds.has(team.id)).slice(0, 6),
      );
    }, 200);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [myTeamIds, selectedRecipientTeam, teamSearch]);

  useRealtimeEvents((event) => {
    if (event.type !== "message:created") {
      return;
    }
    void loadConversations(event.conversationId);
    if (event.conversationId && event.conversationId === selectedConversationId) {
      void loadMessages(event.conversationId);
    }
  });

  async function onStartConversation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToastMessage(null);
    setToastError(null);

    if (!startFromTeamId || !selectedRecipientTeam) {
      setToastError("Choose your team and a recipient team.");
      return;
    }

    setStartingConversation(true);
    const response = await createConversation(startFromTeamId, selectedRecipientTeam.id);
    setStartingConversation(false);
    if (response.error) {
      setToastError(response.error.message);
      return;
    }

    const conversationId = response.data?.conversationId;
    setToastMessage("Conversation opened.");
    setTeamSearch("");
    setTeamSearchResults([]);
    setSelectedRecipientTeam(null);
    await loadConversations(conversationId);
  }

  async function onSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToastMessage(null);
    setToastError(null);

    const body = draftMessage.trim();
    if (!selectedConversationId || !senderTeamId || !body) {
      return;
    }

    setSending(true);
    const response = await sendConversationMessage(selectedConversationId, senderTeamId, body);
    setSending(false);
    if (response.error) {
      setToastError(response.error.message);
      return;
    }

    setDraftMessage("");
    await loadMessages(selectedConversationId);
    await loadConversations(selectedConversationId);
  }

  return (
    <PageShell title="Messages" eyebrow="Team inbox">
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <FormToast message={toastError} tone="error" onClose={() => setToastError(null)} />

      <AsyncState loading={loading} errorMessage={errorMessage} hasData={true}>
        <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
          <div className="grid gap-5">
            <section className="app-card px-5 py-5">
              <h2 className="section-title">Start Conversation</h2>
              <form className="mt-4 grid gap-3" onSubmit={onStartConversation}>
                <label className="text-sm font-medium text-slate-700">
                  From
                  <select
                    className="app-input mt-1"
                    value={startFromTeamId ?? ""}
                    onChange={(event) => setStartFromTeamId(Number(event.target.value))}
                  >
                    {myTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="relative text-sm font-medium text-slate-700">
                  To
                  <input
                    className="app-input mt-1"
                    value={selectedRecipientTeam?.name ?? teamSearch}
                    onChange={(event) => {
                      setSelectedRecipientTeam(null);
                      setTeamSearch(event.target.value);
                    }}
                    placeholder="Search public teams"
                  />
                  {teamSearchResults.length > 0 ? (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[var(--border)] bg-white shadow-lg">
                      {teamSearchResults.map((team) => (
                        <button
                          key={team.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--panel-muted)]"
                          onClick={() => {
                            setSelectedRecipientTeam(team);
                            setTeamSearchResults([]);
                          }}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={startingConversation || myTeams.length === 0}
                >
                  {startingConversation ? "Opening..." : "Open thread"}
                </button>
              </form>
            </section>

            <section className="app-card px-5 py-5">
              <h2 className="section-title">Threads</h2>
              <div className="mt-4 space-y-2">
                {conversations.map((conversation) => {
                  const active = conversation.id === selectedConversationId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={`w-full rounded-md border px-3 py-3 text-left ${
                        active
                          ? "border-[var(--accent)] bg-emerald-50"
                          : "border-[var(--border)] bg-white hover:bg-[var(--panel-muted)]"
                      }`}
                      onClick={() => setSelectedConversationId(conversation.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-slate-900">{conversation.otherTeam.name}</p>
                        {conversation.latestMessage ? (
                          <span className="text-xs text-slate-500">
                            {formatTimestamp(conversation.latestMessage.createdAt)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {conversation.latestMessage?.body ?? "No messages yet."}
                      </p>
                    </button>
                  );
                })}
                {conversations.length === 0 ? (
                  <p className="text-sm text-slate-600">No team conversations yet.</p>
                ) : null}
              </div>
            </section>
          </div>

          <section className="app-card flex min-h-[620px] flex-col px-5 py-5">
            {selectedConversation ? (
              <>
                <div className="border-b border-[var(--border)] pb-4">
                  <h2 className="section-title">
                    {selectedConversation.team1.name} / {selectedConversation.team2.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Scrim requests and team messages live in the same thread.
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto py-4">
                  {messagesLoading ? (
                    <p className="text-sm text-slate-600">Loading messages...</p>
                  ) : null}
                  {messages.map((message) => {
                    const fromMyTeam = Boolean(message.senderTeamId && myTeamIds.has(message.senderTeamId));
                    return (
                      <div
                        key={message.id}
                        className={`flex ${fromMyTeam ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[720px] rounded-md border px-4 py-3 ${
                            fromMyTeam
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-[var(--border)] bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">
                              {message.senderTeamName ?? "Axiom"}
                            </p>
                            <span className="status-pill">{messageTypeLabel(message.messageType)}</span>
                            <span className="text-xs text-slate-500">
                              {formatTimestamp(message.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                        </div>
                      </div>
                    );
                  })}
                  {!messagesLoading && messages.length === 0 ? (
                    <p className="text-sm text-slate-600">This thread is open. Send the first message.</p>
                  ) : null}
                </div>

                <form className="border-t border-[var(--border)] pt-4" onSubmit={onSendMessage}>
                  <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
                    <select
                      className="app-input"
                      value={senderTeamId ?? ""}
                      onChange={(event) => setSenderTeamId(Number(event.target.value))}
                    >
                      {senderOptions.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="app-input"
                      value={draftMessage}
                      onChange={(event) => setDraftMessage(event.target.value)}
                      placeholder="Type a message"
                      maxLength={2000}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={sending || !draftMessage.trim() || !senderTeamId}
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-slate-600">Open or start a conversation.</p>
              </div>
            )}
          </section>
        </div>
      </AsyncState>
    </PageShell>
  );
}
