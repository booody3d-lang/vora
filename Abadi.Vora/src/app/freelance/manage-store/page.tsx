import { redirect } from "next/navigation";
import {
  ensureFreelancerStoreForAccount,
  getStoreSlugForAccount,
} from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";

interface ManageStoreRedirectPageProps {
  searchParams: Promise<{ section?: string }>;
}

export default async function ManageStoreRedirectPage({ searchParams }: ManageStoreRedirectPageProps) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    redirect("/auth/login?redirect=/freelance/manage-store");
  }

  let storeSlug = getStoreSlugForAccount(auth.user.id);
  if (!storeSlug) {
    const link = ensureFreelancerStoreForAccount(auth.user.id);
    storeSlug = link?.storeSlug ?? null;
  }

  if (!storeSlug) {
    redirect("/network/settings/profile?section=preferences");
  }

  const { section } = await searchParams;
  const query = section ? `?section=${encodeURIComponent(section)}` : "";
  redirect(`/freelance/store/${storeSlug}/manage${query}`);
}
