import type { PropsWithChildren } from "react";

type PageShellProps = PropsWithChildren<{
  title: string;
}>;

export function PageShell({ title, children }: PageShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <section className="mt-4">{children}</section>
    </main>
  );
}
