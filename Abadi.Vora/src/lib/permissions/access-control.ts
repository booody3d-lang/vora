import type { AccountTier, UserPermissions } from "@/types/vora";

interface PermissionInput {
  tier: AccountTier;
  isAuthenticated: boolean;
  professionalUnlocked: boolean;
  hasFreelancerStore: boolean;
  hasProfessionalProfile: boolean;
}

export function resolveUserPermissions(input: PermissionInput): UserPermissions {
  const { tier, isAuthenticated, professionalUnlocked, hasFreelancerStore, hasProfessionalProfile } =
    input;

  if (!isAuthenticated || tier === "visitor") {
    return {
      tier: "visitor",
      isAuthenticated: false,
      professionalUnlocked: false,
      hasFreelancerStore: false,
      hasProfessionalProfile: false,
      canBrowseFreelance: true,
      canBuyServices: false,
      canCreateStore: false,
      canListServices: false,
      canMessageSellers: false,
      canSaveServices: false,
      canApplyJobs: false,
      canFollowConnect: false,
      canNetworkMessage: false,
      canEngageContent: false,
      canLeaveRatings: false,
    };
  }

  if (tier === "basic" || !professionalUnlocked) {
    return {
      tier: "basic",
      isAuthenticated: true,
      professionalUnlocked: false,
      hasFreelancerStore,
      hasProfessionalProfile,
      canBrowseFreelance: true,
      canBuyServices: true,
      canCreateStore: true,
      canListServices: true,
      canMessageSellers: true,
      canSaveServices: true,
      canApplyJobs: false,
      canFollowConnect: false,
      canNetworkMessage: false,
      canEngageContent: false,
      canLeaveRatings: false,
    };
  }

  return {
    tier: "professional",
    isAuthenticated: true,
    professionalUnlocked: true,
    hasFreelancerStore,
    hasProfessionalProfile,
    canBrowseFreelance: true,
    canBuyServices: true,
    canCreateStore: true,
    canListServices: true,
    canMessageSellers: true,
    canSaveServices: true,
    canApplyJobs: true,
    canFollowConnect: true,
    canNetworkMessage: true,
    canEngageContent: true,
    canLeaveRatings: true,
  };
}

export const VISITOR_VIEW_LIMIT = 3;

export function isVisitorLimitReached(
  profileViews: number,
  jobViews: number
): boolean {
  return profileViews >= VISITOR_VIEW_LIMIT || jobViews >= VISITOR_VIEW_LIMIT;
}

export type PermissionAction =
  | "buy_service"
  | "create_store"
  | "list_service"
  | "message_seller"
  | "save_service"
  | "apply_job"
  | "follow_connect"
  | "network_message"
  | "engage_content"
  | "leave_rating";

const ACTION_MAP: Record<PermissionAction, keyof UserPermissions> = {
  buy_service: "canBuyServices",
  create_store: "canCreateStore",
  list_service: "canListServices",
  message_seller: "canMessageSellers",
  save_service: "canSaveServices",
  apply_job: "canApplyJobs",
  follow_connect: "canFollowConnect",
  network_message: "canNetworkMessage",
  engage_content: "canEngageContent",
  leave_rating: "canLeaveRatings",
};

export function canPerformAction(
  permissions: UserPermissions,
  action: PermissionAction
): boolean {
  return Boolean(permissions[ACTION_MAP[action]]);
}

export function getRestrictionMessage(action: PermissionAction): string {
  const messages: Record<PermissionAction, string> = {
    buy_service: "Create an account to purchase services.",
    create_store: "Create an account to open your freelancer store.",
    list_service: "Create an account to list services.",
    message_seller: "Create an account to message sellers.",
    save_service: "Create an account to save services.",
    apply_job: "Complete your Professional Profile to apply for jobs.",
    follow_connect: "Complete your Professional Profile to connect with professionals.",
    network_message: "Complete your Professional Profile to send network messages.",
    engage_content: "Complete your Professional Profile to engage with professional content.",
    leave_rating: "Create an account to leave ratings.",
  };

  return messages[action];
}
