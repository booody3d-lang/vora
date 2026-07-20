import { PLATFORM_OWNER_EMAIL } from "@/lib/security/roles";
import type { VoraRole } from "@/types/security";

/** Reference accounts for quick email fill on login — always authenticate via Supabase. */
export interface PlatformAccountOption {
  email: string;
  labelKey: string;
  role: VoraRole;
}

export const PLATFORM_ACCOUNT_OPTIONS: PlatformAccountOption[] = [
  { email: "buyer@vora.sa", labelKey: "auth.demoAccounts.registered", role: "registered" },
  { email: "alex@vora.sa", labelKey: "auth.demoAccounts.professional", role: "professional" },
  { email: "hr@techcorp.sa", labelKey: "auth.demoAccounts.company", role: "company" },
  { email: "admin@vora.sa", labelKey: "auth.demoAccounts.admin", role: "admin" },
  { email: PLATFORM_OWNER_EMAIL, labelKey: "auth.demoAccounts.owner", role: "owner" },
];

export function getRedirectForRole(role: VoraRole): string {
  switch (role) {
    case "company":
      return "/company/dashboard";
    case "admin":
    case "owner":
      return "/admin";
    case "professional":
      return "/network";
    default:
      return "/profile/me";
  }
}
