import { StoreProfileView } from "@/components/freelance/store/StoreProfileView";
import { recordStoreView } from "@/lib/freelance/analytics-store";
import { listPublicReviewsForStoreSlug } from "@/lib/freelance/reviews-store";
import { listPortfolioForStoreSlug, isStoreOwnerLive } from "@/lib/freelance/store-store";
import { listPublicServicesForStoreSlug } from "@/lib/freelance/services-store";
import { buildStoreMetadata } from "@/lib/seo/metadata";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  loadStoreBySlug,
  loadStoreForAccount,
  resolveAccountIdForStoreSlug,
  ensureSupabaseProfileAndStore,
} from "@/lib/supabase/profile-persistence";
import { getFreelanceStoreUrl } from "@/lib/network/urls";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await loadStoreBySlug(slug);
  if (!store) return {};
  return buildStoreMetadata(store);
}

export default async function FreelanceStorePage({ params }: StorePageProps) {
  const { slug } = await params;
  let store = await loadStoreBySlug(slug);

  const auth = await getAuthenticatedUser();
  if (!store && auth) {
    await ensureSupabaseProfileAndStore(auth.user);
    const ownStore = await loadStoreForAccount(auth.user.id);
    if (ownStore?.slug === slug) {
      store = ownStore;
    } else if (await isStoreOwnerLive(auth.user.id, slug)) {
      store = (await loadStoreBySlug(slug)) ?? ownStore;
    } else if (ownStore) {
      redirect(getFreelanceStoreUrl(ownStore.slug));
    }
  }

  if (!store) {
    notFound();
  }

  const [storeServices, portfolio, reviews] = await Promise.all([
    listPublicServicesForStoreSlug(slug),
    listPortfolioForStoreSlug(slug),
    listPublicReviewsForStoreSlug(slug),
  ]);
  void recordStoreView(slug);
  const isOwnStore = auth ? await isStoreOwnerLive(auth.user.id, slug) : false;
  const storeOwnerAccountId = await resolveAccountIdForStoreSlug(slug);

  return (
    <StoreProfileView
      store={store}
      services={storeServices}
      portfolio={portfolio}
      reviews={reviews}
      isOwnStore={isOwnStore}
      storeOwnerAccountId={storeOwnerAccountId ?? undefined}
    />
  );
}
