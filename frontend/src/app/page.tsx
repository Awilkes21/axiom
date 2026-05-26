"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { getGames } from "@/lib/api/endpoints";
import { getAuthToken } from "@/lib/auth/token";
import type { Game } from "@/types/domain";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    setIsSignedIn(Boolean(getAuthToken()));
    let active = true;

    async function load() {
      const response = await getGames();
      if (!active) {
        return;
      }

      if (response.error) {
        setErrorMessage(response.error.message);
        setLoading(false);
        return;
      }

      setGames(response.data?.games ?? []);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell
      title="Games"
      eyebrow="Axiom"
      actions={
        isSignedIn ? (
          <Link className="btn-primary" href="/dashboard">Open dashboard</Link>
        ) : (
          <>
            <Link className="btn-secondary" href="/login">Sign in</Link>
            <Link className="btn-primary" href="/signup">Create account</Link>
          </>
        )
      }
    >
      <section className="app-card px-5 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Game Workspaces</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Choose a title before creating teams or finding scrims.</p>
            </div>
            <span className="status-pill">{games.length} titles</span>
          </div>

          <AsyncState loading={loading} errorMessage={errorMessage} hasData={games.length > 0}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {games.map((game) => (
                <Link
                  key={game.id}
                  className="rounded-md border border-[var(--border)] bg-white p-4 transition hover:border-[var(--accent)] hover:shadow-sm"
                  href={`/games/${game.slug}`}
                >
                  <span className="status-pill">{game.shortName ?? "Game"}</span>
                  <p className="mt-4 text-lg font-bold text-[var(--foreground)]">{game.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Open team and scrim tools</p>
                </Link>
              ))}
            </div>
          </AsyncState>
      </section>
    </PageShell>
  );
}
