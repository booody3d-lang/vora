import { Suspense } from "react";
import { ManageStoreContent } from "@/components/profile/ManageStoreContent";
import { isStoreOwnerLive } from "@/lib/freelance/store-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  loadStoreBySlug,
  loadStoreForAccount,
  ensureSupabaseProfileAndStore,
} from "@/lib/supabase/profile-persistence";
import { notFound, redirect } from "next/navigation";

interface ManageStorePageProps {
  params: Promise<{ slug: string }>;
}

function ManageStoreFallback() {
  return <div className="py-10 text-center text-sm text-slate-500">Loading...</div>;
}

export default async function ManageStorePage({ params }: ManageStorePageProps) {
  const { slug } = await params;
  let store = await loadStoreBySlug(slug);

  const auth = await getAuthenticatedUser();
  if (!store && auth) {
    await ensureSupabaseProfileAndStore(auth.user);
    const ownStore = await loadStoreForAccount(auth.user.id);
    if (ownStore?.slug === slug) {
      store = ownStore;
    } else if (ownStore) {
      redirect(`/freelance/store/${ownStore.slug}/manage`);
    } else {
      redirect("/freelance/manage-store");
    }
  }

  if (!store) notFound();
  if (!auth || !(await isStoreOwnerLive(auth.user.id, slug))) {
    redirect(`/freelance/store/${slug}`);
  }

  return (
    <Suspense fallback={<ManageStoreFallback />}>
      <ManageStoreContent storeSlug={slug} />
    </Suspense>
  );
}
