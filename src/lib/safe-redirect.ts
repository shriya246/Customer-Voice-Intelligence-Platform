/** Only allows same-app relative paths, guarding against open-redirect via a crafted `next` param. */
export function safeRedirectTarget(
  next: string | string[] | null | undefined,
  fallback = "/dashboard"
): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
}
