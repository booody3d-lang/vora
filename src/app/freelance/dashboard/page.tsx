import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  ensureSupabaseProfileAndStore,
  loadStoreForAccount,
} from "@/lib/supabase/profile-persistence";

export default async function FreelanceDashboardPage() {
  const auth = await getAuthenticatedUser();
  if (auth) {
    await ensureSupabaseProfileAndStore(auth.user);
    const store = await loadStoreForAccount(auth.user.id);
    const storeSlug = store?.slug ?? auth.user.storeSlug ?? null;
    if (storeSlug) {
      redirect(`/freelance/store/${storeSlug}/manage`);
    }
  }

  redirect("/freelance/manage-store");
}
