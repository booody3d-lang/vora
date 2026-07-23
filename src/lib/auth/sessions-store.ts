import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import {
  guessLocationFromIp,
  hashSessionToken,
  parseDeviceLabel,
} from "@/lib/auth/session-token";
import {
  insertSessionInSupabase,
  listSessionsFromSupabase,
  revokeOtherSessionsInSupabase,
  revokeSessionInSupabase,
  touchSessionInSupabase,
} from "@/lib/auth/sessions-supabase";
import type { UserSession } from "@/types/security";

const SESSIONS_FILE = "user-sessions.json";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60_000;

interface JsonSessionRecord {
  id: string;
  accountId: string;
  sessionTokenHash: string;
  deviceLabel: string;
  userAgent: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  expiresAt: string;
  createdAt: string;
  lastActiveAt: string;
}

interface SessionsDataFile {
  records: JsonSessionRecord[];
}

let sessionsTableProbed = false;
let sessionsTableAvailable = false;

function readSessionsData(): SessionsDataFile {
  return readJsonStore(SESSIONS_FILE, () => ({ records: [] }));
}

function writeSessionsData(data: SessionsDataFile) {
  writeJsonStore(SESSIONS_FILE, data);
}

function mapJsonRecord(record: JsonSessionRecord, currentTokenHash?: string): UserSession {
  return {
    id: record.id,
    deviceLabel: record.deviceLabel,
    userAgent: record.userAgent,
    ipAddress: record.ipAddress,
    location: record.location,
    isCurrent: currentTokenHash
      ? record.sessionTokenHash === currentTokenHash
      : record.isCurrent,
    createdAt: record.createdAt,
    lastActiveAt: record.lastActiveAt,
  };
}

function pruneExpiredJsonRecords(data: SessionsDataFile): JsonSessionRecord[] {
  const now = Date.now();
  return data.records.filter((record) => new Date(record.expiresAt).getTime() > now);
}

export async function isSessionsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (sessionsTableProbed) return sessionsTableAvailable;

  sessionsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("user_sessions").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("user_sessions missing", error);
      }
      sessionsTableAvailable = false;
      return false;
    }
    sessionsTableAvailable = true;
    return true;
  } catch {
    sessionsTableAvailable = false;
    return false;
  }
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function getSupabaseSessionExpiry(): Promise<string> {
  if (!isSupabaseConfigured()) {
    return new Date(Date.now() + DEFAULT_TTL_MS).toISOString();
  }
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.expires_at) {
    return new Date(session.expires_at * 1000).toISOString();
  }
  return new Date(Date.now() + DEFAULT_TTL_MS).toISOString();
}

function saveJsonSession(input: {
  accountId: string;
  sessionTokenHash: string;
  deviceLabel: string;
  userAgent: string;
  ip: string;
  location: string;
  expiresAt: string;
}): UserSession {
  const data = readSessionsData();
  const now = new Date().toISOString();
  const existing = data.records.find(
    (record) => record.sessionTokenHash === input.sessionTokenHash
  );

  if (existing) {
    existing.lastActiveAt = now;
    existing.isCurrent = true;
    existing.expiresAt = input.expiresAt;
    for (const record of data.records) {
      if (record.accountId === input.accountId && record.id !== existing.id) {
        record.isCurrent = false;
      }
    }
    writeSessionsData({ records: pruneExpiredJsonRecords(data) });
    return mapJsonRecord(existing, input.sessionTokenHash);
  }

  const record: JsonSessionRecord = {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    sessionTokenHash: input.sessionTokenHash,
    deviceLabel: input.deviceLabel,
    userAgent: input.userAgent,
    ipAddress: input.ip,
    location: input.location,
    isCurrent: true,
    expiresAt: input.expiresAt,
    createdAt: now,
    lastActiveAt: now,
  };

  for (const entry of data.records) {
    if (entry.accountId === input.accountId) entry.isCurrent = false;
  }
  data.records.unshift(record);
  writeSessionsData({ records: pruneExpiredJsonRecords(data) });
  return mapJsonRecord(record, input.sessionTokenHash);
}

