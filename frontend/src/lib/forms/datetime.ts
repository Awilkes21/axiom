export function toUtcIsoFromLocalInput(localValue: string): string | null {
  if (!localValue) {
    return null;
  }

  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function getLocalTimezoneLabel() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
}
