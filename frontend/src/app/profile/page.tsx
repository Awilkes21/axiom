"use client";

import { useEffect, useState } from "react";
import { AsyncState } from "@/components/feedback/async-state";
import { FormToast } from "@/components/feedback/form-toast";
import { PageShell } from "@/components/layout/page-shell";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { getCurrentUser, updateCurrentUser } from "@/lib/api/endpoints";
import type { User } from "@/types/domain";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    timezone?: string;
    discordHandle?: string;
    bio?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [discordHandle, setDiscordHandle] = useState("");
  const [bio, setBio] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useUnsavedChanges(
    !loading &&
      Boolean(
        email !== (user?.email ?? "") ||
          displayName !== (user?.displayName ?? "") ||
          timezone !== (user?.timezone ?? "") ||
          discordHandle !== (user?.discordHandle ?? "") ||
          bio !== (user?.bio ?? "") ||
          newPassword ||
          confirmPassword,
      ) &&
      !saving,
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      const response = await getCurrentUser();
      if (!mounted) {
        return;
      }

      if (response.error) {
        setErrorMessage(response.error.message);
        setLoading(false);
        return;
      }

      setUser(response.data?.user ?? null);
      setEmail(response.data?.user?.email ?? "");
      setDisplayName(response.data?.user?.displayName ?? "");
      setTimezone(response.data?.user?.timezone ?? "");
      setDiscordHandle(response.data?.user?.discordHandle ?? "");
      setBio(response.data?.user?.bio ?? "");
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setFieldErrors({ newPassword: "New password must be at least 8 characters." });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Password confirmation does not match." });
      return;
    }

    const nextEmail = email.trim();
    const nextDisplayName = displayName.trim();
    const nextTimezone = timezone.trim();
    const nextDiscordHandle = discordHandle.trim();
    const nextBio = bio.trim();

    const payload: {
      email?: string;
      displayName?: string;
      timezone?: string;
      discordHandle?: string;
      bio?: string;
      password?: string;
    } = {};

    if (nextEmail !== (user?.email ?? "")) {
      payload.email = nextEmail;
    }

    // Do not overwrite existing optional profile fields with blanks unless a non-blank value is provided.
    if (nextDisplayName && nextDisplayName !== (user?.displayName ?? "")) {
      payload.displayName = nextDisplayName;
    }
    if (nextTimezone && nextTimezone !== (user?.timezone ?? "")) {
      payload.timezone = nextTimezone;
    }
    if (nextDiscordHandle && nextDiscordHandle !== (user?.discordHandle ?? "")) {
      payload.discordHandle = nextDiscordHandle;
    }
    if (nextBio && nextBio !== (user?.bio ?? "")) {
      payload.bio = nextBio;
    }

    if (newPassword) {
      payload.password = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setToastMessage("No changes to save.");
      return;
    }

    setSaving(true);
    const response = await updateCurrentUser(payload);
    setSaving(false);

    if (response.error) {
      setErrorMessage(response.error.message);
      return;
    }

    setUser(response.data?.user ?? null);
    setNewPassword("");
    setConfirmPassword("");
    setToastMessage("Profile updated.");
  }

  return (
    <PageShell title="User Profile">
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(user)}>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Account ID</p>
          <p className="text-lg font-medium text-slate-900">{user?.id}</p>
          <p className="mt-3 text-sm text-slate-500">Email</p>
          <p className="text-slate-900">{user?.email}</p>
          <p className="mt-3 text-sm text-slate-500">Display Name</p>
          <p className="text-slate-900">{user?.displayName ?? "Not set"}</p>
          <p className="mt-3 text-sm text-slate-500">Timezone</p>
          <p className="text-slate-900">{user?.timezone ?? "Not set"}</p>
          <p className="mt-3 text-sm text-slate-500">Discord</p>
          <p className="text-slate-900">{user?.discordHandle ?? "Not set"}</p>
          <p className="mt-3 text-sm text-slate-500">Bio</p>
          <p className="text-slate-900">{user?.bio ?? "Not set"}</p>
        </div>

        <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Edit Profile</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="text-sm text-slate-700">
              Email
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "profile-email-error" : undefined}
              />
              {fieldErrors.email ? (
                <p id="profile-email-error" className="mt-1 text-xs text-red-700">
                  {fieldErrors.email}
                </p>
              ) : null}
            </label>
            <label className="text-sm text-slate-700">
              Display Name
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label className="text-sm text-slate-700">
              Timezone
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                placeholder="America/New_York"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                aria-invalid={Boolean(fieldErrors.timezone)}
              />
            </label>
            <label className="text-sm text-slate-700">
              Discord Handle
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                placeholder="user#1234"
                value={discordHandle}
                onChange={(event) => setDiscordHandle(event.target.value)}
                aria-invalid={Boolean(fieldErrors.discordHandle)}
              />
            </label>
            <label className="text-sm text-slate-700 md:col-span-2">
              Bio
              <textarea
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                rows={3}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                aria-invalid={Boolean(fieldErrors.bio)}
              />
            </label>
            <label className="text-sm text-slate-700">
              New Password
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.newPassword)}
                aria-describedby={fieldErrors.newPassword ? "profile-new-password-error" : undefined}
              />
              {fieldErrors.newPassword ? (
                <p id="profile-new-password-error" className="mt-1 text-xs text-red-700">
                  {fieldErrors.newPassword}
                </p>
              ) : null}
            </label>
            <label className="text-sm text-slate-700">
              Confirm New Password
              <input
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? "profile-confirm-password-error" : undefined}
              />
              {fieldErrors.confirmPassword ? (
                <p id="profile-confirm-password-error" className="mt-1 text-xs text-red-700">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </section>
      </AsyncState>
    </PageShell>
  );
}
