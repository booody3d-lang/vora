export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnvironment } = await import("@/lib/env/validate");
    validateProductionEnvironment();

    if (process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
      await import("../sentry.server.config");
    }
  }

  if (process.env.NEXT_RUNTIME === "edge" && process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(err: unknown, request: { path: string }) {
  const { captureException } = await import("@/lib/monitoring/sentry");
  captureException(err, { path: request.path });
}
