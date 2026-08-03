import type { VoraRole } from "@/types/security";

const VORA_ROLES: VoraRole[] = ["registered", "professional", "company", "admin", "owner"];

/** Parse a DB/metadata value into a Vora RBAC role, or null when not a role string. */
export function parseVoraRole(value: unknown): VoraRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (VORA_ROLES.includes(normalized as VoraRole)) {
    return normalized as VoraRole;
  }
  return null;
}
