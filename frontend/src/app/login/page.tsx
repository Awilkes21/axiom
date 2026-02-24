"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { loginUser } from "@/lib/api/endpoints";
import { setAuthToken } from "@/lib/auth/token";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    const response = await loginUser(email.trim(), password);

    if (response.error || !response.data?.token) {
      setErrorMessage(response.error?.message ?? "Login failed.");
      setIsSubmitting(false);
      return;
    }

    setAuthToken(response.data.token);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <PageShell title="Login">
      <p className="mb-4 text-slate-600">Sign in to access protected pages.</p>

      <form className="max-w-md space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <div>
          <Link className="text-sm text-slate-600 underline" href="/signup">
            Need an account? Sign up
          </Link>
        </div>
      </form>
    </PageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageShell title="Login">Loading...</PageShell>}>
      <LoginPageContent />
    </Suspense>
  );
}
