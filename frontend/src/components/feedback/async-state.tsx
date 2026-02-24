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
    return <p className="text-sm text-slate-500">Loading data...</p>;
  }

  if (errorMessage) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {errorMessage}
      </p>
    );
  }

  if (!hasData) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return <>{children}</>;
}
