import type { FullProfessionalProfile } from "@/types/network";

export interface PrivateProfileFields {
  privateMobileNumber?: string;
  backupEmail?: string;
}

const PRIVATE_KEYS: (keyof PrivateProfileFields)[] = ["privateMobileNumber", "backupEmail"];

export function stripPrivateProfileFields<T extends Partial<FullProfessionalProfile>>(
  profile: T
): Omit<T, keyof PrivateProfileFields> {
  const copy = { ...profile };
  for (const key of PRIVATE_KEYS) {
    delete (copy as Record<string, unknown>)[key];
  }
  return copy as Omit<T, keyof PrivateProfileFields>;
}

export function extractPrivateProfileFields(
  profile: Partial<FullProfessionalProfile> & PrivateProfileFields
): PrivateProfileFields {
  return {
    privateMobileNumber: profile.privateMobileNumber,
    backupEmail: profile.backupEmail,
  };
}

export function pickPrivateUpdates(
  body: Record<string, unknown>
): Partial<PrivateProfileFields> {
  const updates: Partial<PrivateProfileFields> = {};
  if (typeof body.privateMobileNumber === "string") {
    updates.privateMobileNumber = body.privateMobileNumber.trim();
  }
  if (typeof body.backupEmail === "string") {
    updates.backupEmail = body.backupEmail.trim().toLowerCase();
  }
  return updates;
}
