import type { ReactNode } from "react";

type AsyncStateProps = {
  loading: boolean;
  errorMessage: string | null;
  emptyMessage?: string;
  hasData: boolean;
  children: ReactNode;
};

export function AsyncState({
  loading,
  errorMessage,
  emptyMessage = "No data available.",
  hasData,
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <div className="app-card px-4 py-4 text-sm font-medium text-[var(--muted)]">
        Loading data...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {errorMessage}
      </p>
    );
  }

  if (!hasData) {
    return (
      <div className="app-card px-4 py-4 text-sm font-medium text-[var(--muted)]">
        {emptyMessage}
      </div>
    );
  }

  return <>{children}</>;
}
