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
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useUnsavedChanges(
    !loading &&
      Boolean(
        email !== (user?.email ?? "") ||
          displayName !== (user?.displayName ?? "") ||
          timezone !== (user?.timezone ?? "") ||
          discordHandle !== (user?.discordHandle ?? "") ||
          bio !== (user?.bio ?? "") ||
          (showPasswordFields && (newPassword || confirmPassword)),
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

    if (showPasswordFields && newPassword && newPassword.length < 8) {
      setFieldErrors({ newPassword: "New password must be at least 8 characters." });
      return;
    }

    if (showPasswordFields && newPassword && newPassword !== confirmPassword) {
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

    if (showPasswordFields && newPassword) {
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
    setShowPasswordFields(false);
    setToastMessage("Profile updated.");
  }

  return (
    <PageShell title="Profile" eyebrow="Account settings">
      <FormToast message={toastMessage} tone="success" onClose={() => setToastMessage(null)} />
      <AsyncState loading={loading} errorMessage={errorMessage} hasData={Boolean(user)}>
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="app-card px-5 py-5">
          <h2 className="section-title">Account</h2>
          <dl className="mt-4 space-y-3">
            {[
              ["Account ID", user?.id],
              ["Email", user?.email],
              ["Display Name", user?.displayName ?? "Not set"],
              ["Timezone", user?.timezone ?? "Not set"],
              ["Discord", user?.discordHandle ?? "Not set"],
              ["Bio", user?.bio ?? "Not set"],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs font-bold uppercase text-[var(--muted)]">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <section className="app-card px-5 py-5">
          <h2 className="section-title">Edit Profile</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="app-label">
              Email
              <input
                className="app-input"
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
            <label className="app-label">
              Display Name
              <input
                className="app-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label className="app-label">
              Timezone
              <input
                className="app-input"
                placeholder="America/New_York"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                aria-invalid={Boolean(fieldErrors.timezone)}
              />
            </label>
            <label className="app-label">
              Discord Handle
              <input
                className="app-input"
                placeholder="user#1234"
                value={discordHandle}
                onChange={(event) => setDiscordHandle(event.target.value)}
                aria-invalid={Boolean(fieldErrors.discordHandle)}
              />
            </label>
            <label className="app-label md:col-span-2">
              Bio
              <textarea
                className="app-input"
                rows={3}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                aria-invalid={Boolean(fieldErrors.bio)}
              />
            </label>
            <div className="md:col-span-2">
              {!showPasswordFields ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPasswordFields(true)}
                >
                  Change password
                </button>
              ) : (
                <div className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--panel-muted)] p-4 md:grid-cols-2">
                  <label className="app-label">
                    New Password
                    <input
                      className="app-input"
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
                  <label className="app-label">
                    Confirm New Password
                    <input
                      className="app-input"
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
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowPasswordFields(false);
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      Cancel password change
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </section>
        </div>
      </AsyncState>
    </PageShell>
  );
}
