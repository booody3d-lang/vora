import type { VoraRole } from "@/types/security";
import { DEMO_ACCOUNTS, findAccountByEmail, type DemoAccount } from "@/lib/security/demo-store";

/** True when local dev bypass is active — never in production builds */
export function isDevAuthBypass(): boolean {
  return process.env.NODE_ENV === "development";
}

export const DEV_DEMO_PASSWORD = "Vora@2026!";

export interface DevDemoAccountOption {
  email: string;
  label: string;
  labelAr: string;
  role: VoraRole;
}

export const DEV_DEMO_ACCOUNT_OPTIONS: DevDemoAccountOption[] = [
  { email: "buyer@vora.sa", label: "Registered User", labelAr: "مستخدم مسجّل", role: "registered" },
  { email: "alex@vora.sa", label: "Professional", labelAr: "محترف", role: "professional" },
  { email: "hr@techcorp.sa", label: "Company HR", labelAr: "شركة", role: "company" },
  { email: "admin@vora.sa", label: "Admin", labelAr: "مسؤول", role: "admin" },
  { email: "owner@vora.sa", label: "Owner", labelAr: "مالك", role: "owner" },
];

/** Resolve a demo account by email; in dev, fuzzy-match known demo domains */
export function resolveDevDemoAccount(email: string): DemoAccount | undefined {
  const exact = findAccountByEmail(email);
  if (exact) return exact;

  if (!isDevAuthBypass()) return undefined;

  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === normalized);
}

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
      return "/freelance";
  }
}
