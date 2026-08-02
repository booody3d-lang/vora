/** Shared client/server check — demo seed data is disabled in production. */
export function isStrictProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
  );
}

export function isDemoDataEnabled(): boolean {
  return !isStrictProduction();
}
