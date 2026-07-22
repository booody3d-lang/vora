import type { AuthUser, ContentReport, PrivacySettings, UserSession, VoraRole } from "@/types/security";
import { DEFAULT_PRIVACY_SETTINGS } from "@/types/security";
import {
  MAX_ADMIN_ACCOUNTS,
  MANUAL_TEST_USER_EMAIL,
  MANUAL_TEST_USER_ID,
  getManualTestUserBootstrapPassword,
  getPlatformOwnerBootstrapPassword,
  PLATFORM_OWNER_EMAIL,
  countAdminRoleAccounts,
  isManualTestUserEmail,
  isPlatformOwnerEmail,
} from "@/lib/security/roles";

export interface DemoAccount extends AuthUser {
  passwordHash: string;
  totpSecret?: string;
}

const sessions = new Map<string, UserSession & { accountId: string; tokenHash: string }>();
const otpStore = new Map<string, { codeHash: string; expiresAt: number; attempts: number }>();
const reports: ContentReport[] = [];
const privacyMap = new Map<string, PrivacySettings>();
const messageLog = new Map<string, string[]>();
const deviceMap = new Map<string, Set<string>>();
const listingLog = new Map<string, string[]>();

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "user-basic-1",
    email: "buyer@vora.sa",
    fullName: "Fatima Al-Qahtani",
    role: "registered",
    gender: "female",
    phone: "+966501234567",
    phoneVerified: true,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: false,
    hasFreelancerStore: false,
    hasProfessionalProfile: false,
    passwordHash: "", // set on init
  },
  {
    id: "user-pro-1",
    email: "alex@vora.sa",
    fullName: "Alex Morgan",
    role: "professional",
    gender: "male",
    profileSlug: "alex-morgan",
    storeSlug: "alex-design-studio",
    phone: "+966509876543",
    phoneVerified: true,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: true,
    hasFreelancerStore: true,
    hasProfessionalProfile: true,
    passwordHash: "",
  },
  {
    id: "user-company-1",
    email: "hr@techcorp.sa",
    fullName: "TechCorp HR",
    role: "company",
    phoneVerified: false,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: false,
    hasFreelancerStore: false,
    hasProfessionalProfile: false,
    passwordHash: "",
  },
  {
    id: "user-admin-1",
    email: "admin@vora.sa",
    fullName: "VORA Admin",
    role: "admin",
    phoneVerified: false,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: false,
    hasFreelancerStore: false,
    hasProfessionalProfile: false,
    passwordHash: "",
  },
  {
    id: "platform-owner-1",
    email: PLATFORM_OWNER_EMAIL,
    fullName: "Platform Owner",
    role: "owner",
    phone: "+966500000001",
    phoneVerified: true,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: true,
    hasFreelancerStore: false,
    hasProfessionalProfile: true,
    passwordHash: "",
  },
  {
    id: "user-owner-1",
    email: "owner@vora.sa",
    fullName: "VORA Owner (Legacy)",
    role: "admin",
    phoneVerified: false,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: true,
    hasFreelancerStore: false,
    hasProfessionalProfile: true,
    passwordHash: "",
  },
  {
    id: MANUAL_TEST_USER_ID,
    email: MANUAL_TEST_USER_EMAIL,
    fullName: "B3D Test User",
    role: "registered",
    gender: "male",
    phoneVerified: false,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: false,
    hasFreelancerStore: false,
    hasProfessionalProfile: true,
    passwordHash: "",
  },
];

let accountsInitialized = false;

export async function initDemoAccounts(hashFn: (p: string) => Promise<string>) {
  if (accountsInitialized) return;
  const demoDefaultPassword = process.env.VORA_DEMO_DEFAULT_PASSWORD?.trim() || "Vora@2026!";
  const ownerPassword = getPlatformOwnerBootstrapPassword() ?? demoDefaultPassword;
  const manualTestPassword = getManualTestUserBootstrapPassword() ?? demoDefaultPassword;

  for (const acc of DEMO_ACCOUNTS) {
    if (isPlatformOwnerEmail(acc.email)) {
      acc.passwordHash = await hashFn(ownerPassword);
    } else if (isManualTestUserEmail(acc.email)) {
      acc.passwordHash = await hashFn(manualTestPassword);
    } else {
      acc.passwordHash = await hashFn(demoDefaultPassword);
    }
  }
  accountsInitialized = true;
}

export function findAccountByEmail(email: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export function findAccountByPhone(phone: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.phone === phone);
}

export function findAccountById(id: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.id === id);
}

