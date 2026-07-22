export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnvironment } = await import("@/lib/env/validate");
    validateProductionEnvironment();
  }

  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // When @sentry/nextjs is installed, initialize here.
  }
}

export async function onRequestError(err: unknown, request: { path: string }) {
  const { captureException } = await import("@/lib/monitoring/sentry");
  captureException(err, { path: request.path });
}
