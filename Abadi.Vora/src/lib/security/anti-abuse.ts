import type { AbuseSignalRecord } from "@/types/security";
import {
  linkDeviceFingerprint,
  trackListing,
  trackMessage,
} from "@/lib/security/demo-store";

const abuseSignals: AbuseSignalRecord[] = [];

export interface AntiAbuseCheckResult {
  flagged: boolean;
  signalType?: AbuseSignalRecord["signalType"];
  message: string;
  severity: "low" | "medium" | "high";
}

export function checkSpamMessages(accountId: string, content: string): AntiAbuseCheckResult {
  const duplicateCount = trackMessage(accountId, content);
  if (duplicateCount >= 3) {
    const signal: AbuseSignalRecord = {
      id: `abuse-${Date.now()}`,
      accountId,
      signalType: "spam_messages",
      severity: "high",
      details: `Duplicate message sent ${duplicateCount} times`,
      createdAt: new Date().toISOString(),
    };
    abuseSignals.unshift(signal);
    return {
      flagged: true,
      signalType: "spam_messages",
      message: "Spam detected: duplicate messages to multiple users",
      severity: "high",
    };
  }
  return { flagged: false, message: "", severity: "low" };
}

export function checkDuplicateListings(accountId: string, title: string): AntiAbuseCheckResult {
  const duplicateCount = trackListing(accountId, title);
  if (duplicateCount >= 2) {
    const signal: AbuseSignalRecord = {
      id: `abuse-${Date.now()}`,
      accountId,
      signalType: "duplicate_listings",
      severity: "medium",
      details: `Duplicate service listing: "${title}"`,
      createdAt: new Date().toISOString(),
    };
    abuseSignals.unshift(signal);
    return {
      flagged: true,
      signalType: "duplicate_listings",
      message: "Duplicate service listing detected",
      severity: "medium",
    };
  }
  return { flagged: false, message: "", severity: "low" };
}

export function checkMultiAccount(
  fingerprint: string,
  accountId: string
): AntiAbuseCheckResult {
  const linked = linkDeviceFingerprint(fingerprint, accountId);
  if (linked.length >= 3) {
    const signal: AbuseSignalRecord = {
      id: `abuse-${Date.now()}`,
      accountId,
      signalType: "multi_account",
      severity: "high",
      details: `${linked.length} accounts linked to same device fingerprint`,
      createdAt: new Date().toISOString(),
    };
    abuseSignals.unshift(signal);
    return {
      flagged: true,
      signalType: "multi_account",
      message: "Multiple accounts detected on same device",
      severity: "high",
    };
  }
  return { flagged: false, message: "", severity: "low" };
}

export function getAbuseSignals(): AbuseSignalRecord[] {
  return abuseSignals;
}

export function generateDeviceFingerprint(input: {
  userAgent: string;
  screenRes?: string;
  timezone?: string;
  language?: string;
}): string {
  const raw = [input.userAgent, input.screenRes, input.timezone, input.language].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `fp-${Math.abs(hash).toString(16)}`;
}
