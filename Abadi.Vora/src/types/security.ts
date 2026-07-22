export type VoraRole =
  | "visitor"
  | "registered"
  | "professional"
  | "company"
  | "admin"
  | "owner";

export type OtpPurpose = "login" | "signup" | "2fa" | "password_reset";

export type ReportTargetType =
  | "post"
  | "profile"
  | "store"
  | "service"
  | "company"
  | "message"
  | "user";

export type ProfileVisibility = "public" | "members_only" | "connections_only";

export interface SessionPayload {
  sub: string;
  email: string;
  role: VoraRole;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface UserSession {
  id: string;
  deviceLabel: string;
  userAgent: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  hideEmail: boolean;
  hidePhone: boolean;
  hideContactInfo: boolean;
  feedActivityVisible: boolean;
  allowSearchIndexing: boolean;
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
}

export interface ContentReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  reason: string;
  details?: string;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  priority: "high" | "critical";
  createdAt: string;
}

export interface AbuseSignalRecord {
  id: string;
  accountId?: string;
  signalType: "spam_messages" | "duplicate_listings" | "multi_account" | "rate_limit";
  severity: "low" | "medium" | "high";
  details: string;
  createdAt: string;
}

import type { UserGender } from "@/types/profile";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: VoraRole;
  phone?: string;
  phoneVerified: boolean;
  totpEnabled: boolean;
  isBanned: boolean;
  professionalUnlocked: boolean;
  hasFreelancerStore: boolean;
  hasProfessionalProfile: boolean;
  gender?: UserGender;
  profileSlug?: string;
  storeSlug?: string;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: "public",
  hideEmail: true,
  hidePhone: true,
  hideContactInfo: false,
  feedActivityVisible: true,
  allowSearchIndexing: true,
  dataProcessingConsent: false,
  marketingConsent: false,
};

export type RbacAction =
  | "browse_public"
  | "browse_freelance"
  | "buy_service"
  | "create_store"
  | "list_service"
  | "message_seller"
  | "leave_rating"
  | "apply_job"
  | "follow_connect"
  | "network_message"
  | "engage_content"
  | "manage_company"
  | "manage_ats"
  | "buy_corporate_plan"
  | "moderate_content"
  | "manage_support"
  | "view_finance"
  | "resolve_disputes"
  | "manage_admins"
  | "view_security_logs"
  | "adjust_commission";

export const ROLE_LABELS: Record<VoraRole, { en: string; ar: string }> = {
  visitor: { en: "Visitor", ar: "زائر" },
  registered: { en: "Registered User", ar: "مستخدم مسجّل" },
  professional: { en: "Professional User", ar: "مستخدم محترف" },
  company: { en: "Company (Employer)", ar: "شركة (صاحب عمل)" },
  admin: { en: "Admin", ar: "مسؤول" },
  owner: { en: "Owner (Super Admin)", ar: "مالك المنصة" },
};
