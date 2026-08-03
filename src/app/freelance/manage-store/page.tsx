import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  ensureSupabaseProfileAndStore,
  loadStoreForAccount,
} from "@/lib/supabase/profile-persistence";

interface ManageStoreRedirectPageProps {
  searchParams: Promise<{ section?: string }>;
}

export default async function ManageStoreRedirectPage({ searchParams }: ManageStoreRedirectPageProps) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    redirect("/auth/login?redirect=/freelance/manage-store");
  }

  await ensureSupabaseProfileAndStore(auth.user);
  const store = await loadStoreForAccount(auth.user.id);
  const storeSlug = store?.slug ?? auth.user.storeSlug ?? null;

  if (!storeSlug) {
    redirect("/network/settings/profile?section=preferences");
  }

  const { section } = await searchParams;
  const query = section ? `?section=${encodeURIComponent(section)}` : "";
  redirect(`/freelance/store/${storeSlug}/manage${query}`);
}
