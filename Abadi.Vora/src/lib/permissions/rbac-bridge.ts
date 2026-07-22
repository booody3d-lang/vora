import type { AccountTier } from "@/types/vora";
import type { VoraRole } from "@/types/security";

export function roleToTier(role: VoraRole): AccountTier {
  switch (role) {
    case "professional":
    case "owner":
      return "professional";
    case "registered":
    case "company":
    case "admin":
      return "basic";
    default:
      return "visitor";
  }
}

export function tierToRole(tier: AccountTier, opts?: { isCompany?: boolean; isAdmin?: boolean; isOwner?: boolean }): VoraRole {
  if (opts?.isOwner) return "owner";
  if (opts?.isAdmin) return "admin";
  if (opts?.isCompany) return "company";
  if (tier === "professional") return "professional";
  if (tier === "basic") return "registered";
  return "visitor";
}
