import "server-only";

import { NextResponse } from "next/server";
import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { canAccessAdminPanel, isPlatformOwner } from "@/lib/security/roles";
import {
  accountHasFeature,
  getEffectiveSubscription,
} from "@/lib/subscription/resolve-subscription";
import { ensureSubscriptionCacheHydrated } from "@/lib/subscription/subscription-store";
import { getCompanyByAccountId, getCompanySubscriptionForAccount } from "@/lib/company/company-store";
import { evaluatePublishGuard } from "@/lib/company/permissions";
import { computeSubscriptionState } from "@/lib/company/mock-data";
import type { CompanySubscription } from "@/types/company";
import type { SubscriptionAudience } from "@/types/subscription";
import type { AuthUser, VoraRole } from "@/types/security";
import type { ProfileUploadKind } from "@/types/profile";

export const FREE_TIER_DAILY_MEDIA_UPLOADS = 5;

const UPLOAD_QUOTA_FILE = "upload-quota.json";

/** Upload kinds that count against the free-tier daily media quota */
export const GATED_UPLOAD_KINDS: ProfileUploadKind[] = [
  "post-media",
  "message-attachment",
  "video-intro",
  "service-thumbnail",
  "service-gallery",
];

/** AI actions that require platform owner (not a subscription feature) */
export const OWNER_ONLY_AI_ACTIONS = new Set(["owner-forecast"]);

/** AI actions that accept company ATS subscription as an alternative to user AI */
export const COMPANY_ATS_AI_ACTIONS = new Set(["candidate-rank", "ats-scan"]);

interface UploadQuotaFile {
  /** accountId → ISO date (YYYY-MM-DD) → count */
  daily: Record<string, Record<string, number>>;
}

