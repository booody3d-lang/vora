import * as Sentry from "@sentry/nextjs";

export function isSentryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!isSentryConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.error("[VORA Monitor]", error, context);
    }
    return;
  }

  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
) {
  if (!isSentryConfigured()) return;
  Sentry.captureMessage(message, level);
}
