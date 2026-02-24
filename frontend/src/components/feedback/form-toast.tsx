"use client";

import { useEffect } from "react";

type FormToastProps = {
  message: string | null;
  tone: "success" | "error";
  onClose: () => void;
  durationMs?: number;
};

export function FormToast({ message, tone, onClose, durationMs = 3500 }: FormToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [durationMs, message, onClose]);

  if (!message) {
    return null;
  }

  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`fixed right-4 top-4 z-50 rounded-md border px-4 py-3 text-sm shadow ${toneClasses}`}>
      <div className="flex items-center gap-3">
        <p>{message}</p>
        <button
          type="button"
          className="rounded border border-current px-2 py-0.5 text-xs"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          Close
        </button>
      </div>
    </div>
  );
}
