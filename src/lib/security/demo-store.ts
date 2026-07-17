import type { AuthUser, ContentReport, PrivacySettings, UserSession, VoraRole } from "@/types/security";
import { DEFAULT_PRIVACY_SETTINGS } from "@/types/security";

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
    id: "user-owner-1",
    email: "owner@vora.sa",
    fullName: "VORA Owner",
    role: "owner",
    phoneVerified: false,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: true,
    hasFreelancerStore: false,
    hasProfessionalProfile: true,
    passwordHash: "",
  },
];

let accountsInitialized = false;

export async function initDemoAccounts(hashFn: (p: string) => Promise<string>) {
  if (accountsInitialized) return;
  for (const acc of DEMO_ACCOUNTS) {
    acc.passwordHash = await hashFn("Vora@2026!");
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
  if (process.env.NODE_ENV === "development") return Boolean(sessionId);
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

export function registerDemoUser(input: {
  email: string;
  fullName: string;
  passwordHash: string;
  role?: VoraRole;
}): DemoAccount {
  const account: DemoAccount = {
    id: `user-${Date.now()}`,
    email: input.email,
    fullName: input.fullName,
    role: input.role ?? "registered",
    phoneVerified: false,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: input.role === "professional",
    hasFreelancerStore: false,
    hasProfessionalProfile: input.role === "professional",
    passwordHash: input.passwordHash,
  };
  DEMO_ACCOUNTS.push(account);
  return account;
}
