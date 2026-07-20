import type { VoraRole } from "@/types/security";

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
