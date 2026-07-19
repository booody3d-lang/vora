import "server-only";

import fs from "fs";
import path from "path";
import { hashPassword } from "@/lib/security/password";
import { ensureVoraDataDir, getVoraDataDir } from "@/lib/storage/data-dir";

const DATA_DIR = getVoraDataDir();
const DATA_FILE = path.join(DATA_DIR, "auth-data.json");

export type RecoveryChannel = "email" | "sms";

export interface PasswordResetRequest {
  accountId: string;
  email: string;
  channel: RecoveryChannel;
  codeHash: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface StripeConfigRecord {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface AuthDataFile {
  passwordHashes: Record<string, string>;
  recoveryChannel: Record<string, RecoveryChannel>;
  passwordResets: Record<string, PasswordResetRequest>;
  stripeConfig: StripeConfigRecord;
  activeSessions: Record<string, PersistedSession>;
}

export interface PersistedSession {
  sessionId: string;
  accountId: string;
  userAgent: string;
  ip: string;
  deviceLabel?: string;
  createdAt: string;
  lastActiveAt: string;
}

function ensureDataDir() {
  ensureVoraDataDir();
}

function readData(): AuthDataFile {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial: AuthDataFile = {
      passwordHashes: {},
      recoveryChannel: {},
      passwordResets: {},
      stripeConfig: {},
      activeSessions: {},
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as AuthDataFile;
  if (!data.passwordHashes) data.passwordHashes = {};
  if (!data.recoveryChannel) data.recoveryChannel = {};
  if (!data.passwordResets) data.passwordResets = {};
  if (!data.stripeConfig) data.stripeConfig = {};
  if (!data.activeSessions) data.activeSessions = {};
  return data;
}

function writeData(data: AuthDataFile) {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("[auth-store] Failed to persist auth data:", error);
  }
}

/** Store a pre-computed password hash (signup/login sync). */
export function storePasswordHash(accountId: string, passwordHash: string): void {
  const data = readData();
  data.passwordHashes[accountId] = passwordHash;
  writeData(data);
}

export function getStoredPasswordHash(accountId: string): string | null {
  return readData().passwordHashes[accountId] ?? null;
}

export async function setAccountPasswordHash(
  accountId: string,
  plainPassword: string
): Promise<void> {
  const data = readData();
  data.passwordHashes[accountId] = await hashPassword(plainPassword);
  writeData(data);
}

export function getRecoveryChannel(accountId: string): RecoveryChannel {
  return readData().recoveryChannel[accountId] ?? "email";
}

export function setRecoveryChannel(accountId: string, channel: RecoveryChannel) {
  const data = readData();
  data.recoveryChannel[accountId] = channel;
  writeData(data);
}

export function createPasswordResetRequest(input: {
  accountId: string;
  email: string;
  channel: RecoveryChannel;
  codeHash: string;
  ttlMs?: number;
}): { token: string; expiresAt: string } {
  const data = readData();
  const token = `rst-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? 30 * 60_000)).toISOString();

  data.passwordResets[token] = {
    accountId: input.accountId,
    email: input.email,
    channel: input.channel,
    codeHash: input.codeHash,
    token,
    createdAt: new Date().toISOString(),
    expiresAt,
    used: false,
  };

  writeData(data);
  return { token, expiresAt };
}

export function getPasswordResetRequest(token: string): PasswordResetRequest | null {
  const data = readData();
  return data.passwordResets[token] ?? null;
}

export function markPasswordResetUsed(token: string) {
  const data = readData();
  if (data.passwordResets[token]) {
    data.passwordResets[token].used = true;
    writeData(data);
  }
}

export function getStripeConfig(): StripeConfigRecord {
  return readData().stripeConfig;
}

export function getStripeConfigPublicView(): {
  configured: boolean;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  publishableKey?: string;
  updatedAt?: string;
} {
  const config = getStripeConfig();
  return {
    configured: Boolean(config.secretKey || process.env.STRIPE_SECRET_KEY),
    hasSecretKey: Boolean(config.secretKey || process.env.STRIPE_SECRET_KEY),
    hasWebhookSecret: Boolean(config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET),
    publishableKey: config.publishableKey ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    updatedAt: config.updatedAt,
  };
}

export function updateStripeConfig(
  patch: StripeConfigRecord,
  updatedBy: string
): StripeConfigRecord {
  const data = readData();
  data.stripeConfig = {
    ...data.stripeConfig,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  writeData(data);
  return data.stripeConfig;
}

export function persistSession(session: PersistedSession): void {
  const data = readData();
  for (const [id, existing] of Object.entries(data.activeSessions)) {
    if (existing.accountId === session.accountId && id !== session.sessionId) {
      delete data.activeSessions[id];
    }
  }
  data.activeSessions[session.sessionId] = session;
  writeData(data);
}

export function isPersistedSessionValid(sessionId: string, accountId?: string): boolean {
  const session = readData().activeSessions[sessionId];
  if (!session) return false;
  if (accountId && session.accountId !== accountId) return false;
  return true;
}

export function touchPersistedSession(sessionId: string): void {
  const data = readData();
  const session = data.activeSessions[sessionId];
  if (!session) return;
  session.lastActiveAt = new Date().toISOString();
  writeData(data);
}

export function revokePersistedSession(sessionId: string): boolean {
  const data = readData();
  if (!data.activeSessions[sessionId]) return false;
  delete data.activeSessions[sessionId];
  writeData(data);
  return true;
}

export function revokeAllPersistedSessions(accountId: string, exceptSessionId?: string): number {
  const data = readData();
  let count = 0;
  for (const [id, session] of Object.entries(data.activeSessions)) {
    if (session.accountId === accountId && id !== exceptSessionId) {
      delete data.activeSessions[id];
      count++;
    }
  }
  if (count > 0) writeData(data);
  return count;
}

export function listPersistedSessionsForAccount(accountId: string): PersistedSession[] {
  return Object.values(readData().activeSessions).filter((s) => s.accountId === accountId);
}
