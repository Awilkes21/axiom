"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AsyncState } from "@/components/feedback/async-state";
import { PageShell } from "@/components/layout/page-shell";
import { getGames } from "@/lib/api/endpoints";
import type { Game } from "@/types/domain";

const routeItems = [
  { href: "/dashboard", label: "Dashboard", detail: "Health + quick links" },
  { href: "/profile", label: "User Profile", detail: "Loads /profile from backend" },
  { href: "/teams", label: "Team Profile", detail: "Resolves from your team memberships" },
  {
    href: "/scrims",
    label: "Scrims Calendar",
    detail: "Defaults to your team and loads upcoming scrims",
  },
  {
    href: "/scrims/marketplace",
    label: "Scrim Marketplace",
    detail: "Post requests, browse requests, and review applications",
  },
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
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
    <PageShell title="Axiom">
      <p className="text-slate-600">Select a game to manage teams and create game-specific content.</p>
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={true}>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {games.map((game) => (
            <li key={game.id} className="rounded-md border border-slate-200 p-4">
              <p className="text-sm text-slate-500">{game.shortName ?? "Game"}</p>
              <Link
                className="mt-2 inline-block text-base font-medium text-slate-900"
                href={`/games/${game.slug}`}
              >
                {game.name}
              </Link>
            </li>
          ))}
        </ul>
      </AsyncState>

      <p className="mt-8 text-slate-600">General app routes.</p>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {routeItems.map((item) => (
          <li key={item.href} className="rounded-md border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{item.detail}</p>
            <Link className="mt-2 inline-block text-base font-medium text-slate-900" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
