import { redirect } from "next/navigation";
import { getFreelanceStoreUrl } from "@/lib/network/urls";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  ensureSupabaseProfileAndStore,
  loadStoreForAccount,
} from "@/lib/supabase/profile-persistence";

export default async function MyStoreRedirectPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    redirect("/auth/login?redirect=/freelance/my-store");
  }

  await ensureSupabaseProfileAndStore(auth.user);
  const store = await loadStoreForAccount(auth.user.id);
  const storeSlug = store?.slug ?? auth.user.storeSlug ?? null;

  if (!storeSlug) {
    redirect("/freelance/manage-store");
  }

  redirect(getFreelanceStoreUrl(storeSlug));
}
