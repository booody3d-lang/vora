import { captureException } from "@/lib/monitoring/sentry";

type LogDomain = "billing" | "auth" | "cron";

export function logDomainError(
  domain: LogDomain,
  message: string,
  error?: unknown,
  meta?: Record<string, unknown>
) {
  const payload = { domain, message, ...meta };
  console.error(`[VORA:${domain}]`, message, error ?? "", meta ?? "");

  if (error) {
    captureException(error, payload);
  } else {
    captureException(new Error(message), payload);
  }
}
