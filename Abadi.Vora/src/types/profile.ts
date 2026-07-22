export type UserGender = "male" | "female";

export type ProfileUploadKind =
  | "photo"
  | "cover"
  | "resume"
  | "store-logo"
  | "store-cover"
  | "company-logo"
  | "company-cover"
  | "post-media"
  | "message-attachment"
  | "service-thumbnail"
  | "service-gallery"
  | "video-intro";

export interface AccountLink {
  profileSlug: string;
  storeSlug?: string;
}

/** Personal identity record (user_profile) — never stores store logo/cover/bio */
export type UserProfileData = import("@/types/network").FullProfessionalProfile;

/** Freelance store identity (store_data) — isolated from personal profile media */
export type StoreData = import("@/types/freelance").FreelancerStore;
