import { redirect } from "next/navigation";
import {
  createProfileForAccount,
  getProfileSlugForAccount,
} from "@/lib/profile/profile-store";
import { getCompanyByAccountId, getCompanySlugForAccount } from "@/lib/company/company-store";
import { getCompanyUrl, getProfileUrl } from "@/lib/network/urls";
import { findAccountById } from "@/lib/security/demo-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  ensureSupabaseProfileAndStore,
  loadProfileForAccount,
} from "@/lib/supabase/profile-persistence";

export default async function ProfileMePage() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    redirect("/auth/login?redirect=/profile/me");
  }

  if (auth.user.role === "company") {
    const company = await getCompanyByAccountId(auth.user.id);
    const companySlug = getCompanySlugForAccount(auth.user.id) ?? company?.slug ?? null;
    if (companySlug) {
      redirect(getCompanyUrl(companySlug));
    }
    redirect("/company/dashboard");
  }

  await ensureSupabaseProfileAndStore(auth.user);
  const profile = await loadProfileForAccount(auth.user.id);

  let slug = profile?.slug ?? getProfileSlugForAccount(auth.user.id);
  if (!slug) {
    const account = findAccountById(auth.user.id);
    if (account) {
      const link = createProfileForAccount({
        accountId: account.id,
        fullName: account.fullName,
        email: account.email,
        role: account.role,
        gender: account.gender,
        hasFreelancerStore: account.hasFreelancerStore,
      });
      slug = link.profileSlug;
    }
  }

  if (!slug) {
    redirect("/network");
  }

  redirect(getProfileUrl(slug));
}
