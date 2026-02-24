"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { signupUser } from "@/lib/api/endpoints";
import { setAuthToken } from "@/lib/auth/token";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useUnsavedChanges(Boolean(email || password || displayName) && !isSubmitting);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return;
    }

    if (!password) {
      setFieldErrors({ password: "Password is required." });
      return;
    }

    if (password.length < 8) {
      setFieldErrors({ password: "Password must be at least 8 characters." });
      return;
    }

    setIsSubmitting(true);
    const response = await signupUser(email.trim(), password, displayName);

    if (response.error || !response.data?.token) {
      setErrorMessage(response.error?.message ?? "Signup failed.");
      setIsSubmitting(false);
      return;
    }

    setAuthToken(response.data.token);
    setToastMessage("Account created.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <PageShell title="Sign Up">
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <p className="mb-4 text-slate-600">Create an account, then continue to protected pages.</p>

      <form className="max-w-md space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id="signup-email-error" className="mt-1 text-xs text-red-700">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="signup-display-name"
          >
            Display Name
          </label>
          <input
            id="signup-display-name"
            type="text"
            autoComplete="nickname"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "signup-password-error" : undefined}
          />
          {fieldErrors.password ? (
            <p id="signup-password-error" className="mt-1 text-xs text-red-700">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </button>

          <Link className="text-sm text-slate-600 underline" href="/login">
            Already have an account?
          </Link>
        </div>
      </form>
    </PageShell>
  );
}
