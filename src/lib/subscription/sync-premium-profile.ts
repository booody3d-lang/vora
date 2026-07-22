import "server-only";

import { getProfileByAccountId, updateProfileForAccount } from "@/lib/profile/profile-store";
import { getEffectiveSubscription } from "@/lib/subscription/resolve-subscription";
import {
  ensureSubscriptionCacheHydrated,
  isSubscriptionSupabaseReady,
} from "@/lib/subscription/subscription-store";
import { syncProfilePremiumInSupabase } from "@/lib/subscription/subscription-supabase";
import { runOptionalDbSyncVoid } from "@/lib/supabase/safe-db";

/** Keep JSON profile + Supabase professional_profiles.is_premium aligned with effective subscription */
export async function syncAccountPremiumProfile(accountId: string): Promise<boolean> {
  await ensureSubscriptionCacheHydrated();
  const isPremium = getEffectiveSubscription(accountId, "user").isPremium;

  const profile = getProfileByAccountId(accountId);
  if (profile && profile.isPremium !== isPremium) {
    updateProfileForAccount(accountId, { isPremium });
  }

  if (await isSubscriptionSupabaseReady()) {
    await runOptionalDbSyncVoid("syncAccountPremiumProfile", () =>
      syncProfilePremiumInSupabase(accountId, isPremium)
    );
  }

  return isPremium;
}
