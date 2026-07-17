import { StoreProfileView } from "@/components/freelance/store/StoreProfileView";
import {
  DEMO_PORTFOLIO,
  DEMO_SERVICES,
  DEMO_STORE,
  DEMO_STORE_REVIEWS,
} from "@/lib/freelance/mock-data";
import { buildStoreMetadata } from "@/lib/seo/metadata";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== DEMO_STORE.slug) return {};
  return buildStoreMetadata(DEMO_STORE);
}

export default async function FreelanceStorePage({ params }: StorePageProps) {
  const { slug } = await params;

  if (slug !== DEMO_STORE.slug) {
    notFound();
  }

  const storeServices = DEMO_SERVICES.filter((s) => s.storeSlug === slug);

  return (
    <StoreProfileView
      store={DEMO_STORE}
      services={storeServices}
      portfolio={DEMO_PORTFOLIO}
      reviews={DEMO_STORE_REVIEWS}
    />
  );
}
