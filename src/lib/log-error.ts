/**
 * Structured error logging without a paid error-tracking service. Emits one
 * JSON line per error so Vercel's own log viewer/log drain can filter by
 * `scope` -- a real step up from ad hoc `console.error(string, err)` calls
 * whose shape differs from callsite to callsite, without adding an external
 * dependency this project doesn't have an account for.
 */
export function logError(scope: string, error: unknown, context?: Record<string, unknown>): void {
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
      timestamp: new Date().toISOString(),
    })
  );
}
