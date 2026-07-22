/**
 * Sentry monitoring — enable with NEXT_PUBLIC_SENTRY_DSN in production.
 * Install @sentry/nextjs when ready: npx @sentry/wizard@latest -i nextjs
 */

export function captureException(error: unknown, context?: Record<string, unknown>) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV === "development") {
      console.error("[VORA Monitor]", error, context);
    }
    return;
  }

  // Production: forward to Sentry REST API or use @sentry/nextjs SDK
  fetch("https://o0.ingest.sentry.io/api/0/envelope/", {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: JSON.stringify({
      event_id: crypto.randomUUID().replace(/-/g, ""),
      message: error instanceof Error ? error.message : String(error),
      level: "error",
      extra: context,
    }),
  }).catch(() => {});
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  console.info(`[Sentry ${level}]`, message);
}