export function createSession(
  accountId: string,
  meta: { userAgent: string; ip: string; deviceLabel?: string }
): { sessionId: string; session: UserSession } {
  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session: UserSession = {
    id: sessionId,
    deviceLabel: meta.deviceLabel ?? parseDeviceLabel(meta.userAgent),
    userAgent: meta.userAgent,
    ipAddress: meta.ip,
    location: guessLocation(meta.ip),
    isCurrent: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  for (const [, s] of sessions) {
    if (s.accountId === accountId) s.isCurrent = false;
  }
  sessions.set(sessionId, { ...session, accountId, tokenHash: sessionId });
  return { sessionId, session };
}

export function getSessionsForAccount(accountId: string): UserSession[] {
  return Array.from(sessions.values())
    .filter((s) => s.accountId === accountId)
    .map(({ accountId: _, tokenHash: __, ...rest }) => rest);
}

export function revokeSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function revokeAllSessions(accountId: string, exceptSessionId?: string): number {
  let count = 0;
  for (const [id, s] of sessions) {
    if (s.accountId === accountId && id !== exceptSessionId) {
      sessions.delete(id);
      count++;
    }
  }
  return count;
}

export function isSessionValid(sessionId: string): boolean {
  return sessions.has(sessionId);
}

export function storeOtp(phone: string, codeHash: string, ttlMs = 5 * 60_000) {
  otpStore.set(phone, { codeHash, expiresAt: Date.now() + ttlMs, attempts: 0 });
}

export function getOtp(phone: string) {
  return otpStore.get(phone);
}

export function incrementOtpAttempts(phone: string) {
  const entry = otpStore.get(phone);
  if (entry) entry.attempts += 1;
}

export function clearOtp(phone: string) {
  otpStore.delete(phone);
}

export function addReport(report: ContentReport) {
  reports.unshift(report);
}

export function getReports(): ContentReport[] {
  return reports;
}

export function getPrivacySettings(accountId: string): PrivacySettings {
  return privacyMap.get(accountId) ?? { ...DEFAULT_PRIVACY_SETTINGS };
}

export function setPrivacySettings(accountId: string, settings: PrivacySettings) {
  privacyMap.set(accountId, settings);
}

export function trackMessage(accountId: string, content: string): number {
  const key = accountId;
  const log = messageLog.get(key) ?? [];
  log.push(content.toLowerCase().trim());
  messageLog.set(key, log);
  const normalized = content.toLowerCase().trim();
  return log.filter((m) => m === normalized).length;
}

export function trackListing(accountId: string, title: string): number {
  const log = listingLog.get(accountId) ?? [];
  log.push(title.toLowerCase().trim());
  listingLog.set(accountId, log);
  const normalized = title.toLowerCase().trim();
  return log.filter((t) => t === normalized).length;
}

export function linkDeviceFingerprint(fingerprint: string, accountId: string): string[] {
  const existing = deviceMap.get(fingerprint) ?? new Set();
  existing.add(accountId);
  deviceMap.set(fingerprint, existing);
  return Array.from(existing);
}

function parseDeviceLabel(ua: string): string {
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("Android")) return "Android Device";
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Mac")) return "Mac";
  return "Unknown Device";
}

function guessLocation(ip: string): string {
  if (ip.startsWith("127") || ip === "unknown") return "Riyadh, SA";
  return "Saudi Arabia";
}

export function toPublicUser(account: DemoAccount): AuthUser {
  const { passwordHash: _, totpSecret: __, ...rest } = account;
  return rest;
}

export function syncAccountPasswordHash(accountId: string, passwordHash: string): boolean {
  const account = findAccountById(accountId);
  if (!account) return false;
  account.passwordHash = passwordHash;
  return true;
}

export function registerDemoUser(input: {
  email: string;
  fullName: string;
  passwordHash: string;
  role?: VoraRole;
  gender?: "male" | "female";
  profileSlug?: string;
  storeSlug?: string;
  id?: string;
}): DemoAccount {
  const role = input.role ?? "registered";
  if (role === "admin" && countAdminRoleAccounts(DEMO_ACCOUNTS) >= MAX_ADMIN_ACCOUNTS) {
    throw new Error(`Maximum of ${MAX_ADMIN_ACCOUNTS} admin accounts allowed`);
  }
  if (role === "owner" && !isPlatformOwnerEmail(input.email)) {
    throw new Error("Owner role is reserved for the platform owner email");
  }

  const account: DemoAccount = {
    id: input.id ?? `user-${Date.now()}`,
    email: input.email,
    fullName: input.fullName,
    role: role,
    phoneVerified: false,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: input.role === "professional",
    hasFreelancerStore: Boolean(input.storeSlug),
    hasProfessionalProfile: input.role === "professional" || input.role === "registered",
    passwordHash: input.passwordHash,
    gender: input.gender,
    profileSlug: input.profileSlug,
    storeSlug: input.storeSlug,
  };
  DEMO_ACCOUNTS.push(account);
  return account;
}
