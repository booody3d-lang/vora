import "server-only";

const PRODUCTION_REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
  "PASSWORD_PEPPER",
] as const;

const DEV_JWT_MARKER = "vora-dev-jwt-secret";
const DEV_PEPPER = "vora-pepper-2026";

function isStrictProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function validateProductionEnvironment(): void {
  const missing = PRODUCTION_REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    const message = `[env] Missing required variables: ${missing.join(", ")}`;
    if (isStrictProduction()) {
      throw new Error(message);
    }
    console.warn(message);
    return;
  }

  const jwt = process.env.JWT_SECRET ?? "";
  const pepper = process.env.PASSWORD_PEPPER ?? "";

  if (isStrictProduction()) {
    if (jwt.includes(DEV_JWT_MARKER)) {
      throw new Error("[env] JWT_SECRET must not use the development default in production");
    }
    if (pepper === DEV_PEPPER) {
      throw new Error("[env] PASSWORD_PEPPER must not use the development default in production");
    }
  }
}
