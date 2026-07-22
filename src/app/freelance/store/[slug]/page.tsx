import { StoreProfileView } from "@/components/freelance/store/StoreProfileView";
import { recordStoreView } from "@/lib/freelance/analytics-store";
import { listPublicReviewsForStoreSlug } from "@/lib/freelance/reviews-store";
import { listPortfolioForStoreSlug } from "@/lib/freelance/store-store";
import { listPublicServicesForStoreSlug } from "@/lib/freelance/services-store";
import { isStoreOwner } from "@/lib/profile/profile-store";
import { buildStoreMetadata } from "@/lib/seo/metadata";
import { getAuthenticatedUser } from "@/lib/security/session";
import {
  loadStoreBySlug,
  resolveAccountIdForStoreSlug,
} from "@/lib/supabase/profile-persistence";
import { notFound } from "next/navigation";
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
  const store = await loadStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  const [storeServices, portfolio, reviews] = await Promise.all([
    listPublicServicesForStoreSlug(slug),
    listPortfolioForStoreSlug(slug),
    listPublicReviewsForStoreSlug(slug),
  ]);
  void recordStoreView(slug);
  const auth = await getAuthenticatedUser();
  const isOwnStore = auth ? isStoreOwner(auth.user.id, slug) : false;
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