export interface FeatureForbiddenBody {
  error: string;
  featureKey: string;
  upgradeRequired: boolean;
  message?: string;
  dailyLimit?: number;
  dailyUsed?: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readUploadQuota(): UploadQuotaFile {
  return readJsonStore(UPLOAD_QUOTA_FILE, () => ({ daily: {} }));
}

function writeUploadQuota(data: UploadQuotaFile) {
  writeJsonStore(UPLOAD_QUOTA_FILE, data);
}

export function canBypassFeatureChecks(
  user: Pick<AuthUser, "email" | "role"> | null | undefined
): boolean {
  if (!user) return false;
  return isPlatformOwner(user) || canAccessAdminPanel(user);
}

export function featureForbiddenResponse(
  featureKey: string,
  message?: string,
  extras?: Partial<Pick<FeatureForbiddenBody, "dailyLimit" | "dailyUsed">>
): NextResponse<FeatureForbiddenBody> {
  return NextResponse.json(
    {
      error: message ?? "Premium subscription required",
      featureKey,
      upgradeRequired: true,
      message,
      ...extras,
    },
    { status: 403 }
  );
}

export async function forbidWithoutFeature(
  user: Pick<AuthUser, "id" | "email" | "role"> | null | undefined,
  featureKey: string,
  audience: SubscriptionAudience = "user",
  message?: string
): Promise<NextResponse | null> {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (canBypassFeatureChecks(user)) return null;

  await ensureSubscriptionCacheHydrated();

  if (accountHasFeature(user.id, featureKey, audience)) return null;

  return featureForbiddenResponse(
    featureKey,
    message ?? `This action requires the "${featureKey}" feature.`
  );
}

export async function forbidWithoutAnyFeature(
  user: Pick<AuthUser, "id" | "email" | "role"> | null | undefined,
  featureKeys: { key: string; audience: SubscriptionAudience }[],
  message?: string
): Promise<NextResponse | null> {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (canBypassFeatureChecks(user)) return null;

  await ensureSubscriptionCacheHydrated();

  for (const { key, audience } of featureKeys) {
    if (accountHasFeature(user.id, key, audience)) return null;
  }

  return featureForbiddenResponse(
    featureKeys[0]?.key ?? "premium",
    message ?? "Premium subscription required for this action."
  );
}

function hasCompanyAtsAccess(accountId: string, role: VoraRole): boolean {
  if (role !== "company" && role !== "admin" && role !== "owner") return false;
  return accountHasFeature(accountId, "ats_full", "company");
}

export async function forbidAiAction(
  user: Pick<AuthUser, "id" | "email" | "role">,
  action: string
): Promise<NextResponse | null> {
  if (canBypassFeatureChecks(user)) return null;

  await ensureSubscriptionCacheHydrated();

  if (OWNER_ONLY_AI_ACTIONS.has(action)) {
    if (!isPlatformOwner(user)) {
      return NextResponse.json(
        {
          error: "Forbidden — owner-only AI action",
          featureKey: "owner_only",
          upgradeRequired: false,
        },
        { status: 403 }
      );
    }
    return null;
  }

  if (COMPANY_ATS_AI_ACTIONS.has(action)) {
    if (
      accountHasFeature(user.id, "ai_access", "user") ||
      hasCompanyAtsAccess(user.id, user.role)
    ) {
      return null;
    }
    return featureForbiddenResponse(
      "ai_access",
      "VORA AI access or a Company ATS subscription is required for this action."
    );
  }

  if (accountHasFeature(user.id, "ai_access", "user")) return null;

  return featureForbiddenResponse(
    "ai_access",
    "VORA AI is a Premium feature. Upgrade to access AI tools."
  );
}

export function getTodayUploadCount(accountId: string): number {
  const data = readUploadQuota();
  const day = todayKey();
  return data.daily[accountId]?.[day] ?? 0;
}

export function recordGatedUpload(accountId: string, kind: ProfileUploadKind): void {
  if (!GATED_UPLOAD_KINDS.includes(kind)) return;
  if (accountHasFeature(accountId, "unlimited_uploads", "user")) return;

  const data = readUploadQuota();
  const day = todayKey();
  if (!data.daily[accountId]) data.daily[accountId] = {};
  data.daily[accountId][day] = (data.daily[accountId][day] ?? 0) + 1;
  writeUploadQuota(data);
}

export async function forbidUploadWithoutAccess(
  user: Pick<AuthUser, "id" | "email" | "role">,
  kind: ProfileUploadKind
): Promise<NextResponse | null> {
  if (!GATED_UPLOAD_KINDS.includes(kind)) return null;
  if (canBypassFeatureChecks(user)) return null;

  await ensureSubscriptionCacheHydrated();

  if (accountHasFeature(user.id, "unlimited_uploads", "user")) return null;

  const used = getTodayUploadCount(user.id);
  if (used >= FREE_TIER_DAILY_MEDIA_UPLOADS) {
    return featureForbiddenResponse(
      "unlimited_uploads",
      `Daily media upload limit reached (${FREE_TIER_DAILY_MEDIA_UPLOADS}/day). Upgrade for unlimited uploads.`,
      { dailyLimit: FREE_TIER_DAILY_MEDIA_UPLOADS, dailyUsed: used }
    );
  }

  return null;
}

/** Expose effective subscription after cache hydration (for diagnostics / profile API) */
export async function getHydratedEffectiveSubscription(
  accountId: string,
  audience: SubscriptionAudience = "user"
) {
  await ensureSubscriptionCacheHydrated();
  return getEffectiveSubscription(accountId, audience);
}

function isCompanyAccountRole(role: VoraRole): boolean {
  return role === "company" || role === "admin" || role === "owner";
}

async function loadCompanySubscription(accountId: string): Promise<CompanySubscription | null> {
  await ensureSubscriptionCacheHydrated();
  return getCompanySubscriptionForAccount(accountId);
}

/** Trial-active companies retain ATS/analytics during trial window */
function companyTrialIsActive(sub: CompanySubscription | null): boolean {
  if (!sub) return false;
  if (sub.status === "active" && sub.subscriptionExpiresAt) {
    return new Date(sub.subscriptionExpiresAt).getTime() > Date.now();
  }
  return sub.status === "trial" && new Date(sub.trialEndsAt).getTime() > Date.now();
}

export async function getCompanyPublishState(accountId: string) {
  const subscription = await loadCompanySubscription(accountId);
  if (!subscription) {
    return {
      allowed: false,
      reason: "Company subscription not found",
      subscription: null,
      state: null,
    };
  }

  await ensureSubscriptionCacheHydrated();

  if (accountHasFeature(accountId, "unlimited_jobs", "company")) {
    return {
      allowed: true,
      subscription,
      state: computeSubscriptionState(subscription),
      source: "paid" as const,
    };
  }

  const guard = evaluatePublishGuard(subscription);
  return {
    ...guard,
    subscription,
    state: computeSubscriptionState(subscription),
    source: guard.allowed ? ("trial" as const) : ("locked" as const),
  };
}

export async function forbidCompanyJobPublish(
  user: Pick<AuthUser, "id" | "email" | "role">
): Promise<NextResponse | null> {
  if (canBypassFeatureChecks(user)) return null;

  const company = await getCompanyByAccountId(user.id);
  if (!company) {
    return NextResponse.json({ error: "Company profile required" }, { status: 404 });
  }

  const publish = await getCompanyPublishState(user.id);
  if (publish.allowed) return null;

  return featureForbiddenResponse(
    "unlimited_jobs",
    publish.reason ?? "Job publishing is locked. Subscribe to continue."
  );
}

export async function forbidCompanyAnalytics(
  user: Pick<AuthUser, "id" | "email" | "role">
): Promise<NextResponse | null> {
  if (canBypassFeatureChecks(user)) return null;

  if (!isCompanyAccountRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await getCompanyByAccountId(user.id);
  if (!company) {
    return NextResponse.json({ error: "Company profile required" }, { status: 404 });
  }

  await ensureSubscriptionCacheHydrated();

  if (accountHasFeature(user.id, "company_analytics", "company")) return null;

  const subscription = await loadCompanySubscription(user.id);
  if (companyTrialIsActive(subscription)) return null;

  return featureForbiddenResponse(
    "company_analytics",
    "Company analytics requires an active subscription."
  );
}

export async function forbidCompanyAts(
  user: Pick<AuthUser, "id" | "email" | "role">
): Promise<NextResponse | null> {
  if (canBypassFeatureChecks(user)) return null;

  if (!isCompanyAccountRole(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await getCompanyByAccountId(user.id);
  if (!company) {
    return NextResponse.json({ error: "Company profile required" }, { status: 404 });
  }

  await ensureSubscriptionCacheHydrated();

  if (accountHasFeature(user.id, "ats_full", "company")) return null;

  const subscription = await loadCompanySubscription(user.id);
  if (companyTrialIsActive(subscription)) return null;

  return featureForbiddenResponse(
    "ats_full",
    "ATS pipeline access requires an active company subscription."
  );
}
