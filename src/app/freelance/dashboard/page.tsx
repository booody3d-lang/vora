import { redirect } from "next/navigation";
import {
  ensureFreelancerStoreForAccount,
  getStoreSlugForAccount,
} from "@/lib/profile/profile-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export default async function FreelanceDashboardPage() {
  const auth = await getAuthenticatedUser();
  if (auth) {
    let storeSlug = getStoreSlugForAccount(auth.user.id);
    if (!storeSlug) {
      const link = ensureFreelancerStoreForAccount(auth.user.id);
      storeSlug = link?.storeSlug ?? null;
    }
    if (storeSlug) {
      redirect(`/freelance/store/${storeSlug}/manage`);
    }
  }

  redirect("/freelance/manage-store");
}
