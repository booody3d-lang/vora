import type { VoraRole } from "@/types/security";

import { DEMO_ACCOUNTS, findAccountByEmail, type DemoAccount } from "@/lib/security/demo-store";

import { PLATFORM_OWNER_EMAIL } from "@/lib/security/roles";



/** Demo auth bypass is permanently disabled — real credentials required */

export function isDevAuthBypass(): boolean {

  return false;

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

  { email: PLATFORM_OWNER_EMAIL, label: "Platform Owner", labelAr: "مالك المنصة", role: "owner" },

];



export function resolveDevDemoAccount(email: string): DemoAccount | undefined {

  return findAccountByEmail(email);

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
      return "/profile/me";
  }
}

