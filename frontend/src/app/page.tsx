import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

const scaffoldItems = [
  "src/app (routes/pages)",
  "src/components (shared UI)",
  "src/lib/api (API clients)",
];

export default function Home() {
  return (
    <PageShell title="Axiom Frontend Scaffold">
      <p className="text-slate-600">
        Base Next.js + TypeScript + Tailwind setup for feature development.
      </p>

      <ul className="mt-6 space-y-2 text-sm text-slate-700">
        {scaffoldItems.map((item) => (
          <li key={item} className="rounded-md border border-slate-200 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex gap-3">
        <Link
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          href="/dashboard"
        >
          View dashboard route
        </Link>
      </div>
    </PageShell>
  );
}