function listJsonSessions(accountId: string, currentTokenHash?: string): UserSession[] {
  const data = readSessionsData();
  const active = pruneExpiredJsonRecords(data);
  if (active.length !== data.records.length) {
    writeSessionsData({ records: active });
  }
  return active
    .filter((record) => record.accountId === accountId)
    .map((record) => mapJsonRecord(record, currentTokenHash));
}

function revokeJsonSession(accountId: string, sessionId: string): boolean {
  const data = readSessionsData();
  const before = data.records.length;
  data.records = data.records.filter(
    (record) => !(record.id === sessionId && record.accountId === accountId)
  );
  if (data.records.length === before) return false;
  writeSessionsData(data);
  return true;
}

function revokeOtherJsonSessions(accountId: string, currentTokenHash: string): number {
  const data = readSessionsData();
  const before = data.records.length;
  data.records = data.records.filter(
    (record) =>
      record.accountId !== accountId || record.sessionTokenHash === currentTokenHash
  );
  const revoked = before - data.records.length;
  if (revoked > 0) writeSessionsData(data);
  return revoked;
}

export async function recordUserSession(input: {
  accountId: string;
  sessionToken: string;
  userAgent: string;
  ip: string;
  expiresAt?: string;
}): Promise<UserSession> {
  const sessionTokenHash = hashSessionToken(input.sessionToken);
  const deviceLabel = parseDeviceLabel(input.userAgent);
  const location = guessLocationFromIp(input.ip);
  const expiresAt = input.expiresAt ?? new Date(Date.now() + DEFAULT_TTL_MS).toISOString();

  const jsonSession = saveJsonSession({
    accountId: input.accountId,
    sessionTokenHash,
    deviceLabel,
    userAgent: input.userAgent,
    ip: input.ip,
    location,
    expiresAt,
  });

  if (!(await isSessionsSupabaseReady())) {
    return jsonSession;
  }

  return runOptionalDbSync(
    "recordUserSession",
    () =>
      insertSessionInSupabase({
        accountId: input.accountId,
        sessionTokenHash,
        deviceLabel,
        userAgent: input.userAgent,
        ip: input.ip,
        location,
        expiresAt,
      }),
    jsonSession
  );
}

export async function listUserSessions(
  accountId: string,
  currentTokenHash?: string
): Promise<UserSession[]> {
  const jsonSessions = listJsonSessions(accountId, currentTokenHash);

  if (!(await isSessionsSupabaseReady())) {
    return jsonSessions;
  }

  return runOptionalDbSync(
    "listUserSessions",
    () => listSessionsFromSupabase(accountId, currentTokenHash),
    jsonSessions
  );
}

export async function revokeUserSession(
  accountId: string,
  sessionId: string
): Promise<boolean> {
  const jsonRevoked = revokeJsonSession(accountId, sessionId);

  if (!(await isSessionsSupabaseReady())) {
    return jsonRevoked;
  }

  const dbRevoked = await runOptionalDbSync(
    "revokeUserSession",
    () => revokeSessionInSupabase(accountId, sessionId),
    jsonRevoked
  );
  return dbRevoked || jsonRevoked;
}

export async function revokeOtherUserSessions(
  accountId: string,
  currentTokenHash: string
): Promise<number> {
  const jsonCount = revokeOtherJsonSessions(accountId, currentTokenHash);

  if (!(await isSessionsSupabaseReady())) {
    return jsonCount;
  }

  return runOptionalDbSync(
    "revokeOtherUserSessions",
    () => revokeOtherSessionsInSupabase(accountId, currentTokenHash),
    jsonCount
  );
}

export async function touchCurrentUserSession(
  accountId: string,
  sessionToken: string
): Promise<void> {
  const sessionTokenHash = hashSessionToken(sessionToken);
  const data = readSessionsData();
  const record = data.records.find(
    (entry) => entry.accountId === accountId && entry.sessionTokenHash === sessionTokenHash
  );
  if (record) {
    record.lastActiveAt = new Date().toISOString();
    writeSessionsData(data);
  }

  if (!(await isSessionsSupabaseReady())) return;

  await runOptionalDbSyncVoid("touchCurrentUserSession", () =>
    touchSessionInSupabase(accountId, sessionTokenHash)
  );
}

export { hashSessionToken };
