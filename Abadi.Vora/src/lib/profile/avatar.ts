import type { UserGender } from "@/types/profile";

export const DEFAULT_AVATAR_MALE = "/avatars/default-male.svg";
export const DEFAULT_AVATAR_FEMALE = "/avatars/default-female.svg";
export const DEFAULT_AVATAR_NEUTRAL = DEFAULT_AVATAR_MALE;

export function getDefaultAvatarForGender(gender?: UserGender | null): string {
  if (gender === "female") return DEFAULT_AVATAR_FEMALE;
  if (gender === "male") return DEFAULT_AVATAR_MALE;
  return DEFAULT_AVATAR_NEUTRAL;
}

export function resolveAvatarUrl(input: {
  photoUrl?: string | null;
  gender?: UserGender | null;
}): string {
  if (input.photoUrl && input.photoUrl.trim().length > 0) {
    return input.photoUrl;
  }
  return getDefaultAvatarForGender(input.gender);
}
